import { NextResponse } from "next/server";
import { getMarket, listMarkets } from "@/lib/markets";
import type { MarketId } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_MARKETS: MarketId[] = ["IN", "US", "INTL"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const marketParam = url.searchParams.get("market") as MarketId | null;

  if (marketParam) {
    if (!KNOWN_MARKETS.includes(marketParam)) {
      return NextResponse.json(
        { error: `Unknown market: ${marketParam}` },
        { status: 400 },
      );
    }
    const m = await getMarket(marketParam);
    return NextResponse.json({
      market: m.id,
      label: m.label,
      direction: m.direction,
      count: m.universe.length,
      stocks: m.universe,
    });
  }

  const all = await listMarkets();
  const markets = all.map((m) => ({
    id: m.id,
    label: m.label,
    direction: m.direction,
    count: m.universe.length,
  }));
  const allStocks = all.flatMap((m) => m.universe);
  return NextResponse.json({
    markets,
    count: allStocks.length,
    stocks: allStocks,
  });
}
