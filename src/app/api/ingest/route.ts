import { NextResponse } from "next/server";
import { getMarket } from "@/lib/markets";
import { fetchFreshData } from "@/lib/yahoo";
import { mapConcurrent } from "@/lib/concurrent";
import { upsertCachedPrices, type CachedPriceInput } from "@/lib/db";
import type { Candle, IndicatorBundle, MarketId, PriceSnapshot, Stock } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Cache-refresh worker. Each POST processes ONE bounded slice of a market's
// universe and is a separate Cloudflare invocation with its own 50-subrequest
// budget. A Yahoo fetch is 2 upstream subrequests (quote + chart), so the
// worst case is count*2 fetches + 1 batched write (+ a one-time ~6 for schema
// migration on a cold isolate). count is capped at 16 → <= 39 subrequests.
// The whole universe is covered by looping offset from an uncapped orchestrator
// (GitHub Actions), so no single invocation ever approaches the cap.
const KNOWN_MARKETS: MarketId[] = ["IN", "US", "INTL"];
const DEFAULT_COUNT = 12;
const MAX_COUNT = 16;
const YAHOO_CONCURRENCY = 8;

interface IngestBody {
  market?: MarketId;
  offset?: number;
  count?: number;
}

interface Fetched {
  symbol: string;
  ok: boolean;
  price?: PriceSnapshot;
  history?: Candle[];
  indicators?: IndicatorBundle;
  error?: string;
}

async function fetchOne(s: Stock): Promise<Fetched> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { price, history, indicators } = await fetchFreshData(s, 250);
      return { symbol: s.symbol, ok: true, price, history, indicators };
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      return {
        symbol: s.symbol,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  return { symbol: s.symbol, ok: false, error: "unreachable" };
}

export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "INGEST_SECRET is not configured on the server" },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IngestBody = {};
  try {
    body = (await req.json()) as IngestBody;
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
  const universeSize = market.universe.length;

  const offset = Math.max(0, Math.trunc(body.offset ?? 0));
  const count = Math.min(MAX_COUNT, Math.max(1, Math.trunc(body.count ?? DEFAULT_COUNT)));
  const slice = market.universe.slice(offset, offset + count);
  const nextOffset = offset + count;
  const done = nextOffset >= universeSize;

  if (slice.length === 0) {
    return NextResponse.json({
      market: marketId,
      offset,
      count,
      universeSize,
      fetched: 0,
      failed: 0,
      nextOffset,
      done: true,
    });
  }

  const batch = await mapConcurrent(slice, YAHOO_CONCURRENCY, fetchOne);
  const results = batch.results.filter((r): r is Fetched => r != null);

  const toWrite: CachedPriceInput[] = [];
  const failures: { symbol: string; error: string }[] = [];
  for (const r of results) {
    if (r.ok && r.price && r.history && r.indicators) {
      toWrite.push({
        market: marketId,
        symbol: r.symbol,
        price: r.price,
        history: r.history,
        indicators: r.indicators,
      });
    } else {
      failures.push({ symbol: r.symbol, error: r.error ?? "unknown" });
    }
  }
  await upsertCachedPrices(toWrite);

  return NextResponse.json({
    market: marketId,
    offset,
    count,
    universeSize,
    fetched: toWrite.length,
    failed: failures.length,
    failures: failures.slice(0, 5),
    nextOffset,
    done,
  });
}
