export type ScreenSide = "BUY" | "SELL";

export type MarketId = "IN" | "UAE" | "INTL";
export type ExchangeId = "NSE" | "ADX" | "DFM" | "INTL";
export type ScreenDirection = "LONG_SHORT" | "LONG_ONLY";

export interface Stock {
  /** Bare ticker — what appears in URLs and the watchlist. */
  symbol: string;
  /** Full Yahoo Finance symbol (e.g. "RELIANCE.NS", "EMAAR.DU"). */
  yahooSymbol: string;
  /** Full TradingView symbol (e.g. "NSE:RELIANCE", "ADX:IHC"). */
  tvSymbol: string;
  exchange: ExchangeId;
  marketId: MarketId;
  name: string;
  sector?: string;
}

/** Back-compat alias. Prefer `Stock`. */
export type FoStock = Stock;

export interface Market {
  id: MarketId;
  label: string;
  direction: ScreenDirection;
  currencySymbol: string;
  timezone: string;
  universe: Stock[];
  /** Macro context injected into the screener prompt. */
  themePrompt: string;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceSnapshot {
  symbol: string;
  cmp: number;
  dayChangePct: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  pe?: number;
  currency: string;
}

export interface IndicatorBundle {
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  fib: {
    swingHigh: number;
    swingLow: number;
    levels: Record<"0" | "23.6" | "38.2" | "50" | "61.8" | "78.6" | "100", number>;
  } | null;
  sma50: number | null;
  sma200: number | null;
}

export interface StockContext {
  symbol: string;
  price: PriceSnapshot;
  indicators: IndicatorBundle;
}

export interface ScreenerPick {
  symbol: string;
  side: ScreenSide;
  conviction: 1 | 2 | 3 | 4 | 5;
  thesis: string;
  waveCount: string;
  entry: number;
  stop: number;
  target: number;
  timeframe: string;
  risks: string[];
  /** Day-over-day price change %. Enriched server-side from the cached price snapshot. */
  dayChangePct?: number;
}

export interface ScreenerResult {
  generatedAt: string;
  topBuys: ScreenerPick[];
  topSells: ScreenerPick[];
  macroNote: string;
  market?: MarketId;
}

export type Strictness = "LOOSE" | "BALANCED" | "STRICT";

export interface ScreenerParameters {
  /** Minimum risk/reward ratio to accept a pick. Default 1.8 (long+short) / 2.0 (long-only). */
  minRR?: number;
  /** Drop picks with conviction below this (1-5). Default 1 (keep all). */
  minConviction?: number;
  /** Max picks per side (buys, sells). Default 5. */
  maxPicks?: number;
  /** Free-form: themes or sectors to favour. */
  focusThemes?: string;
  /** Free-form: themes or sectors to avoid. */
  avoidThemes?: string;
  /** Tightens/loosens the framework. Default BALANCED. */
  strictness?: Strictness;
  /**
   * If non-empty, this string replaces the auto-generated system prompt verbatim.
   * When set, the framework/strictness/focus/avoid controls above only affect the
   * user message (R:R, conviction, max-picks targets) — they are NOT injected into
   * the system prompt. Use to fully take over Claude's instructions.
   */
  systemPromptOverride?: string;
}

export interface WatchlistEntry {
  id: number;
  symbol: string;
  tag: "BUY" | "SELL" | "WATCH";
  notes: string;
  addedAt: string;
}

export interface ScreenHistoryRow {
  id: number;
  runAt: string;
  result: ScreenerResult;
}
