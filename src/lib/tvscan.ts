import type { Candle, IndicatorBundle, PriceSnapshot, Stock } from "@/types";

/**
 * TradingView public scanner client.
 *
 * Hits `scanner.tradingview.com/{region}/scan` — the same endpoint that
 * powers TradingView's website screener. Undocumented, but stable enough
 * for personal use. Returns current snapshot + pre-computed indicators
 * (RSI, MACD, SMA50, SMA200). OHLC history is NOT returned, so callers
 * that need bars must look elsewhere; the screener works fine without.
 *
 * Used for ADX (Abu Dhabi) because Yahoo Finance has no ADX coverage.
 */

const SCANNER_REGION = "uae";

const COLUMNS = [
  "name",
  "close",
  "change",
  "high",
  "low",
  "volume",
  "market_cap_basic",
  "price_earnings_ttm",
  "price_52_week_high",
  "price_52_week_low",
  "RSI",
  "MACD.macd",
  "MACD.signal",
  "SMA50",
  "SMA200",
  "currency",
] as const;

type Col = (typeof COLUMNS)[number];
const COL_IDX = COLUMNS.reduce(
  (acc, c, i) => {
    acc[c] = i;
    return acc;
  },
  {} as Record<Col, number>,
);

interface ScannerResponse {
  totalCount?: number;
  data?: Array<{ s: string; d: unknown[] }>;
}

export interface TvSnapshot {
  price: PriceSnapshot;
  indicators: IndicatorBundle;
}

export async function fetchTvSnapshot(
  tickers: string[],
): Promise<Map<string, TvSnapshot>> {
  const out = new Map<string, TvSnapshot>();
  if (!tickers.length) return out;

  const res = await fetch(
    `https://scanner.tradingview.com/${SCANNER_REGION}/scan`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.tradingview.com",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        symbols: { tickers, query: { types: [] } },
        columns: COLUMNS,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`TradingView scanner ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as ScannerResponse;

  for (const row of json.data ?? []) {
    const bareSymbol = (row.s.split(":")[1] ?? row.s).toUpperCase();
    out.set(row.s, parseRow(bareSymbol, row.d));
  }
  return out;
}

function parseRow(symbol: string, d: unknown[]): TvSnapshot {
  const num = (c: Col): number | null => {
    const v = d[COL_IDX[c]];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const str = (c: Col): string | null => {
    const v = d[COL_IDX[c]];
    return typeof v === "string" ? v : null;
  };

  const cmp = num("close") ?? 0;
  const macdVal = num("MACD.macd");
  const macdSig = num("MACD.signal");

  return {
    price: {
      symbol,
      cmp,
      dayChangePct: num("change") ?? 0,
      dayHigh: num("high") ?? cmp,
      dayLow: num("low") ?? cmp,
      fiftyTwoWeekHigh: num("price_52_week_high") ?? undefined,
      fiftyTwoWeekLow: num("price_52_week_low") ?? undefined,
      marketCap: num("market_cap_basic") ?? undefined,
      pe: num("price_earnings_ttm") ?? undefined,
      currency: str("currency") ?? "AED",
    },
    indicators: {
      rsi14: num("RSI"),
      macd:
        macdVal != null && macdSig != null
          ? { macd: macdVal, signal: macdSig, histogram: macdVal - macdSig }
          : null,
      fib: null,
      sma50: num("SMA50"),
      sma200: num("SMA200"),
    },
  };
}

/**
 * Single-stock fetch that matches the shape `getStockData` consumers expect.
 * History is always empty for the TV scanner path — Fib levels are not
 * available, but the rest of the indicator stack (RSI/MACD/SMA) is.
 */
export async function fetchTvStockData(
  stock: Stock,
): Promise<{ price: PriceSnapshot; history: Candle[]; indicators: IndicatorBundle }> {
  const map = await fetchTvSnapshot([stock.tvSymbol]);
  const row = map.get(stock.tvSymbol);
  if (!row) {
    throw new Error(`TradingView scanner returned no data for ${stock.tvSymbol}`);
  }
  return {
    price: { ...row.price, symbol: stock.symbol },
    history: [],
    indicators: row.indicators,
  };
}
