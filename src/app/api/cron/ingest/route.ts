import { NextResponse } from 'next/server';
import { getStocks, seedStocks, upsertDailyPrices, getDailyPrices, DailyPrice } from '@/lib/db';
import { getHistoricalEOD, OHLCV } from '@/lib/kite';
import { calculateSMA, calculateRSI } from '@/lib/indicators';
import stocksSeed from '../../../../../data/stocks_seed.json';

// Simple cron handler to seed/ingest stock prices
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const targetSymbol = searchParams.get('symbol'); // Optional: ingest a single symbol for testing
  const forceSeed = searchParams.get('seed') === 'true'; // Optional: force re-seeding stock list

  // Secure the endpoint in production if CRON_SECRET is defined
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('--- STARTING DATA INGESTION PIPELINE ---');
    
    // 1. Get or seed stocks
    let stocks = await getStocks();
    if (stocks.length === 0 || forceSeed) {
      console.log(`Seeding stock universe with ${stocksSeed.length} assets...`);
      stocks = await seedStocks(stocksSeed);
      console.log('Seeding stock universe complete.');
    }

    // Determine which stocks to ingest
    const stocksToIngest = targetSymbol 
      ? stocks.filter(s => s.symbol.toUpperCase() === targetSymbol.toUpperCase())
      : stocks;

    if (stocksToIngest.length === 0) {
      return NextResponse.json({ 
        message: 'No stocks found to ingest. Try running with ?seed=true' 
      }, { status: 400 });
    }

    console.log(`Ingesting data for ${stocksToIngest.length} stock(s)...`);
    let totalIngested = 0;
    const summary: Record<string, number> = {};

    for (const stock of stocksToIngest) {
      try {
        // Check how many days of data we already have to optimize API requests
        const existingData = await getDailyPrices(stock.symbol);
        const daysToFetch = existingData.length === 0 ? 260 : 15; // Fetch full history (for SMA 200) or short delta

        console.log(`Fetching EOD data for ${stock.symbol} (${daysToFetch} days)...`);
        const eodData: OHLCV[] = await getHistoricalEOD(stock.symbol, daysToFetch);

        if (eodData.length === 0) {
          console.warn(`No price data returned for ${stock.symbol}`);
          continue;
        }

        // Merge fetched data with existing database data to compute indicators accurately
        // We need a sorted sequence (ascending by date)
        const combinedMap = new Map<string, OHLCV>();
        
        // Load existing database data
        existingData.forEach(p => {
          combinedMap.set(p.date, {
            date: p.date,
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
            volume: p.volume
          });
        });

        // Overwrite/insert newly fetched data
        eodData.forEach(p => {
          combinedMap.set(p.date, p);
        });

        const sortedCandles = Array.from(combinedMap.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Extract close prices for indicator math
        const closes = sortedCandles.map(c => c.close);

        // Calculate technical indicators
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const sma200 = calculateSMA(closes, 200);
        const rsi14 = calculateRSI(closes, 14);

        // Map candles back to DailyPrice objects with technical indicators
        const dailyPricesToUpsert: DailyPrice[] = sortedCandles.map((candle, idx) => ({
          symbol: stock.symbol,
          date: candle.date,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          rsi: rsi14[idx],
          sma_20: sma20[idx],
          sma_50: sma50[idx],
          sma_200: sma200[idx]
        }));

        // We only upsert what we recently fetched to keep operations light, 
        // but we needed the history to compute the indicators.
        // Slice the last 'eodData.length' elements.
        const recentRecords = dailyPricesToUpsert.slice(-eodData.length);

        console.log(`Upserting ${recentRecords.length} records for ${stock.symbol}...`);
        await upsertDailyPrices(recentRecords);
        
        totalIngested += recentRecords.length;
        summary[stock.symbol] = recentRecords.length;

      } catch (err) {
        console.error(`Failed to ingest stock ${stock.symbol}:`, err);
      }
    }

    console.log(`--- INGESTION COMPLETE. Ingested ${totalIngested} total rows. ---`);

    return NextResponse.json({
      success: true,
      message: `Ingestion successful. Processed ${stocksToIngest.length} stock(s).`,
      recordsIngested: totalIngested,
      summary
    });

  } catch (error: any) {
    console.error('Error running ingestion pipeline:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
