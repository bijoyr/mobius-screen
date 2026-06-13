/**
 * Nebius Serverless AI Job — batch ingest + screen.
 *
 * Runs as a one-off container on Nebius Serverless AI (see jobs/Dockerfile and
 * scripts/nebius/run-job.sh). For each configured market it:
 *   1. fetches fresh prices + indicators for the FULL universe (uncapped — this
 *      is a plain Node container, not a Cloudflare Worker with a subrequest cap),
 *   2. upserts them into the shared Turso price cache (speeds up live UI screens),
 *   3. runs the LLM screener (Nebius Serverless AI Endpoint by default) over the
 *      whole universe and persists the result to screen history.
 *
 * This is the project's headline "Serverless AI Jobs" usage: batch orchestration,
 * per-item retry, per-market error isolation, and a single scheduled entrypoint.
 *
 * Env:
 *   MARKETS        space/comma-separated market ids   (default "IN UAE INTL")
 *   MAX_SYMBOLS    cap symbols screened per market (default 0 = whole universe;
 *                  set a small number for a cheap test run)
 *   BATCH_USER_ID  user id screen-history rows are saved under (default "batch")
 *   NEBIUS_BASE_URL, NEBIUS_API_KEY, NEBIUS_MODEL  — see src/lib/providers/nebius.ts
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN  — required (shared DB)
 */
import type { Market, MarketId, Stock, StockContext } from "@/types";
import { getMarket } from "@/lib/markets";
import { fetchFreshData } from "@/lib/yahoo";
import { mapConcurrent } from "@/lib/concurrent";
import { runScreener } from "@/lib/llm";
import { upsertCachedPrices, saveScreenRun, type CachedPriceInput } from "@/lib/db";

const KNOWN_MARKETS: MarketId[] = ["IN", "UAE", "INTL"];
const YAHOO_CONCURRENCY = 8;
const TV_SCANNER_CONCURRENCY = 4;
const FETCH_RETRIES = 3;

interface Fetched {
  symbol: string;
  context: StockContext | null;
  write: CachedPriceInput | null;
  error: string | null;
}

async function fetchOne(market: Market, s: Stock): Promise<Fetched> {
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    try {
      const { price, history, indicators } = await fetchFreshData(s, 250);
      return {
        symbol: s.symbol,
        context: { symbol: s.symbol, price, indicators },
        write: { market: market.id, symbol: s.symbol, price, history, indicators },
        error: null,
      };
    } catch (err) {
      if (attempt < FETCH_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      return {
        symbol: s.symbol,
        context: null,
        write: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  return { symbol: s.symbol, context: null, write: null, error: "unreachable" };
}

async function screenMarket(
  marketId: MarketId,
  userId: string,
  maxSymbols: number,
): Promise<void> {
  const market = await getMarket(marketId);
  if (market.universe.length === 0) {
    console.log(`[${marketId}] universe empty — skipping`);
    return;
  }
  const universe =
    maxSymbols > 0 ? market.universe.slice(0, maxSymbols) : market.universe;
  console.log(
    `[${marketId}] fetching ${universe.length} symbols` +
      (maxSymbols > 0 ? ` (capped from ${market.universe.length})` : "") +
      "…",
  );

  const yahooStocks = universe.filter((s) => s.exchange !== "ADX");
  const tvStocks = universe.filter((s) => s.exchange === "ADX");
  const [yahooBatch, tvBatch] = await Promise.all([
    mapConcurrent(yahooStocks, YAHOO_CONCURRENCY, (s) => fetchOne(market, s)),
    mapConcurrent(tvStocks, TV_SCANNER_CONCURRENCY, (s) => fetchOne(market, s)),
  ]);
  const fetched = [...yahooBatch.results, ...tvBatch.results].filter(
    (r): r is Fetched => r != null,
  );

  const contexts: StockContext[] = [];
  const toWrite: CachedPriceInput[] = [];
  const failures: string[] = [];
  for (const f of fetched) {
    if (f.context && f.write) {
      contexts.push(f.context);
      toWrite.push(f.write);
    } else {
      failures.push(f.symbol);
    }
  }

  await upsertCachedPrices(toWrite);
  console.log(
    `[${marketId}] cached ${toWrite.length}, failed ${failures.length}` +
      (failures.length ? ` (${failures.slice(0, 8).join(", ")}…)` : ""),
  );

  if (contexts.length === 0) {
    console.log(`[${marketId}] no usable data — skipping screen`);
    return;
  }

  console.log(`[${marketId}] screening ${contexts.length} symbols…`);
  const run = await runScreener(market, contexts, undefined);
  const id = await saveScreenRun(
    { ...run.result, market: market.id },
    userId,
    market.id,
  );
  console.log(
    `[${marketId}] saved screen #${id} via ${run.provider}: ` +
      `${run.result.topBuys.length} buys, ${run.result.topSells.length} sells`,
  );
}

async function main() {
  const userId = process.env.BATCH_USER_ID ?? "batch";
  const maxSymbols = Math.max(0, Math.trunc(Number(process.env.MAX_SYMBOLS ?? 0)));
  const requested = (process.env.MARKETS ?? "IN UAE INTL")
    .split(/[\s,]+/)
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean) as MarketId[];

  const markets = requested.filter((m) => KNOWN_MARKETS.includes(m));
  const unknown = requested.filter((m) => !KNOWN_MARKETS.includes(m));
  if (unknown.length) console.warn(`Ignoring unknown markets: ${unknown.join(", ")}`);
  if (markets.length === 0) {
    console.error("No valid markets to screen. Set MARKETS (e.g. 'IN UAE INTL').");
    process.exit(1);
  }

  console.log(`Batch screen starting — markets: ${markets.join(", ")}`);
  const failed: MarketId[] = [];
  for (const m of markets) {
    try {
      await screenMarket(m, userId, maxSymbols);
    } catch (err) {
      failed.push(m);
      console.error(`[${m}] FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  if (failed.length) {
    console.error(`Batch screen finished with failures: ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log("Batch screen finished — all markets OK.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
