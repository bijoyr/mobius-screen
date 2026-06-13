import { RSI, MACD, SMA } from "technicalindicators";
import type { Candle, IndicatorBundle } from "@/types";

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
const FIB_KEYS = ["0", "23.6", "38.2", "50", "61.8", "78.6", "100"] as const;

export function computeIndicators(candles: Candle[]): IndicatorBundle {
  if (candles.length < 30) {
    return {
      rsi14: null,
      macd: null,
      fib: null,
      sma50: null,
      sma200: null,
    };
  }

  const closes = candles.map((c) => c.close);

  const rsiArr = RSI.calculate({ period: 14, values: closes });
  const rsi14 = rsiArr.length ? rsiArr[rsiArr.length - 1] : null;

  const macdArr = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const lastMacd = macdArr.length ? macdArr[macdArr.length - 1] : null;
  const macd =
    lastMacd && lastMacd.MACD != null && lastMacd.signal != null
      ? {
          macd: lastMacd.MACD,
          signal: lastMacd.signal,
          histogram: lastMacd.histogram ?? lastMacd.MACD - lastMacd.signal,
        }
      : null;

  const sma50Arr =
    closes.length >= 50 ? SMA.calculate({ period: 50, values: closes }) : [];
  const sma200Arr =
    closes.length >= 200 ? SMA.calculate({ period: 200, values: closes }) : [];
  const sma50 = sma50Arr.length ? sma50Arr[sma50Arr.length - 1] : null;
  const sma200 = sma200Arr.length ? sma200Arr[sma200Arr.length - 1] : null;

  const fib = computeFib(candles);

  return { rsi14, macd, fib, sma50, sma200 };
}

/**
 * Fibonacci retracement using the highest high and lowest low over the lookback.
 * If the high precedes the low → downtrend retracement; otherwise uptrend.
 */
export function computeFib(
  candles: Candle[],
  lookback = 120,
): IndicatorBundle["fib"] {
  if (candles.length < 10) return null;
  const slice = candles.slice(-lookback);
  let hi = slice[0].high;
  let lo = slice[0].low;
  let hiIdx = 0;
  let loIdx = 0;
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].high > hi) {
      hi = slice[i].high;
      hiIdx = i;
    }
    if (slice[i].low < lo) {
      lo = slice[i].low;
      loIdx = i;
    }
  }
  const uptrend = loIdx < hiIdx;
  const swingHigh = hi;
  const swingLow = lo;
  const range = swingHigh - swingLow;

  const levels = {} as IndicatorBundle["fib"] extends infer T
    ? T extends { levels: infer L }
      ? L
      : never
    : never;

  FIB_RATIOS.forEach((r, i) => {
    // Uptrend retracements: high - r*range (deeper retrace = lower price)
    // Downtrend retracements: low + r*range (deeper retrace = higher price)
    const level = uptrend ? swingHigh - r * range : swingLow + r * range;
    (levels as Record<string, number>)[FIB_KEYS[i]] = round2(level);
  });

  return { swingHigh: round2(swingHigh), swingLow: round2(swingLow), levels };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
