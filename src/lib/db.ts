import { createClient, type Client } from "@libsql/client/web";
import type {
  Candle,
  ExchangeId,
  IndicatorBundle,
  PriceSnapshot,
  ScreenerResult,
  Stock,
  WatchlistEntry,
  ScreenHistoryRow,
} from "@/types";

let _client: Client | null = null;
let _migrated: Promise<void> | null = null;

function rawClient(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  _client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return _client;
}

async function getClient(): Promise<Client> {
  const client = rawClient();
  if (!_migrated) _migrated = migrate(client);
  await _migrated;
  return client;
}

async function migrate(db: Client): Promise<void> {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL CHECK (tag IN ('BUY','SELL','WATCH')),
      notes TEXT NOT NULL DEFAULT '',
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS screen_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at TEXT NOT NULL DEFAULT (datetime('now')),
      result_json TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS price_cache (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      price_json TEXT NOT NULL,
      history_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (market, symbol)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_price_cache_market_fetched
      ON price_cache (market, fetched_at)`,
    `CREATE TABLE IF NOT EXISTS intl_universe (
      symbol TEXT PRIMARY KEY,
      yahoo_symbol TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      exchange TEXT NOT NULL DEFAULT 'INTL',
      sector TEXT NOT NULL DEFAULT '',
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS user_preferences (
      user_id     TEXT NOT NULL,
      market      TEXT NOT NULL,
      params_json TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, market)
    )`,
  ]);

  const priceCols = await db.execute("PRAGMA table_info(price_cache)");
  if (!priceCols.rows.some((c) => c.name === "indicators_json")) {
    await db.execute("ALTER TABLE price_cache ADD COLUMN indicators_json TEXT");
  }

  await db.execute("DROP TABLE IF EXISTS stock_notes");

  const histCols = await db.execute("PRAGMA table_info(screen_history)");
  if (!histCols.rows.some((c) => c.name === "user_id")) {
    await db.batch([
      "ALTER TABLE screen_history ADD COLUMN user_id TEXT",
      "CREATE INDEX IF NOT EXISTS idx_screen_history_user_run ON screen_history (user_id, run_at)",
    ]);
  }
}

// ----- Watchlist -----

export async function listWatchlist(): Promise<WatchlistEntry[]> {
  const db = await getClient();
  const res = await db.execute(
    "SELECT id, symbol, tag, notes, added_at AS addedAt FROM watchlist ORDER BY added_at DESC",
  );
  return res.rows as unknown as WatchlistEntry[];
}

export async function upsertWatchlist(
  symbol: string,
  tag: WatchlistEntry["tag"],
  notes = "",
): Promise<WatchlistEntry> {
  const db = await getClient();
  await db.execute({
    sql: `INSERT INTO watchlist (symbol, tag, notes) VALUES (?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET tag = excluded.tag, notes = excluded.notes`,
    args: [symbol, tag, notes],
  });
  const res = await db.execute({
    sql: "SELECT id, symbol, tag, notes, added_at AS addedAt FROM watchlist WHERE symbol = ?",
    args: [symbol],
  });
  return res.rows[0] as unknown as WatchlistEntry;
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
  const db = await getClient();
  await db.execute({
    sql: "DELETE FROM watchlist WHERE symbol = ?",
    args: [symbol],
  });
}

// ----- Screen history -----

export async function saveScreenResult(
  result: ScreenerResult,
  userId: string,
): Promise<number> {
  const db = await getClient();
  const res = await db.execute({
    sql: "INSERT INTO screen_history (result_json, user_id) VALUES (?, ?)",
    args: [JSON.stringify(result), userId],
  });
  return Number(res.lastInsertRowid);
}

/**
 * Persist a screen result and (optionally) the user's tuning params in ONE
 * batched transaction. Replaces the previous two separate writes so a full
 * screen run costs a single DB subrequest.
 */
export async function saveScreenRun(
  result: ScreenerResult,
  userId: string,
  market: string,
  params?: unknown,
): Promise<number> {
  const db = await getClient();
  const stmts = [
    {
      sql: "INSERT INTO screen_history (result_json, user_id) VALUES (?, ?)",
      args: [JSON.stringify(result), userId] as (string | number | null)[],
    },
  ];
  if (params !== undefined) {
    stmts.push({
      sql: `INSERT INTO user_preferences (user_id, market, params_json, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, market) DO UPDATE SET
           params_json = excluded.params_json,
           updated_at = excluded.updated_at`,
      args: [userId, market, JSON.stringify(params)],
    });
  }
  const res = await db.batch(stmts);
  return Number(res[0].lastInsertRowid);
}

export async function listScreenHistory(
  userId: string,
  limit = 20,
): Promise<ScreenHistoryRow[]> {
  const db = await getClient();
  const res = await db.execute({
    sql: `SELECT id, run_at AS runAt, result_json AS resultJson
       FROM screen_history WHERE user_id = ?
       ORDER BY run_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    runAt: r.runAt as string,
    result: JSON.parse(r.resultJson as string) as ScreenerResult,
  }));
}

export async function getLatestScreen(
  userId: string,
): Promise<ScreenHistoryRow | null> {
  const db = await getClient();
  const res = await db.execute({
    sql: `SELECT id, run_at AS runAt, result_json AS resultJson
       FROM screen_history WHERE user_id = ?
       ORDER BY run_at DESC LIMIT 1`,
    args: [userId],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    runAt: row.runAt as string,
    result: JSON.parse(row.resultJson as string) as ScreenerResult,
  };
}

export async function getLatestScreenForMarket(
  userId: string,
  market: string,
): Promise<ScreenHistoryRow | null> {
  const db = await getClient();
  const res = await db.execute({
    sql: `SELECT id, run_at AS runAt, result_json AS resultJson
       FROM screen_history
       WHERE user_id = ?
         AND json_extract(result_json, '$.market') = ?
       ORDER BY run_at DESC LIMIT 1`,
    args: [userId, market],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    runAt: row.runAt as string,
    result: JSON.parse(row.resultJson as string) as ScreenerResult,
  };
}

// ----- User preferences -----

export async function getUserPreferences(
  userId: string,
  market: string,
): Promise<unknown | null> {
  const db = await getClient();
  const res = await db.execute({
    sql: "SELECT params_json AS paramsJson FROM user_preferences WHERE user_id = ? AND market = ?",
    args: [userId, market],
  });
  const row = res.rows[0];
  if (!row) return null;
  try {
    return JSON.parse(row.paramsJson as string);
  } catch {
    return null;
  }
}

export async function upsertUserPreferences(
  userId: string,
  market: string,
  params: unknown,
): Promise<void> {
  const db = await getClient();
  await db.execute({
    sql: `INSERT INTO user_preferences (user_id, market, params_json, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, market) DO UPDATE SET
         params_json = excluded.params_json,
         updated_at = excluded.updated_at`,
    args: [userId, market, JSON.stringify(params)],
  });
}

// ----- Price cache -----

export interface CachedPrice {
  symbol: string;
  market: string;
  price: PriceSnapshot;
  history: Candle[];
  indicators: IndicatorBundle | null;
  fetchedAt: string;
}

export interface CachedContext {
  price: PriceSnapshot;
  indicators: IndicatorBundle | null;
  fetchedAt: string;
}

/**
 * Bulk-read the lean screening context (price + indicators, no OHLC history)
 * for every cached stock in a market in ONE round-trip. The screener prompt
 * never needs raw candles, so skipping history_json keeps the payload — and the
 * Cloudflare subrequest count — small.
 */
export async function getCachedContexts(
  market: string,
): Promise<Map<string, CachedContext>> {
  const db = await getClient();
  const res = await db.execute({
    sql: `SELECT symbol, price_json AS priceJson, indicators_json AS indicatorsJson,
              fetched_at AS fetchedAt
       FROM price_cache WHERE market = ?`,
    args: [market],
  });
  const map = new Map<string, CachedContext>();
  for (const row of res.rows) {
    map.set(row.symbol as string, {
      price: JSON.parse(row.priceJson as string) as PriceSnapshot,
      indicators: row.indicatorsJson
        ? (JSON.parse(row.indicatorsJson as string) as IndicatorBundle)
        : null,
      fetchedAt: row.fetchedAt as string,
    });
  }
  return map;
}

export interface CachedPriceInput {
  market: string;
  symbol: string;
  price: PriceSnapshot;
  history: Candle[];
  indicators: IndicatorBundle | null;
}

/** Write many price-cache rows in ONE batched transaction (one subrequest). */
export async function upsertCachedPrices(
  rows: CachedPriceInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const db = await getClient();
  await db.batch(
    rows.map((r) => ({
      sql: `INSERT INTO price_cache (market, symbol, price_json, history_json, indicators_json, fetched_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(market, symbol) DO UPDATE SET
         price_json = excluded.price_json,
         history_json = excluded.history_json,
         indicators_json = excluded.indicators_json,
         fetched_at = excluded.fetched_at`,
      args: [
        r.market,
        r.symbol,
        JSON.stringify(r.price),
        JSON.stringify(r.history),
        r.indicators ? JSON.stringify(r.indicators) : null,
      ],
    })),
  );
}

export async function getCachedPrice(
  market: string,
  symbol: string,
): Promise<CachedPrice | null> {
  const db = await getClient();
  const res = await db.execute({
    sql: `SELECT symbol, market, price_json AS priceJson, history_json AS historyJson,
              indicators_json AS indicatorsJson, fetched_at AS fetchedAt
       FROM price_cache WHERE market = ? AND symbol = ?`,
    args: [market, symbol],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    symbol: row.symbol as string,
    market: row.market as string,
    price: JSON.parse(row.priceJson as string) as PriceSnapshot,
    history: JSON.parse(row.historyJson as string) as Candle[],
    indicators: row.indicatorsJson
      ? (JSON.parse(row.indicatorsJson as string) as IndicatorBundle)
      : null,
    fetchedAt: row.fetchedAt as string,
  };
}

export async function upsertCachedPrice(
  market: string,
  symbol: string,
  price: PriceSnapshot,
  history: Candle[],
  indicators: IndicatorBundle | null,
): Promise<void> {
  const db = await getClient();
  await db.execute({
    sql: `INSERT INTO price_cache (market, symbol, price_json, history_json, indicators_json, fetched_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(market, symbol) DO UPDATE SET
         price_json = excluded.price_json,
         history_json = excluded.history_json,
         indicators_json = excluded.indicators_json,
         fetched_at = excluded.fetched_at`,
    args: [
      market,
      symbol,
      JSON.stringify(price),
      JSON.stringify(history),
      indicators ? JSON.stringify(indicators) : null,
    ],
  });
}

export async function getCacheStats(
  market: string,
): Promise<{ count: number; lastFetched: string | null }> {
  const db = await getClient();
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS count, MAX(fetched_at) AS lastFetched
       FROM price_cache WHERE market = ?`,
    args: [market],
  });
  const row = res.rows[0];
  return {
    count: Number(row.count),
    lastFetched: (row.lastFetched as string | null) ?? null,
  };
}

// ----- INTL universe (user-uploaded watchlist) -----

const TV_EXCHANGE_PREFIXES = new Set([
  "NASDAQ",
  "NYSE",
  "AMEX",
  "LSE",
  "XETR",
  "TSE",
  "HKEX",
  "ASX",
  "SSE",
  "SZSE",
  "EURONEXT",
  "BME",
  "SIX",
  "TSX",
]);

function tvSymbolFor(symbol: string, exchange: string): string {
  const ex = exchange.trim().toUpperCase();
  return TV_EXCHANGE_PREFIXES.has(ex) ? `${ex}:${symbol}` : symbol;
}

export interface IntlUniverseInput {
  symbol: string;
  yahooSymbol: string;
  name?: string;
  exchange?: string;
  sector?: string;
}

export async function listIntlUniverse(): Promise<Stock[]> {
  const db = await getClient();
  const res = await db.execute(
    "SELECT symbol, yahoo_symbol AS yahooSymbol, name, exchange, sector FROM intl_universe ORDER BY symbol",
  );
  return res.rows.map((r) => ({
    symbol: r.symbol as string,
    yahooSymbol: r.yahooSymbol as string,
    tvSymbol: tvSymbolFor(r.symbol as string, r.exchange as string),
    exchange: ((r.exchange as string).toUpperCase() as ExchangeId) ?? "INTL",
    marketId: "INTL" as const,
    name: r.name as string,
    sector: (r.sector as string) || undefined,
  }));
}

export async function replaceIntlUniverse(
  stocks: IntlUniverseInput[],
): Promise<number> {
  const db = await getClient();
  await db.batch([
    "DELETE FROM intl_universe",
    ...stocks.map((s) => ({
      sql: "INSERT INTO intl_universe (symbol, yahoo_symbol, name, exchange, sector) VALUES (?, ?, ?, ?, ?)",
      args: [
        s.symbol.toUpperCase(),
        s.yahooSymbol,
        s.name ?? "",
        (s.exchange ?? "INTL").toUpperCase(),
        s.sector ?? "",
      ],
    })),
  ]);
  return stocks.length;
}
