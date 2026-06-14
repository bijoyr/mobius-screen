import { NextResponse } from "next/server";
import { getMarket } from "@/lib/markets";
import {
  buildScreenerSystemPrompt,
  resolveParameters,
} from "@/lib/prompts";
import type { MarketId, ScreenerParameters } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_MARKETS: MarketId[] = ["IN", "US", "INTL"];

interface Body {
  market?: MarketId;
  parameters?: ScreenerParameters;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
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
  const params = resolveParameters(market, {
    ...(body.parameters ?? {}),
    systemPromptOverride: "",
  });
  const systemPrompt = buildScreenerSystemPrompt(market, params);
  return NextResponse.json({ systemPrompt });
}
