import { NextResponse } from "next/server";
import {
  listWatchlist,
  upsertWatchlist,
  removeFromWatchlist,
} from "@/lib/db";
import type { WatchlistEntry } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ entries: await listWatchlist() });
}

interface UpsertBody {
  symbol: string;
  tag?: WatchlistEntry["tag"];
  notes?: string;
}

export async function POST(req: Request) {
  let body: UpsertBody;
  try {
    body = (await req.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbol = body.symbol?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const entry = await upsertWatchlist(
    symbol,
    body.tag ?? "WATCH",
    body.notes ?? "",
  );
  return NextResponse.json({ entry });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol query param is required" },
      { status: 400 },
    );
  }
  await removeFromWatchlist(symbol);
  return NextResponse.json({ ok: true, symbol });
}
