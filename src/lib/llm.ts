import type {
  Market,
  ScreenerParameters,
  ScreenerResult,
  StockContext,
} from "@/types";
import {
  buildScreenerSystemPrompt,
  buildScreenerUserPrompt,
  resolveParameters,
} from "./prompts";
import { nebiusProvider } from "./providers/nebius";

/**
 * A chat provider returns the raw assistant text for a (system, user) prompt
 * pair. Everything provider-specific (SDK, base URL, auth) lives behind this;
 * the screening orchestration below is shared.
 *
 * The app talks to Nebius Serverless AI over the OpenAI-compatible API. Because
 * the provider is configured purely by `NEBIUS_BASE_URL` + `NEBIUS_API_KEY`, you
 * can point it at a dedicated Serverless AI Endpoint, Token Factory, or any other
 * OpenAI-compatible server — no code change and no proprietary SDK.
 */
export interface ChatProvider {
  name: string;
  complete(opts: {
    system: string;
    user: string;
    maxTokens?: number;
  }): Promise<string>;
}

function extractJson<T = unknown>(raw: string): T {
  // Try fenced ```json first, then bare braces. Try greedy-to-last-brace,
  // then progressively shorter slices if JSON.parse fails (handles trailing prose).
  const candidates: string[] = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1]);
  candidates.push(raw);

  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    if (start === -1) continue;
    // Try the largest possible JSON object first; if it fails, walk back.
    let end = candidate.lastIndexOf("}");
    while (end > start) {
      const slice = candidate.slice(start, end + 1);
      try {
        return JSON.parse(slice) as T;
      } catch {
        // try shorter
        end = candidate.lastIndexOf("}", end - 1);
      }
    }
  }
  throw new Error("Model response contained no parseable JSON object");
}

export interface ScreenerRunResult {
  result: ScreenerResult;
  /** Raw model text response for debugging — surfaced in /api/screen response. */
  rawResponse: string;
  /** Provider that produced this run (e.g. "nebius"). */
  provider: string;
  /** Counts before post-filter, useful for understanding what was dropped. */
  preFilterBuys: number;
  preFilterSells: number;
}

export async function runScreener(
  market: Market,
  stocks: StockContext[],
  rawParams: ScreenerParameters | undefined,
): Promise<ScreenerRunResult> {
  const params = resolveParameters(market, rawParams);
  const provider = nebiusProvider;

  const text = await provider.complete({
    system: buildScreenerSystemPrompt(market, params),
    user: buildScreenerUserPrompt(market, stocks, params),
    maxTokens: 4096,
  });

  const parsed = extractJson<ScreenerResult & { buys?: unknown; sells?: unknown }>(
    text,
  );
  if (!parsed.generatedAt) parsed.generatedAt = new Date().toISOString();

  // Accept both `topBuys`/`topSells` and the common slip `buys`/`sells`.
  const rawBuys = ((parsed.topBuys ?? parsed.buys ?? []) as ScreenerResult["topBuys"]).map(
    (p) => ({ ...p, side: "BUY" as const }),
  );
  const rawSells = ((parsed.topSells ?? parsed.sells ?? []) as ScreenerResult["topSells"]).map(
    (p) => ({ ...p, side: "SELL" as const }),
  );
  parsed.topBuys = rawBuys
    .filter((p) => p.conviction >= params.minConviction)
    .slice(0, params.maxPicks);
  parsed.topSells = rawSells
    .filter((p) => p.conviction >= params.minConviction)
    .slice(0, params.maxPicks);
  if (market.direction === "LONG_ONLY") parsed.topSells = [];

  return {
    result: parsed,
    rawResponse: text,
    provider: provider.name,
    preFilterBuys: rawBuys.length,
    preFilterSells: rawSells.length,
  };
}
