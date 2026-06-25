// Kite Connect API Wrapper for Kaalchakra (Phase 1 MVP)

export interface OHLCV {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

// Symbol-to-token cache (in-memory)
let instrumentTokenCache: Record<string, number> = {};

/**
 * Fetches all instruments from Kite and maps NSE stock symbols to instrument tokens.
 */
async function fetchInstrumentTokens(): Promise<Record<string, number>> {
  if (Object.keys(instrumentTokenCache).length > 0) {
    return instrumentTokenCache;
  }

  try {
    console.log('Fetching instrument list from Kite...');
    const response = await fetch('https://api.kite.trade/instruments', {
      headers: { 'X-Kite-Version': '3' },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch instruments: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split('\n');

    // CSV format: instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange
    // First line is header
    const cache: Record<string, number> = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',');
      if (cols.length < 12) continue;

      const token = parseInt(cols[0], 10);
      const symbol = cols[2].replace(/"/g, ''); // tradingsymbol
      const exchange = cols[11].replace(/"/g, ''); // exchange

      // We only care about NSE equities (or indices like Nifty 50)
      if (exchange === 'NSE') {
        cache[symbol] = token;
      }
    }

    instrumentTokenCache = cache;
    console.log(`Successfully mapped ${Object.keys(cache).length} NSE instruments.`);
    return cache;
  } catch (error) {
    console.error('Error loading Kite instruments, falling back to basic mapping:', error);
    // Hardcoded mapping for major tokens as backup
    return {
      NIFTY50: 256265,
      BANKNIFTY: 260105,
      RELIANCE: 738561,
      TCS: 2953217,
      INFOSYS: 408065,
      HDFCBANK: 341249,
      ICICIBANK: 1270529,
      SBIN: 779521,
    };
  }
}

async function fetchYahooFinanceEOD(symbol: string, days: number = 250): Promise<OHLCV[] | null> {
  try {
    let yahooSymbol = symbol;
    if (symbol === 'NIFTY50') {
      yahooSymbol = '^NSEI';
    } else if (symbol === 'BANKNIFTY') {
      yahooSymbol = '^NSEBANK';
    } else if (!symbol.endsWith('.NS') && !symbol.endsWith('.BO')) {
      yahooSymbol = `${symbol}.NS`;
    }

    // Map requested history duration to Yahoo Finance valid ranges
    let range = '1y';
    if (days <= 5) range = '5d';
    else if (days <= 22) range = '1mo';
    else if (days <= 66) range = '3mo';
    else if (days <= 132) range = '6mo';
    else if (days <= 260) range = '1y';
    else if (days <= 520) range = '2y';
    else range = '5y';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=${range}&interval=1d`;
    console.log(`Fetching from Yahoo Finance: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yahoo Finance HTTP error: ${response.status}`);
    }

    const json = await response.json();
    const result = json.chart?.result?.[0];
    if (!result) {
      throw new Error('No chart result found in Yahoo Finance response');
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || timestamps.length === 0) {
      throw new Error('Missing indicators or timestamps in Yahoo Finance response');
    }

    const candles: OHLCV[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      const volume = quote.volume?.[i] || 0;

      // Ensure we don't push null values (Yahoo can sometimes have null values on holidays)
      if (open !== null && high !== null && low !== null && close !== null && 
          open !== undefined && high !== undefined && low !== undefined && close !== undefined) {
        candles.push({
          date,
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume),
        });
      }
    }

    return candles;
  } catch (error) {
    console.error(`Failed to fetch from Yahoo Finance for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches historical daily EOD data for a given symbol.
 * Falls back to Yahoo Finance or mock data if Kite credentials are not available or if the API request fails.
 */
export async function getHistoricalEOD(
  symbol: string,
  days: number = 250 // Sufficient for calculating SMA 200
): Promise<OHLCV[]> {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - days);

  const formattedTo = toDate.toISOString().split('T')[0];
  const formattedFrom = fromDate.toISOString().split('T')[0];

  const hasCredentials = !!(KITE_API_KEY && KITE_ACCESS_TOKEN);

  if (hasCredentials) {
    try {
      const tokenMap = await fetchInstrumentTokens();
      const token = tokenMap[symbol];

      if (!token) {
        throw new Error(`Instrument token not found for symbol: ${symbol}`);
      }

      const url = `https://api.kite.trade/instruments/historical/${token}/day?from=${formattedFrom}&to=${formattedTo}`;
      const response = await fetch(url, {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Kite API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Kite returns: { status: "success", data: { candles: [[date, open, high, low, close, volume, oi], ...] } }
      if (data.status === 'success' && data.data && Array.isArray(data.data.candles)) {
        return data.data.candles.map((candle: any[]) => ({
          date: candle[0].split('T')[0],
          open: Number(candle[1]),
          high: Number(candle[2]),
          low: Number(candle[3]),
          close: Number(candle[4]),
          volume: Number(candle[5]),
        }));
      }
    } catch (error) {
      console.error(`Error fetching real EOD data for ${symbol}, falling back to Yahoo Finance:`, error);
    }
  }

  // Fallback to Yahoo Finance (free public API) if Kite is unavailable or fails
  console.log(`Kite credentials missing or failed. Fetching ${symbol} EOD data from Yahoo Finance...`);
  const yahooData = await fetchYahooFinanceEOD(symbol, days);
  if (yahooData && yahooData.length > 0) {
    return yahooData;
  }

  // Generate realistic mock data as a last-resort fallback
  console.warn(`Yahoo Finance failed. Using local mock generator for ${symbol} EOD data.`);
  return generateMockOHLCV(symbol, days);
}

/**
 * Helper to generate deterministic but realistic mock market data based on a hash of the stock symbol.
 */
function generateMockOHLCV(symbol: string, days: number): OHLCV[] {
  const data: OHLCV[] = [];
  const today = new Date();

  // Create a seed based on symbol letters for deterministic mock prices
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed += symbol.charCodeAt(i);
  }

  // Determine standard baseline close price based on symbol seed
  let basePrice = 100 + (seed % 15) * 150; // Ranges from 100 to 2350
  if (symbol === 'NIFTY50') basePrice = 23500;
  if (symbol === 'BANKNIFTY') basePrice = 51500;
  if (symbol === 'RELIANCE') basePrice = 2450;
  if (symbol === 'TCS') basePrice = 3800;
  if (symbol === 'INFOSYS') basePrice = 1520;
  if (symbol === 'HDFCBANK') basePrice = 1650;
  if (symbol === 'ICICIBANK') basePrice = 1120;
  if (symbol === 'SBIN') basePrice = 840;

  let currentPrice = basePrice;
  const priceFluctuation = 0.015; // Max 1.5% daily fluctuation

  // Build daily data from 'days' ago to today
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Pseudo-random daily change
    const pseudoRandom = Math.sin(seed + i) * Math.cos(seed * 0.5 + i * 0.7);
    const dailyReturn = pseudoRandom * priceFluctuation;

    // Trend component: slow long term wave
    const wave = Math.sin(i / 30) * 0.005;

    const prevClose = currentPrice;
    currentPrice = prevClose * (1 + dailyReturn + wave);

    // Ensure price is positive
    if (currentPrice < 1) currentPrice = 1;

    const close = Math.round(currentPrice * 100) / 100;
    const open = Math.round(prevClose * (1 + (pseudoRandom * 0.005)) * 100) / 100;
    
    // High/low with some noise
    const highNoise = Math.abs(Math.sin(seed + i * 2.1)) * 0.012;
    const lowNoise = Math.abs(Math.cos(seed - i * 1.5)) * 0.012;
    const high = Math.round(Math.max(open, close) * (1 + highNoise) * 100) / 100;
    const low = Math.round(Math.min(open, close) * (1 - lowNoise) * 100) / 100;

    // Volume spike on deterministic days
    const volumeBase = 100000 + (seed % 10) * 150000;
    const isVolumeSpike = (seed + i) % 7 === 0;
    const volume = Math.round(volumeBase * (isVolumeSpike ? 2.5 + Math.abs(pseudoRandom) : 0.8 + Math.abs(pseudoRandom * 0.4)));

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return data;
}
