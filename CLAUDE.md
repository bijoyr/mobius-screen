# NSE F&O Screener — Claude Code Context

NSE F&O stock screener: Next.js + Mantine + libSQL, powered by **Nebius Serverless
AI** (Endpoints + a batch Job) for macro-thematic + Elliott Wave screening. The
LLM is reached over the OpenAI-compatible API via `NEBIUS_BASE_URL` /
`NEBIUS_API_KEY` — no proprietary AI SDK. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Quick map

- [src/app/](src/app/) — App Router pages + API routes
- [src/lib/markets.ts](src/lib/markets.ts) — **market registry**. Add new markets / stocks here.
- [src/lib/prompts.ts](src/lib/prompts.ts) — **all prompt strings**. Macro-themes per market live in markets.ts.
- [src/lib/llm.ts](src/lib/llm.ts) — **provider dispatch** + shared screen orchestration; providers in [src/lib/providers/](src/lib/providers/)
- [src/lib/](src/lib/) — rest of data layer (db, yahoo, indicators, concurrent)
- [jobs/batch-screen.ts](jobs/batch-screen.ts) — **Nebius Serverless AI Job** entrypoint (batch ingest + screen)
- [src/components/](src/components/) — Mantine UI components
- [src/types/](src/types/) — shared TS interfaces (Stock, Market, MarketId, ScreenDirection)
- [docs/](docs/) — architecture, deployment, prompt design notes
- [data/](data/) — local SQLite file (gitignored)

## Markets

Two markets supported, parameterized via [src/lib/markets.ts](src/lib/markets.ts):

| ID  | Label | Direction | Exchanges | Data source |
|-----|-------|-----------|-----------|-------------|
| `IN`  | India · NSE F&O | LONG_SHORT | NSE (`.NS` / `NSE:`) | Yahoo Finance |
| `UAE` | UAE · DFM + ADX | LONG_ONLY | DFM (`.AE` / `DFM:`), ADX (`ADX:`) | Yahoo (DFM) + TradingView scanner (ADX) |

**ADX dispatch**: Yahoo has no ADX coverage, so ADX stocks route through [src/lib/tvscan.ts](src/lib/tvscan.ts), which POSTs to `scanner.tradingview.com/uae/scan`. The scanner is undocumented and ToS-grey, but stable for personal use. It returns price + pre-computed RSI/MACD/SMA — **no OHLC bars**, so Fib levels are unavailable for ADX picks (the rest of the indicator stack works). `getStockData` in [src/lib/yahoo.ts](src/lib/yahoo.ts) dispatches by `stock.exchange`; everything downstream consumes the unified `StockDataResult` and is data-source-agnostic.

DFM coverage was verified live via `scripts/probe-uae.mjs`; ADX via `scripts/probe-adx.mjs` (both gitignored). Re-run those periodically to confirm coverage hasn't drifted.

## Screener parameters

Tunable from the UI via [ScreenerParametersPanel.tsx](src/components/ScreenerParametersPanel.tsx):

- `minRR` — risk/reward floor (default 1.8 long-short, 2.0 long-only)
- `minConviction` — drop picks below this (1-5)
- `maxPicks` — cap per side
- `strictness` — LOOSE / BALANCED / STRICT — changes how aggressively Claude rejects candidates
- `focusThemes` / `avoidThemes` — free-form text appended to the system prompt

These flow: UI state → POST body → `/api/screen` → `runScreener(market, stocks, params)` → `resolveParameters` → injected into both system and user prompt → post-filter on conviction.

Per-stock Yahoo + TradingView symbols are pre-computed in the universe definitions, so the rest of the code just reads `stock.yahooSymbol` / `stock.tvSymbol`. `findStock(bareSymbol)` resolves a ticker to its market without callers needing to know which.

## Stack snapshot

| Layer | Package | Notes |
|-------|---------|-------|
| Framework | next 16 | App Router, server components |
| UI | @mantine/core 9, mantine-datatable 9 | NOT v7 as in original plan |
| AI | `openai` SDK → Nebius Serverless AI | Default `Qwen/Qwen3-30B-A3B-Instruct-2507`; configured via `NEBIUS_BASE_URL` / `NEBIUS_API_KEY` / `NEBIUS_MODEL` |
| Data | yahoo-finance2 + TradingView scanner | NSE/DFM via Yahoo; ADX via `lib/tvscan.ts` (scanner.tradingview.com) |
| DB | better-sqlite3 | Native module — Vercel-incompatible, see DEPLOYMENT.md |
| Indicators | technicalindicators | RSI, MACD, SMA; Fib computed manually |

## Conventions

- **Imports**: use `@/*` alias (maps to `src/*`).
- **Server-only modules**: `lib/db.ts` and `lib/llm.ts` (+ `lib/providers/*`) must never be imported from client components. They rely on Node APIs / secret keys.
- **NSE tickers**: store bare symbol (e.g. `RELIANCE`) everywhere except when calling Yahoo, where `lib/yahoo.ts::toYahooSymbol` appends `.NS`.
- **LLM responses**: always parsed via `extractJson` in [lib/llm.ts](src/lib/llm.ts) — it tolerates code fences and stray prose, regardless of provider.
- **No comments**: prefer self-documenting code. Add comments only for non-obvious *why*.

## Phases

- ✅ Phase 1 — scaffold + deps + Mantine provider
- ✅ Phase 2 — data layer (db, yahoo, indicators, prompts, claude)
- ✅ Phase 3 — API routes (`/api/fo-stocks`, `/api/stock/[ticker]`, `/api/screen`, `/api/analyze/[ticker]`, `/api/watchlist`, `/api/history`, `/api/notes/[ticker]`)
- ✅ Phase 4 — UI pages (AppShell sidebar, dashboard, screener, watchlist, stock detail)
- ✅ Phase 5 — TradingView Advanced Chart widget (in `src/components/TradingViewWidget.tsx`)

Full plan: `C:\Users\bijoy\.claude\plans\eager-marinating-wolf.md`
