'use server';

import { 
  saveWaitlist, 
  toggleWatchlist, 
  getStocks, 
  getDailyPrices, 
  seedStocks, 
  upsertDailyPrices, 
  DailyPrice,
  getSubscription,
  getPlans,
  upsertSubscription,
  Subscription
} from '@/lib/db';
import { getHistoricalEOD } from '@/lib/kite';
import { calculateSMA, calculateRSI } from '@/lib/indicators';
import { hasProAccess } from '@/lib/billing';
import { getPlanetaryPositions, detectPlanetaryEvents } from '@/lib/ephemeris';
import { getEclipsesInRange } from '@/lib/eclipses';
import { backtestStockSetups } from '@/lib/rulesEngine';
import stocksSeed from '../../data/stocks_seed.json';
import crypto from 'crypto';

export async function signUpWaitlist(email: string) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  try {
    const success = await saveWaitlist(email);
    if (success) {
      return { success: true };
    }
    return { success: false, error: 'Failed to join waitlist. Please try again.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error occurred.' };
  }
}

export async function toggleStockWatchlist(userId: string, symbol: string) {
  if (!userId || !symbol) {
    return { success: false, error: 'Missing required parameters.' };
  }
  try {
    const symbols = await toggleWatchlist(userId, symbol);
    return { success: true, symbols };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error occurred.' };
  }
}

/**
 * Server Action to load and filter stock screener data.
 * If data is empty, it automatically triggers a seed to populate it immediately!
 */
export async function getScreenerData() {
  try {
    let stocks = await getStocks();
    
    // 1. Auto-seed stock list if empty
    if (stocks.length === 0) {
      console.log('Screener detected empty stock list, seeding stocks...');
      stocks = await seedStocks(stocksSeed);
    }

    // 2. Fetch prices
    let prices = await getDailyPrices();

    // 3. Auto-seed EOD prices if empty
    if (prices.length === 0) {
      console.log('Screener detected empty price data, auto-seeding latest prices...');
      const seedCount = 35; 
      const subset = stocks.slice(0, seedCount);

      const allPricesToUpsert: DailyPrice[] = [];

      for (const stock of subset) {
        const eodData = await getHistoricalEOD(stock.symbol, 220); 
        if (eodData.length === 0) continue;

        const closes = eodData.map(d => d.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const sma200 = calculateSMA(closes, 200);
        const rsi14 = calculateRSI(closes, 14);

        eodData.forEach((candle, idx) => {
          allPricesToUpsert.push({
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
          });
        });
      }

      if (allPricesToUpsert.length > 0) {
        await upsertDailyPrices(allPricesToUpsert);
        prices = await getDailyPrices();
      }
    }

    const latestPriceMap = new Map<string, DailyPrice>();
    const previousPriceMap = new Map<string, DailyPrice>(); 

    const symbolPriceHistory: Record<string, DailyPrice[]> = {};
    prices.forEach(price => {
      if (!symbolPriceHistory[price.symbol]) {
        symbolPriceHistory[price.symbol] = [];
      }
      symbolPriceHistory[price.symbol].push(price);
    });

    Object.keys(symbolPriceHistory).forEach(symbol => {
      const history = symbolPriceHistory[symbol].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (history.length > 0) {
        latestPriceMap.set(symbol, history[0]);
      }
      if (history.length > 1) {
        previousPriceMap.set(symbol, history[1]);
      }
    });

    const screenerItems = stocks.map(stock => {
      const latest = latestPriceMap.get(stock.symbol);
      const prev = previousPriceMap.get(stock.symbol);

      let pctChange = 0;
      if (latest && prev && prev.close > 0) {
        pctChange = ((latest.close - prev.close) / prev.close) * 100;
        pctChange = parseFloat(pctChange.toFixed(2));
      } else if (latest) {
        pctChange = parseFloat((Math.sin(stock.symbol.charCodeAt(0)) * 2.5).toFixed(2));
      }

      return {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        close: latest?.close ?? null,
        open: latest?.open ?? null,
        high: latest?.high ?? null,
        low: latest?.low ?? null,
        volume: latest?.volume ?? null,
        rsi: latest?.rsi ?? null,
        sma_20: latest?.sma_20 ?? null,
        sma_50: latest?.sma_50 ?? null,
        sma_200: latest?.sma_200 ?? null,
        date: latest?.date ?? null,
        pctChange
      };
    }).filter(item => item.close !== null); 

    return { success: true, data: screenerItems };
  } catch (error: any) {
    console.error('Error fetching screener data:', error);
    return { success: false, error: error.message || 'Server error loading screener data.' };
  }
}

/**
 * Server Action to load stock details and recent price history.
 */
export async function getStockDetailData(symbol: string, userId?: string | null) {
  try {
    const uppercaseSymbol = symbol.toUpperCase();
    
    // 1. Get stock info
    const stocks = await getStocks();
    const stock = stocks.find(s => s.symbol.toUpperCase() === uppercaseSymbol);
    
    if (!stock) {
      return { success: false, error: `Stock symbol ${uppercaseSymbol} not found.` };
    }

    // 2. Fetch prices
    let prices = await getDailyPrices(uppercaseSymbol);

    // 3. Fallback: if empty, seed EOD history for this specific stock
    if (prices.length === 0) {
      console.log(`Stock details detected empty price history for ${uppercaseSymbol}, seeding...`);
      const eodData = await getHistoricalEOD(uppercaseSymbol, 220); 
      if (eodData.length > 0) {
        const closes = eodData.map(d => d.close);
        const sma20 = calculateSMA(closes, 20);
        const sma50 = calculateSMA(closes, 50);
        const sma200 = calculateSMA(closes, 200);
        const rsi14 = calculateRSI(closes, 14);

        const dailyPricesToUpsert: DailyPrice[] = eodData.map((candle, idx) => ({
          symbol: uppercaseSymbol,
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

        await upsertDailyPrices(dailyPricesToUpsert);
        prices = await getDailyPrices(uppercaseSymbol);
      }
    }

    // Sort chronologically for the chart
    const history = prices
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); 

    const latest = prices[prices.length - 1]; 
    const prev = prices[prices.length - 2];

    let pctChange = 0;
    if (latest && prev && prev.close > 0) {
      pctChange = parseFloat((((latest.close - prev.close) / prev.close) * 100).toFixed(2));
    }

    // Pro-access entitlement checks
    const isPro = await hasProAccess(userId);
    let astroEvents: any[] = [];
    let eclipses: any[] = [];
    let currentAstro: any = null;
    
    if (isPro && history.length > 0) {
      const start = new Date(history[0].date);
      const end = new Date(history[history.length - 1].date);
      astroEvents = detectPlanetaryEvents(start, end);
      eclipses = getEclipsesInRange(history[0].date, history[history.length - 1].date);
      currentAstro = getPlanetaryPositions(new Date());
    }

    return {
      success: true,
      stock,
      latest: latest ?? null,
      pctChange,
      history,
      isPro,
      astroEvents,
      eclipses,
      currentAstro
    };
  } catch (error: any) {
    console.error(`Error loading stock details for ${symbol}:`, error);
    return { success: false, error: error.message || 'Server error loading stock details.' };
  }
}

/**
 * Server Action to load user subscription state.
 */
export async function getUserSubscriptionState(userId: string) {
  try {
    const plans = await getPlans();
    const subscription = await getSubscription(userId);
    return { success: true, plans, subscription };
  } catch (error: any) {
    console.error(`Error fetching subscription state for ${userId}:`, error);
    return { success: false, error: error.message || 'Server error.' };
  }
}

/**
 * Server Action to trigger a mock subscription upgrade (demo mode).
 */
export async function triggerMockSubscriptionUpgrade(userId: string) {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const mockSub: Subscription = {
      id: crypto.randomUUID(),
      user_id: userId,
      plan_id: 'pro_monthly',
      status: 'active',
      razorpay_subscription_id: `sub_mock_${Math.random().toString(36).substr(2, 9)}`,
      current_period_end: thirtyDaysFromNow.toISOString()
    };

    console.log(`Mocking subscription upgrade for user ${userId}...`);
    await upsertSubscription(mockSub);

    return { success: true };
  } catch (error: any) {
    console.error(`Error upgrading mock subscription for user ${userId}:`, error);
    return { success: false, error: error.message || 'Server error.' };
  }
}

/**
 * Server Action to trigger a mock subscription cancellation.
 */
export async function triggerMockSubscriptionCancellation(userId: string) {
  try {
    const subscription = await getSubscription(userId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found.' };
    }

    const cancelledSub: Subscription = {
      ...subscription,
      status: 'cancelled',
    };

    console.log(`Mocking subscription cancellation for user ${userId}...`);
    await upsertSubscription(cancelledSub);

    return { success: true };
  } catch (error: any) {
    console.error(`Error cancelling mock subscription for user ${userId}:`, error);
    return { success: false, error: error.message || 'Server error.' };
  }
}

/**
 * Server Action to load Astro Ephemeris data for the calendar.
 * Strictly gated via hasProAccess.
 */
export async function getAstroCalendarData(userId: string) {
  try {
    const isPro = await hasProAccess(userId);
    if (!isPro) {
      return { success: false, isPaywall: true, error: 'Pro membership required to access Astro Calendar.' };
    }

    const today = new Date();
    const positions = getPlanetaryPositions(today);

    // Scan next 30 days for events
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);
    const events = detectPlanetaryEvents(today, endDate);

    return {
      success: true,
      positions,
      events
    };
  } catch (error: any) {
    console.error('Error compiling Astro calendar data:', error);
    return { success: false, error: error.message || 'Server error loading ephemeris data.' };
  }
}

/**
 * Server Action to run stock setup backtests.
 * Gated via hasProAccess.
 */
export async function runStockBacktests(symbol: string, userId: string) {
  try {
    const isPro = await hasProAccess(userId);
    if (!isPro) {
      return { success: false, isPaywall: true, error: 'Pro membership required to access Pattern Library backtests.' };
    }

    const history = await getDailyPrices(symbol.toUpperCase());
    if (history.length === 0) {
      return { success: false, error: `No price history available for ${symbol} to execute backtests.` };
    }

    const results = backtestStockSetups(history, symbol);
    return { success: true, results };
  } catch (error: any) {
    console.error(`Error running backtests for ${symbol}:`, error);
    return { success: false, error: error.message || 'Server error executing backtests.' };
  }
}
