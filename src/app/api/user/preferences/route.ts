import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPreferences, upsertUserPreferences } from "@/lib/db";
import type { MarketId } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_MARKETS: MarketId[] = ["IN", "US", "INTL"];

function isMarketId(v: unknown): v is MarketId {
  return typeof v === "string" && KNOWN_MARKETS.includes(v as MarketId);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const market = new URL(req.url).searchParams.get("market");
  if (!isMarketId(market)) {
    return NextResponse.json(
      { error: "Missing or invalid 'market' query param" },
      { status: 400 },
    );
  }
  const params = await getUserPreferences(session.user.id, market);
  return NextResponse.json({ params });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let body: { market?: unknown; params?: unknown };
  try {
    body = (await req.json()) as { market?: unknown; params?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isMarketId(body.market)) {
    return NextResponse.json(
      { error: "Body must include 'market' of IN | US | INTL" },
      { status: 400 },
    );
  }
  if (!body.params || typeof body.params !== "object") {
    return NextResponse.json(
      { error: "Body must include 'params' object" },
      { status: 400 },
    );
  }
  await upsertUserPreferences(session.user.id, body.market, body.params);
  return NextResponse.json({ ok: true });
}
