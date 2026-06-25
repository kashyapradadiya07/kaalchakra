// Technical Analysis Indicators Math
// Pure calculations for SMA and RSI.

export interface PricePoint {
  close: number;
}

/**
 * Calculates Simple Moving Average (SMA) for a given period.
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    sma.push(parseFloat((sum / period).toFixed(2)));
  }

  return sma;
}

/**
 * Calculates Relative Strength Index (RSI) for a given period (usually 14).
 * Uses Wilder's smoothing technique.
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = [];
  if (prices.length <= period) {
    return Array(prices.length).fill(null);
  }

  let gains = 0;
  let losses = 0;

  // First RSI value calculations
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Pad the first 'period' elements with null
  for (let i = 0; i < period; i++) {
    rsi.push(null);
  }

  // Calculate first RSI point
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)));

  // Calculate subsequent RSI points using Wilder's smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(parseFloat((100 - 100 / (1 + rs)).toFixed(2)));
  }

  return rsi;
}
