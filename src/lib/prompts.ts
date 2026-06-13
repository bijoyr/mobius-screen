import type { Market, ScreenerParameters, StockContext, Strictness } from "@/types";

export const DEFAULT_PARAMETERS_BUY_AND_SELL: Required<
  Pick<ScreenerParameters, "minRR" | "minConviction" | "maxPicks" | "strictness">
> = {
  minRR: 1.8,
  minConviction: 1,
  maxPicks: 5,
  strictness: "BALANCED",
};

export const DEFAULT_PARAMETERS_BUY_ONLY: Required<
  Pick<ScreenerParameters, "minRR" | "minConviction" | "maxPicks" | "strictness">
> = {
  minRR: 2,
  minConviction: 1,
  maxPicks: 5,
  strictness: "BALANCED",
};

function strictnessBehaviour(level: Strictness, maxPicks: number): string {
  switch (level) {
    case "LOOSE":
      return `STRICTNESS = LOOSE.
MANDATORY: return at least ${Math.min(3, maxPicks)} picks per applicable side. The user is screening for *candidates to research further*, not final trade signals — they need names, not perfection. Rank the universe and pick the top ${maxPicks} stocks even if their setups are imperfect. Use conviction 1-3 freely for these speculative-but-rankable picks.
Only valid reasons to return fewer than ${Math.min(3, maxPicks)}: the universe literally has under ${Math.min(3, maxPicks)} stocks, or every single stock is missing core indicator data (RSI/MACD all "n/a").`;
    case "STRICT":
      return `STRICTNESS = STRICT. Only A+ setups. All three confirmation signals must align AND the wave count must be high-confidence. Returning 0 picks is fine and expected when the market is mid-trend.`;
    case "BALANCED":
    default:
      return `STRICTNESS = BALANCED.
Aim to return at least 2 picks per applicable side. Rank candidates by setup quality, pick the top ${maxPicks}. Reserve "empty" for the rare case where the universe is genuinely flat (no near-term catalysts, all stocks mid-trend, no RSI/MACD signals).`;
  }
}

function buildFrameworkBuyAndSell(p: Required<ScreenerParameters>): string {
  return `Decision framework — score each candidate on these dimensions, then rank:

1. MACRO/THEMATIC ALIGNMENT — does the stock fit a live macro/sector theme right now?
2. ELLIOTT WAVE STRUCTURE — what's the most likely current wave count?
   - For BUYs: end of Wave 2 / Wave 4 in established uptrend, or completed Wave A/B starting a new impulse.
   - For SELLs: end of Wave 5 / Wave B retracement, broken trendline after impulse exhaustion.
3. CLASSICAL CONFIRMATION — RSI divergence/extremes, MACD cross/posture, proximity to key Fibonacci level, MA reclaim/breakdown.
4. RISK/REWARD — entry, stop, target must yield R:R >= ${p.minRR}. This is the only HARD filter; everything else is judgement.

Conviction (1-5) should reflect how strongly the four dimensions align. Use the full scale — a conviction-2 idea where the wave count is plausible and macro is supportive but technicals are mid-cycle is a valid screener output, NOT a reject.

Conviction floor: only return picks with conviction >= ${p.minConviction}.

${strictnessBehaviour(p.strictness, p.maxPicks)}`;
}

function buildFrameworkBuyOnly(p: Required<ScreenerParameters>): string {
  return `Decision framework — score each candidate on these dimensions, then rank:

1. MACRO/THEMATIC ALIGNMENT — does the stock fit a live macro/sector theme right now?
2. ELLIOTT WAVE STRUCTURE — what's the most likely current wave count? Prefer end of Wave 2 / Wave 4 in an established uptrend, or completed Wave A/B starting a new impulse. Avoid Wave 5 (late-stage) or clear corrective downtrends.
3. CLASSICAL CONFIRMATION — bullish RSI divergence, MACD bullish cross, bounce off key Fibonacci level, MA reclaim.
4. RISK/REWARD — entry, stop, target must yield R:R >= ${p.minRR}. This is the only HARD filter; everything else is judgement.

Conviction (1-5) should reflect how strongly the four dimensions align. Use the full scale.

Conviction floor: only return picks with conviction >= ${p.minConviction}.

${strictnessBehaviour(p.strictness, p.maxPicks)}

This is a LONG-ONLY screen. Do not return short ideas. \`topSells\` MUST be [].`;
}

const OUTPUT_RULES = `Output rules:
- Return ONLY valid JSON matching the EXACT schema below. No prose outside the JSON.
- conviction: integer 1-5 (5 = highest).
- thesis: 1-2 sentences. Cite the macro theme AND the wave/technical setup.
- waveCount: terse, e.g. "Wave 4 ABC complete, Wave 5 starting".
- entry/stop/target are absolute prices in the local currency. timeframe is "2-6 weeks", "1-3 months", etc.
- risks: 1-3 short bullets of what would invalidate the call.

REQUIRED JSON SHAPE (use these exact key names — NOT "buys" / "sells"):
{
  "generatedAt": "ISO timestamp",
  "macroNote": "1-2 sentence macro read",
  "topBuys": [
    {
      "symbol": "TICKER",
      "side": "BUY",
      "conviction": 1-5,
      "thesis": "...",
      "waveCount": "...",
      "entry": 0.0,
      "stop": 0.0,
      "target": 0.0,
      "timeframe": "...",
      "risks": ["...", "..."]
    }
  ],
  "topSells": [ /* same shape, side="SELL" */ ]
}`;

export function resolveParameters(
  market: Market,
  partial: ScreenerParameters | undefined,
): Required<ScreenerParameters> {
  const defaults =
    market.direction === "LONG_ONLY"
      ? DEFAULT_PARAMETERS_BUY_ONLY
      : DEFAULT_PARAMETERS_BUY_AND_SELL;
  return {
    minRR: partial?.minRR ?? defaults.minRR,
    minConviction: partial?.minConviction ?? defaults.minConviction,
    maxPicks: partial?.maxPicks ?? defaults.maxPicks,
    strictness: partial?.strictness ?? defaults.strictness,
    focusThemes: partial?.focusThemes ?? "",
    avoidThemes: partial?.avoidThemes ?? "",
    systemPromptOverride: partial?.systemPromptOverride ?? "",
  };
}

export function buildScreenerSystemPrompt(
  market: Market,
  params: Required<ScreenerParameters>,
): string {
  if (params.systemPromptOverride && params.systemPromptOverride.trim()) {
    return params.systemPromptOverride;
  }
  const persona = `You are a buy-side equities analyst covering ${market.label}.`;
  const themes = `Market context:\n${market.themePrompt}`;
  const framework =
    market.direction === "LONG_ONLY"
      ? buildFrameworkBuyOnly(params)
      : buildFrameworkBuyAndSell(params);
  const limits =
    market.direction === "LONG_ONLY"
      ? `Pick at most ${params.maxPicks} BUYs. The topSells array MUST be empty [].`
      : `Pick at most ${params.maxPicks} BUYs and ${params.maxPicks} SELLs. Quality over quantity — fewer is fine.`;
  const tuning: string[] = [];
  if (params.focusThemes.trim()) {
    tuning.push(`FOCUS / FAVOUR: ${params.focusThemes.trim()}.`);
  }
  if (params.avoidThemes.trim()) {
    tuning.push(`AVOID / DEPRIORITISE: ${params.avoidThemes.trim()}.`);
  }
  const tuningBlock = tuning.length
    ? `\n\nUser tuning hints:\n${tuning.join("\n")}`
    : "";
  return (
    [persona, themes, framework, OUTPUT_RULES, limits].join("\n\n") + tuningBlock
  );
}

export const SCREENER_RESPONSE_SCHEMA = {
  type: "object",
  required: ["generatedAt", "topBuys", "topSells", "macroNote"],
  properties: {
    generatedAt: { type: "string", description: "ISO timestamp" },
    macroNote: {
      type: "string",
      description:
        "1-2 sentence read on the current macro backdrop for the screened market.",
    },
    topBuys: { type: "array", maxItems: 5, items: { $ref: "#/$defs/pick" } },
    topSells: { type: "array", maxItems: 5, items: { $ref: "#/$defs/pick" } },
  },
  $defs: {
    pick: {
      type: "object",
      required: [
        "symbol",
        "side",
        "conviction",
        "thesis",
        "waveCount",
        "entry",
        "stop",
        "target",
        "timeframe",
        "risks",
      ],
      properties: {
        symbol: { type: "string" },
        side: { enum: ["BUY", "SELL"] },
        conviction: { type: "integer", minimum: 1, maximum: 5 },
        thesis: { type: "string" },
        waveCount: { type: "string" },
        entry: { type: "number" },
        stop: { type: "number" },
        target: { type: "number" },
        timeframe: { type: "string" },
        risks: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

export function buildScreenerUserPrompt(
  market: Market,
  stocks: StockContext[],
  params: Required<ScreenerParameters>,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const rows = stocks.map((s) => formatStockRow(s)).join("\n");
  const directionLine =
    market.direction === "LONG_ONLY"
      ? "LONG-ONLY screen. Return BUYs only. `topSells` must be []."
      : "Return BUYs and SELLs.";
  const wantBuys = Math.min(params.maxPicks, params.strictness === "STRICT" ? params.maxPicks : 3);
  const wantSells =
    market.direction === "LONG_ONLY"
      ? 0
      : Math.min(params.maxPicks, params.strictness === "STRICT" ? params.maxPicks : 3);
  const targetLine =
    params.strictness === "STRICT"
      ? "Returning 0 picks is acceptable if the framework rejects everything."
      : `Target output: at least ${wantBuys} buys${wantSells ? ` and ${wantSells} sells` : ""}. Do not return an empty result unless every stock has missing indicator data.`;
  return `Market: ${market.label}
Date: ${today}
${directionLine}
Universe: ${stocks.length} stocks with pre-computed indicators.
Constraints: R:R >= ${params.minRR}, conviction >= ${params.minConviction}, max ${params.maxPicks} per side, strictness=${params.strictness}.

${targetLine}

Pick ONLY from the symbols listed below. Do not invent tickers.

For each stock the columns are:
SYMBOL | CMP | DAY% | 52WH | 52WL | RSI14 | MACD | SIG | HIST | SMA50 | SMA200 | FIB(swingLo→swingHi @ 38.2/50/61.8)

${rows}

Apply the framework. Return JSON only.`;
}

function formatStockRow(s: StockContext): string {
  const p = s.price;
  const i = s.indicators;
  const macd = i.macd
    ? `${i.macd.macd.toFixed(2)} | ${i.macd.signal.toFixed(2)} | ${i.macd.histogram.toFixed(2)}`
    : "n/a | n/a | n/a";
  const fib = i.fib
    ? `${i.fib.swingLow}→${i.fib.swingHigh} @ ${i.fib.levels["38.2"]}/${i.fib.levels["50"]}/${i.fib.levels["61.8"]}`
    : "n/a";
  const sma50 = i.sma50 != null ? i.sma50.toFixed(2) : "n/a";
  const sma200 = i.sma200 != null ? i.sma200.toFixed(2) : "n/a";
  const rsi = i.rsi14 != null ? i.rsi14.toFixed(1) : "n/a";
  const hi = p.fiftyTwoWeekHigh ?? "n/a";
  const lo = p.fiftyTwoWeekLow ?? "n/a";
  return `${s.symbol} | ${p.cmp} | ${p.dayChangePct.toFixed(2)}% | ${hi} | ${lo} | ${rsi} | ${macd} | ${sma50} | ${sma200} | ${fib}`;
}

