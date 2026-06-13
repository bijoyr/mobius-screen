# Architecture

## Goals

1. **Personal tool.** Runs on Bijoy's PC via `npm run dev`. No auth, no multi-tenancy.
2. **AI as analyst, not data fetcher.** We pre-compute indicators from real Yahoo data and embed them in the prompt. Claude ranks and reasons; it does not invent numbers.
3. **Vercel-portable.** Code should deploy to Vercel with only the DB layer swapped (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│  Browser  ──  Next.js App Router pages (Mantine UI)          │
└────────────────────────────┬─────────────────────────────────┘
                             │ fetch (same-origin)
┌────────────────────────────▼─────────────────────────────────┐
│  /api/* route handlers      (Node.js runtime, server-only)   │
└────┬───────────────┬───────────────┬───────────────┬─────────┘
     │               │               │               │
┌────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
│ lib/db   │   │ lib/yahoo │   │ lib/      │   │ lib/      │
│ (sqlite) │   │ (NSE px)  │   │ indicators│   │ claude    │
└──────────┘   └───────────┘   └───────────┘   └───────────┘
```

## Data flow: screener run

```
User clicks "Run Screen"
  → POST /api/screen
  → fo-stocks list                  (api/fo-stocks)
  → For each: fetchQuote + fetchHistory  (lib/yahoo)
  → computeIndicators                (lib/indicators)
  → buildScreenerUserPrompt          (lib/prompts) — embeds REAL numbers
  → provider.complete                (lib/llm → providers/nebius, OpenAI-compatible)
  → extractJson → ScreenerResult
  → saveScreenResult                 (lib/db)
  → JSON back to client
  → Mantine DataTables render top buys / sells
```

The single-stock "Analyze" button on `/stock/[ticker]` follows the same path with `analyzeStock` instead of `runScreener`.

## Why pre-computed indicators?

Claude is excellent at *reasoning over* numbers but unreliable at *calculating* them. Pre-computing RSI/MACD/Fib in JS via the `technicalindicators` library means:

- The prompt contains exact, repeatable values.
- Claude's role is ranking + thesis writing, not arithmetic.
- We can change the prompt (or model) without changing the data pipeline.

## Why SQLite locally

- Zero config — file-based, no server.
- Watchlist + screen history + notes all fit comfortably.
- `WAL` mode means the dev server can read while a request is writing.

For Vercel, SQLite must be replaced with Turso (libSQL — same SQL, hosted) or Vercel Postgres. The `lib/db.ts` interface is the only file that would change.

## Mantine v9 (not v7)

The original plan listed v7. npm resolved to v9 at install time. APIs are compatible for what we need — `MantineProvider`, `ColorSchemeScript`, `mantineHtmlProps`, `Notifications` — but watch for any v7→v9 prop renames if you copy code from Mantine v7 docs.

## Server-only boundaries

These modules import Node-only APIs or read secrets — they must **never** be imported from a `"use client"` file:

- [src/lib/db.ts](../src/lib/db.ts) — `better-sqlite3`, fs
- [src/lib/llm.ts](../src/lib/llm.ts) + [src/lib/providers/](../src/lib/providers/) — read `NEBIUS_API_KEY`
- [src/lib/yahoo.ts](../src/lib/yahoo.ts) — calls external Yahoo API

The pattern: client components fetch from `/api/*` routes, which import these libs server-side.
