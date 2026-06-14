import { NextResponse } from "next/server";
import { getMarket } from "@/lib/markets";
import { fetchFreshData } from "@/lib/yahoo";
import { mapConcurrent } from "@/lib/concurrent";
import { runScreener } from "@/lib/llm";
import {
  getCachedContexts,
  upsertCachedPrices,
  saveScreenRun,
  type CachedPriceInput,
} from "@/lib/db";
import { auth } from "@/auth";
import { checkFetchWindow } from "@/lib/marketHours";
import type {
  Candle,
  IndicatorBundle,
  Market,
  MarketId,
  PriceSnapshot,
  ScreenerParameters,
  ScreenerPick,
  Stock,
  StockContext,
} from "@/types";

const KNOWN_MARKETS: MarketId[] = ["IN", "US", "INTL"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// This route reads the price cache in bulk and screens it. Live upstream fetches
// are a bounded *top-up* only for symbols with no cache yet — the bulk refresh is
// the job of /api/ingest (run from GitHub Actions cron). Each Yahoo fetch costs
// 2 upstream subrequests (quote + chart), so capping at 12 keeps the top-up under
// ~24 subrequests; combined with 1 bulk read + 1 bulk write + 1 LLM call + 1
// save, a screen stays well under Cloudflare's 50-subrequest/invocation cap.
const MAX_LIVE_FETCH_STOCKS = 12;
const YAHOO_CONCURRENCY = 8;

const EMPTY_INDICATORS: IndicatorBundle = {
  rsi14: null,
  macd: null,
  fib: null,
  sma50: null,
  sma200: null,
};

interface ScreenRequestBody {
  market?: MarketId;
  symbols?: string[];
  limit?: number;
  parameters?: ScreenerParameters;
}

interface Fetched {
  symbol: string;
  context: StockContext | null;
  price?: PriceSnapshot;
  history?: Candle[];
  indicators?: IndicatorBundle;
  error: string | null;
}

async function fetchOne(s: Stock): Promise<Fetched> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { price, history, indicators } = await fetchFreshData(s, 250);
      return {
        symbol: s.symbol,
        context: { symbol: s.symbol, price, indicators },
        price,
        history,
        indicators,
        error: null,
      };
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      return {
        symbol: s.symbol,
        context: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  return { symbol: s.symbol, context: null, error: "unreachable" };
}

async function topUpMissing(
  market: Market,
  missing: Stock[],
): Promise<{ fresh: Fetched[]; deferred: Stock[] }> {
  const toFetch = missing.slice(0, MAX_LIVE_FETCH_STOCKS);
  const deferred = missing.slice(MAX_LIVE_FETCH_STOCKS);
  if (toFetch.length === 0) return { fresh: [], deferred };

  const batch = await mapConcurrent(toFetch, YAHOO_CONCURRENCY, fetchOne);
  const fresh = batch.results.filter((r): r is Fetched => r != null);
  return { fresh, deferred };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: ScreenRequestBody = {};
  try {
    body = (await req.json()) as ScreenRequestBody;
  } catch {
    // empty body OK
  }

  const marketId: MarketId = body.market ?? "IN";
  if (!KNOWN_MARKETS.includes(marketId)) {
    return NextResponse.json(
      { error: `Unknown market: ${marketId}` },
      { status: 400 },
    );
  }
  const market = await getMarket(marketId);
  if (market.universe.length === 0) {
    return NextResponse.json(
      {
        error:
          marketId === "INTL"
            ? "Your International watchlist is empty. Upload a CSV at /intl first."
            : `Market ${marketId} has no stocks configured`,
        universeRequested: 0,
        droppedSymbols: [],
      },
      { status: 400 },
    );
  }

  const requested =
    body.symbols && body.symbols.length
      ? market.universe.filter((s) =>
          body.symbols!.map((x) => x.toUpperCase()).includes(s.symbol),
        )
      : market.universe;
  const universe = body.limit ? requested.slice(0, body.limit) : requested;

  const startedAt = Date.now();
  const window = checkFetchWindow(market);
  const sourceCounts = { live: 0, cache: 0, stale: 0 };
  let oldestCacheTs: string | null = null;

  const cached = await getCachedContexts(market.id);

  const stocks: StockContext[] = [];
  const contextBySymbol = new Map<string, StockContext>();
  const droppedSymbols: string[] = [];
  const failureSamples: { symbol: string; error: string }[] = [];
  const missing: Stock[] = [];

  for (const s of universe) {
    const c = cached.get(s.symbol);
    if (!c) {
      missing.push(s);
      continue;
    }
    const ctx: StockContext = {
      symbol: s.symbol,
      price: c.price,
      indicators: c.indicators ?? EMPTY_INDICATORS,
    };
    stocks.push(ctx);
    contextBySymbol.set(s.symbol, ctx);
    sourceCounts.cache++;
    if (!oldestCacheTs || c.fetchedAt < oldestCacheTs) {
      oldestCacheTs = c.fetchedAt;
    }
  }

  const { fresh, deferred } = await topUpMissing(market, missing);
  for (const s of deferred) droppedSymbols.push(s.symbol);

  const toWrite: CachedPriceInput[] = [];
  for (const f of fresh) {
    if (f.context && f.price && f.history && f.indicators) {
      stocks.push(f.context);
      contextBySymbol.set(f.symbol, f.context);
      sourceCounts.live++;
      toWrite.push({
        market: market.id,
        symbol: f.symbol,
        price: f.price,
        history: f.history,
        indicators: f.indicators,
      });
    } else {
      droppedSymbols.push(f.symbol);
      if (failureSamples.length < 5 && f.error) {
        failureSamples.push({ symbol: f.symbol, error: f.error });
      }
    }
  }
  await upsertCachedPrices(toWrite);

  const fetchMs = Date.now() - startedAt;

  if (stocks.length === 0) {
    return NextResponse.json(
      {
        error: "No cached stock data to screen",
        sampleErrors: failureSamples,
        universeRequested: universe.length,
        droppedSymbols,
        hint:
          "The price cache is empty for this market. Run the ingestion job (GitHub Actions “Ingest price cache” or POST /api/ingest) to populate it, then screen again. A screen only reads the cache so it stays within Cloudflare's subrequest limit.",
      },
      { status: 502 },
    );
  }

  const aiStart = Date.now();
  let runResult;
  try {
    runResult = await runScreener(market, stocks, body.parameters);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "LLM screening call failed",
        stocksFetched: stocks.length,
      },
      { status: 502 },
    );
  }
  const aiMs = Date.now() - aiStart;

  const attachDayChange = (p: ScreenerPick): ScreenerPick => {
    const ctx = contextBySymbol.get(p.symbol);
    return ctx ? { ...p, dayChangePct: ctx.price.dayChangePct } : p;
  };
  runResult.result.topBuys = runResult.result.topBuys.map(attachDayChange);
  runResult.result.topSells = runResult.result.topSells.map(attachDayChange);

  let id: number;
  try {
    id = await saveScreenRun(
      { ...runResult.result, market: market.id },
      userId,
      market.id,
      body.parameters,
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save run" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id,
    market: market.id,
    result: runResult.result,
    debug: {
      provider: runResult.provider,
      rawResponse: runResult.rawResponse,
      preFilterBuys: runResult.preFilterBuys,
      preFilterSells: runResult.preFilterSells,
    },
    stats: {
      universeRequested: universe.length,
      stocksFetched: stocks.length,
      stocksFailed: droppedSymbols.length,
      fetchMs,
      aiMs,
      totalMs: Date.now() - startedAt,
    },
    dataSource: {
      window,
      counts: sourceCounts,
      oldestCacheAt: oldestCacheTs,
    },
    droppedSymbols,
    sampleErrors: failureSamples,
  });
}
