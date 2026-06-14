# Prompt Design

## Where to edit

Single file: [src/lib/prompts.ts](../src/lib/prompts.ts).

| What you want to change | Edit |
|-------------------------|------|
| Framework / persona / output rules for the screener | `FRAMEWORK_BUY_AND_SELL`, `FRAMEWORK_BUY_ONLY`, `OUTPUT_RULES`, assembled by `buildScreenerSystemPrompt(market)` |
| Per-market macro themes (sectors, FX, flows) | `Market.themePrompt` in [src/lib/markets.ts](../src/lib/markets.ts) |
| The data table format Claude reads per stock | `buildScreenerUserPrompt` / `formatStockRow` |
| Single-stock "Analyze" prompt | `buildSingleStockSystemPrompt`, `buildSingleStockPrompt` |
| JSON shape Claude must return | `SCREENER_RESPONSE_SCHEMA`, `SINGLE_STOCK_RESPONSE_SCHEMA` |

Two ready-made framework variants:
- `FRAMEWORK_BUY_AND_SELL` — used for `LONG_SHORT` markets (India).
- `FRAMEWORK_BUY_ONLY` — used for `LONG_ONLY` markets (the INTL watchlist). Requires R:R ≥ 2 and forbids short ideas.

To add a new market, add it to `MARKETS` in [markets.ts](../src/lib/markets.ts) with a `themePrompt` describing its macro drivers — the prompt-builder will pick it up automatically.

## Screener prompt — design choices

Defined in [src/lib/prompts.ts](../src/lib/prompts.ts).

### System prompt principles

1. **Persona**: "buy-side equities analyst" — tilts Claude toward decisive picks with theses, not academic hedging.
2. **Ordered framework**: Macro → Wave → Confirmation → Risk/Reward. Each step has a reject-clause so Claude prunes weak candidates instead of forcing 5 picks.
3. **R:R floor**: Hardcoded ≥ 1.8. Claude is allowed to return fewer than 5 picks if quality is low.
4. **JSON-only output**: explicit instruction + `extractJson` tolerance in [lib/llm.ts](../src/lib/llm.ts) (handles code fences, stray prose), plus `response_format: json_object` on the Nebius path.

### User prompt — data table format

We embed a compact pipe-delimited table:

```
SYMBOL | CMP | DAY% | 52WH | 52WL | RSI14 | MACD | SIG | HIST | SMA50 | SMA200 | FIB(...)
```

Why a custom table, not JSON?

- ~3-4× fewer tokens than `JSON.stringify` of the same data.
- Visually scannable in case we want to log/inspect a prompt.
- Column order is fixed, so Claude doesn't need to parse field names every row.

### Single-stock prompt

Embeds raw `{price, indicators}` JSON because the output is richer (separate `macro`, `waveCount`, `technical` fields) and one stock = no token pressure.

## When to tune

- **Picks feel generic / repeat the same names**: tighten the "macro alignment" wording — name specific themes you want considered (e.g. "rate-sensitive financials", "domestic capex").
- **JSON parse errors**: add an explicit example in the system prompt and bump `max_tokens`.
- **Hallucinated tickers**: Claude is choosing from the universe you passed in. If it invents a name, the prompt likely doesn't make the universe explicit enough — add "Pick ONLY from the symbols listed below" to the user prompt.

## Model choice

Default: `Qwen/Qwen3-30B-A3B-Instruct-2507` on Nebius — an MoE model (~3B active
params) with strong structured-JSON adherence at very low per-token cost. Override
per env:

```
NEBIUS_MODEL=meta-llama/Llama-3.3-70B-Instruct
```

A smaller model (7B/32B) is cheaper/faster and fine for quick runs; the 72B's deeper
reasoning is worth it for full-universe ranking. Any model served by your
`NEBIUS_BASE_URL` works.
