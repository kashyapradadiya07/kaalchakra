// Rule-based Technical/Astro Setup Backtester Engine
// Strictly descriptive statistics of historical price observations.

import { calculateGannLevels } from './gann';
import { detectPlanetaryEvents } from './ephemeris';
import { DailyPrice } from './db';

export interface BacktestResult {
  setupId: string;
  setupName: string;
  description: string;
  totalOccurrences: number;
  avgForwardReturn5d: number; // average % change in next 5 trading days
  upwardMovementFrequency5d: number; // % of occurrences where price moved > +1.5% in 5 days
  downwardMovementFrequency5d: number; // % of occurrences where price moved < -1.5% in 5 days
}

export interface SetupDefinition {
  id: string;
  name: string;
  description: string;
  direction: 'bullish' | 'bearish';
  evaluate: (
    pricePoint: DailyPrice,
    history: DailyPrice[],
    idx: number,
    retrogradeDates: Set<string>,
    ingressDates: Set<string>
  ) => boolean;
}

// Helper to check if a date is within N calendar days of a set of event dates
function isNearEvent(targetDateStr: string, eventDates: Set<string>, maxDays: number = 3): boolean {
  const targetTime = new Date(targetDateStr).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let offset = -maxDays; offset <= maxDays; offset++) {
    const checkDateStr = new Date(targetTime + offset * dayMs).toISOString().split('T')[0];
    if (eventDates.has(checkDateStr)) {
      return true;
    }
  }
  return false;
}

// 1. SETUP DEFINITIONS
export const SETUPS: SetupDefinition[] = [
  {
    id: 'gann_support_reversal',
    name: 'Gann Support & Rx Proximity (Bullish)',
    description: 'Price is within 1.5% of a Gann Support level, RSI is oversold (< 35), and occurs within 3 days of a Mercury/Venus Retrograde station.',
    direction: 'bullish',
    evaluate: (pricePoint, history, idx, retrogradeDates) => {
      // Condition 1: RSI is oversold
      if (!pricePoint.rsi || pricePoint.rsi >= 35) return false;

      // Condition 2: Near Retrograde station
      if (!isNearEvent(pricePoint.date, retrogradeDates, 3)) return false;

      // Condition 3: Price is near Gann Support
      const gannLevels = calculateGannLevels(pricePoint.close, 1);
      const isNearSupport = gannLevels.some(level => {
        const supportPrice = level.support;
        const pctDiff = Math.abs(pricePoint.close - supportPrice) / supportPrice * 100;
        return pctDiff <= 1.5;
      });

      return isNearSupport;
    }
  },
  {
    id: 'gann_resistance_rejection',
    name: 'Gann Resistance & Rx Proximity (Bearish)',
    description: 'Price is within 1.5% of a Gann Resistance level, RSI is overbought (> 65), and occurs within 3 days of a Mercury/Venus Retrograde station.',
    direction: 'bearish',
    evaluate: (pricePoint, history, idx, retrogradeDates) => {
      // Condition 1: RSI is overbought
      if (!pricePoint.rsi || pricePoint.rsi <= 65) return false;

      // Condition 2: Near Retrograde station
      if (!isNearEvent(pricePoint.date, retrogradeDates, 3)) return false;

      // Condition 3: Price is near Gann Resistance
      const gannLevels = calculateGannLevels(pricePoint.close, 1);
      const isNearResistance = gannLevels.some(level => {
        const resPrice = level.resistance;
        const pctDiff = Math.abs(pricePoint.close - resPrice) / resPrice * 100;
        return pctDiff <= 1.5;
      });

      return isNearResistance;
    }
  },
  {
    id: 'ingress_trend_momentum',
    name: 'Planetary Ingress Trend Momentum (Bullish)',
    description: 'Mercury or Venus enters a new zodiac sign (ingress) on the day, price is trading above SMA(50), and RSI exhibits strong bullish momentum (50 - 65).',
    direction: 'bullish',
    evaluate: (pricePoint, history, idx, retrogradeDates, ingressDates) => {
      // Condition 1: Ingress day
      if (!ingressDates.has(pricePoint.date)) return false;

      // Condition 2: Price above SMA 50
      if (!pricePoint.sma_50 || pricePoint.close <= pricePoint.sma_50) return false;

      // Condition 3: RSI in strong bullish momentum
      if (!pricePoint.rsi || pricePoint.rsi < 50 || pricePoint.rsi > 65) return false;

      return true;
    }
  }
];

/**
 * Runs descriptive statistics backtesting for a set of setups against a stock's EOD price history.
 * 
 * @param history Ascending chronological list of daily prices
 * @param symbol Stock symbol string
 */
export function backtestStockSetups(history: DailyPrice[], symbol: string): BacktestResult[] {
  if (history.length < 50) return [];

  // Sort ascending by date to run chronological walk
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Pre-calculate planetary events over the history range to speed up evaluations
  const start = new Date(sortedHistory[0].date);
  const end = new Date(sortedHistory[sortedHistory.length - 1].date);
  
  const astroEvents = detectPlanetaryEvents(start, end);
  const retrogradeDates = new Set<string>();
  const ingressDates = new Set<string>();

  astroEvents.forEach((e) => {
    if (e.type === 'retrograde_start' || e.type === 'retrograde_end') {
      retrogradeDates.add(e.date);
    } else if (e.type === 'ingress') {
      ingressDates.add(e.date);
    }
  });

  const results: BacktestResult[] = [];

  SETUPS.forEach((setup) => {
    let occurrences = 0;
    let sumReturn5d = 0;
    let upMoves5d = 0;
    let downMoves5d = 0;

    // Scan history, leaving a 5-day cushion at the end for forward return calculations
    for (let i = 20; i < sortedHistory.length - 5; i++) {
      const pricePoint = sortedHistory[i];
      const isMatched = setup.evaluate(pricePoint, sortedHistory, i, retrogradeDates, ingressDates);

      if (isMatched) {
        occurrences++;
        
        // Calculate 5-day forward return
        const nextPricePoint = sortedHistory[i + 5];
        const pctReturn = ((nextPricePoint.close - pricePoint.close) / pricePoint.close) * 100;
        
        sumReturn5d += pctReturn;
        
        if (pctReturn >= 1.5) {
          upMoves5d++;
        } else if (pctReturn <= -1.5) {
          downMoves5d++;
        }
      }
    }

    results.push({
      setupId: setup.id,
      setupName: setup.name,
      description: setup.description,
      totalOccurrences: occurrences,
      avgForwardReturn5d: occurrences > 0 ? parseFloat((sumReturn5d / occurrences).toFixed(2)) : 0,
      upwardMovementFrequency5d: occurrences > 0 ? parseFloat(((upMoves5d / occurrences) * 100).toFixed(1)) : 0,
      downwardMovementFrequency5d: occurrences > 0 ? parseFloat(((downMoves5d / occurrences) * 100).toFixed(1)) : 0
    });
  });

  return results;
}
