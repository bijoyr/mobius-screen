import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listScreenHistory,
  getLatestScreen,
  getLatestScreenForMarket,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const userId = session.user.id;
  const url = new URL(req.url);
  const latest = url.searchParams.get("latest");
  const market = url.searchParams.get("market");
  if (latest != null) {
    const entry = market
      ? await getLatestScreenForMarket(userId, market)
      : await getLatestScreen(userId);
    return NextResponse.json({ entry });
  }
  const limit = Number(url.searchParams.get("limit") ?? 20);
  return NextResponse.json({ entries: await listScreenHistory(userId, limit) });
}
