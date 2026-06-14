import YahooFinance from "yahoo-finance2";
import type {
  Candle,
  IndicatorBundle,
  Market,
  PriceSnapshot,
  Stock,
} from "@/types";
import { getCachedPrice, upsertCachedPrice } from "./db";
import { checkFetchWindow, isForceLive } from "./marketHours";
import { computeIndicators } from "./indicators";

const yahooFinance = new YahooFinance();

export async function fetchQuote(stock: Stock): Promise<PriceSnapshot> {
  const q = await yahooFinance.quote(stock.yahooSymbol);
  const cmp = Number(q.regularMarketPrice ?? 0);
  const prev = Number(q.regularMarketPreviousClose ?? cmp);
  const dayChangePct = prev ? ((cmp - prev) / prev) * 100 : 0;
  return {
    symbol: stock.symbol,
    cmp,
    dayChangePct,
    dayHigh: Number(q.regularMarketDayHigh ?? cmp),
    dayLow: Number(q.regularMarketDayLow ?? cmp),
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? undefined,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? undefined,
    marketCap: q.marketCap ?? undefined,
    pe: q.trailingPE ?? undefined,
    currency: q.currency ?? "INR",
  };
}

export interface HistoryOptions {
  days?: number;
  interval?: "1d" | "1wk" | "1mo";
}

export async function fetchHistory(
  stock: Stock,
  opts: HistoryOptions = {},
): Promise<Candle[]> {
  const days = opts.days ?? 250;
  const interval = opts.interval ?? "1d";
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await yahooFinance.chart(stock.yahooSymbol, {
    period1,
    interval,
    return: "array",
  });
  return result.quotes
    .filter((q) => q.close != null)
    .map<Candle>((q) => ({
      date: q.date.toISOString().slice(0, 10),
      open: Number(q.open ?? q.close),
      high: Number(q.high ?? q.close),
      low: Number(q.low ?? q.close),
      close: Number(q.close),
      volume: Number(q.volume ?? 0),
    }));
}

export async function fetchStockData(stock: Stock, days = 250) {
  const [price, history] = await Promise.all([
    fetchQuote(stock),
    fetchHistory(stock, { days }),
  ]);
  return { price, history };
}

export type CacheSource = "live" | "cache" | "stale";

export interface StockDataResult {
  price: PriceSnapshot;
  history: Candle[];
  indicators: IndicatorBundle;
  source: CacheSource;
  fetchedAt: string;
}

/**
 * Window-aware fetch via Yahoo Finance.
 *
 * - All markets (NSE / US S&P 500) → Yahoo Finance (OHLC history; indicators computed locally).
 *
 * Calls upstream only when the market is inside a configured fetch window
 * (or SCREENER_FORCE_LIVE=1). Outside the window we serve the last cached
 * snapshot+indicators from SQLite. Cold cache always triggers one fetch so
 * the UI is never blank.
 */
export async function getStockData(
  stock: Stock,
  market: Market,
  days = 250,
): Promise<StockDataResult> {
  const force = isForceLive() || market.id === "INTL";
  const window = checkFetchWindow(market);
  const cached = await getCachedPrice(market.id, stock.symbol);

  if (force || window.inWindow || !cached) {
    const fresh = await fetchFresh(stock, days);
    await upsertCachedPrice(
      market.id,
      stock.symbol,
      fresh.price,
      fresh.history,
      fresh.indicators,
    );
    return {
      ...fresh,
      source: "live",
      fetchedAt: new Date().toISOString(),
    };
  }

  return {
    price: cached.price,
    history: cached.history,
    indicators:
      cached.indicators ??
      (cached.history.length
        ? computeIndicators(cached.history)
        : EMPTY_INDICATORS),
    source: "cache",
    fetchedAt: cached.fetchedAt,
  };
}

const EMPTY_INDICATORS: IndicatorBundle = {
  rsi14: null,
  macd: null,
  fib: null,
  sma50: null,
  sma200: null,
};

async function fetchFresh(
  stock: Stock,
  days: number,
): Promise<{ price: PriceSnapshot; history: Candle[]; indicators: IndicatorBundle }> {
  const { price, history } = await fetchStockData(stock, days);
  return { price, history, indicators: computeIndicators(history) };
}

/**
 * Fetch fresh upstream data with NO cache read/write — the building block for
 * bulk callers (the screener top-up and /api/ingest) that batch their own DB
 * writes. All markets (NSE / US S&P 500) use Yahoo Finance.
 */
export async function fetchFreshData(
  stock: Stock,
  days = 250,
): Promise<{ price: PriceSnapshot; history: Candle[]; indicators: IndicatorBundle }> {
  return fetchFresh(stock, days);
}
