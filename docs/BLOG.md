# Building Mobius-Screen: an AI equities screener on Nebius Serverless AI

*Tag: #NebiusServerlessChallenge · Repo: https://github.com/bijoyr/mobius-screen*

> Written for the Nebius Serverless AI Builders Challenge. Numbers and sample
> output are from a real Serverless AI Job run. Add dashboard / job-log screenshots
> for extra visual proof, then publish on Medium / Dev / Hashnode / LinkedIn.

---

## The problem

Every trading day, a discretionary equities screener has to answer one question for
a few hundred stocks: *which setups are worth a human's attention right now?* Doing
that well means fusing three very different signals — the **macro/thematic backdrop**
(rate cycles, sector rotation), **price structure** (an Elliott-Wave read of where
each name sits in its cycle), and **classical technicals** (RSI, MACD, moving
averages, Fibonacci levels). That's a reasoning task, not a formula — exactly where
an LLM helps, and exactly where pre-computed numbers keep it honest.

I built **Mobius-Screen** to do this for India's NSE F&O universe and the US S&P 500.
The interesting engineering question wasn't "can an LLM rank stocks" —
it was **how to run this cheaply and reproducibly**, given the workload is bursty
(markets are interesting for a few hours a day) and the output must be strict,
machine-readable JSON.

## The edge: reading impulse vs. corrective waves *in the making*

The heart of Mobius-Screen isn't "ask an LLM what's hot." It's a rigorous
**Elliott-Wave framework** — distilled from years of discretionary chart reading —
that the model must apply to *every* name, to catch impulse and corrective moves
**while they're still forming**, not after the move is obvious:

- **Longs** target the end of a **Wave 2 or Wave 4** pullback inside an established
  uptrend, or a completed **A–B correction** kicking off a fresh impulse.
- **Shorts** target **Wave 5 exhaustion** or a **Wave B** lower high after an impulse
  has run its course.

Every candidate is then cross-examined against a stack of confirming parameters —
**RSI divergence/extremes, MACD cross & histogram posture, proximity to key
Fibonacci retracements (38.2 / 50 / 61.8), and 50/200-day moving-average
structure** — and gated by a hard **risk/reward floor** (entry, stop and target
must clear a minimum R:R). A name only surfaces when the **wave count, the
technicals, and a live macro theme all line up**. Encoding that judgement into the
prompt is what makes the model reason like a seasoned chartist instead of guessing —
and it's why the indicators are pre-computed deterministically in TypeScript and
handed to the model as exact numbers (it reasons; it never does the arithmetic).

## Why Nebius Serverless AI

Screening is **embarrassingly batchable and mostly idle** — the worst possible fit
for an always-on GPU. That maps cleanly onto two Nebius products:

- **Token Factory** (OpenAI-compatible inference) for the live "Run Screen" path —
  pay per token, nothing to manage, **$0 when idle**.
- **Serverless AI Jobs** for the heavy lifting: a containerized, CPU-only job that
  refreshes market data and screens the whole universe on a schedule, then exits.
  No server to babysit; you pay only for the minutes it runs.

I deliberately did **not** stand up a dedicated GPU endpoint: for a bursty screener,
an hourly-billed endpoint would mostly bill for doing nothing. Serverless was the
whole point.

## Architecture

```
Browser ─▶ Next.js UI (Cloudflare Worker)
              │  POST /api/screen
              ▼
        src/lib/llm.ts ──▶ Nebius Token Factory  (Qwen3-30B-A3B-Instruct, OpenAI-compatible)
              ▲
   Nebius Serverless AI JOB ──┘   (jobs/batch-screen.ts — CPU, scheduled batch)
              │ ingest prices + indicators, screen, persist
              ▼
          Turso (libSQL)  ◀── reads ── UI
```

- **Inference**: one OpenAI-compatible call per screen to Token Factory, model
  `Qwen/Qwen3-30B-A3B-Instruct-2507` — a Mixture-of-Experts model (~3B active
  params) that's cheap and fast yet follows a strict JSON schema well.
- **Batch job**: `jobs/batch-screen.ts` loops the markets, fetches fresh prices +
  indicators (Yahoo Finance — full OHLC for all names), screens each market,
  and writes results to Turso — with per-item retry and per-market isolation.
- **Data**: a shared Turso price cache means live screens read cached indicators
  instead of re-fetching upstream every time.

## Implementation notes (the parts that actually mattered)

**1. Pre-compute the numbers; let the model reason.** RSI/MACD/SMA/Fibonacci are
computed in TypeScript and embedded in the prompt as a compact table. The model's
job is ranking + thesis writing, not arithmetic — which makes outputs repeatable and
lets me change models without touching the data pipeline.

**2. Strict JSON, with a safety net.** The request sets
`response_format: { type: "json_object" }`, and a tolerant `extractJson` parser
handles the occasional model that wraps JSON in prose or code fences.

**3. No SDK on the edge.** This was the sharpest lesson. The app runs on Cloudflare
Workers (via OpenNext), and the official OpenAI SDK failed there with a vague
`Connection error` — its Node HTTP/keep-alive transport isn't compatible with the
`workerd` runtime. The fix: drop the SDK and call Token Factory's REST endpoint with
the runtime's **native `fetch`**. It's portable across Node, workerd, and edge, and —
bonus — it surfaces *real* API errors (like a `402`) instead of a generic failure.

**4. Cost guardrails.** Output tokens are hard-capped per request, the model is a
cheap MoE, and the batch job is CPU-only. A 30-stock screen completes the LLM step
in ~24s and costs well under a cent at Token Factory pricing (~$0.10/1M input,
~$0.30/1M output) — even the full ~503-stock S&P 500 screen stays in fractions of a cent.

## Results

The Serverless AI Job runs cleanly on Nebius. Here are the actual logs from a run
screening 30 S&P 500 names (capped for a quick demo — the full universe is ~503):

```
Batch screen starting — markets: US
[US] fetching 30 symbols (capped from 503)…
[US] fresh 30, stale-cache 0, dropped 0
[US] screening 30 symbols…
[US] saved screen #6 via nebius: 5 buys, 5 sells
Batch screen finished — all markets OK.
```

- **Universe:** 503 S&P 500 (US) + 176 NSE F&O (India).
- **This run:** 30 US symbols, **0 fetch failures**.
- **Runtime:** ~60s total on a **4 vCPU / 16 GB, CPU-only** Serverless AI Job
  (~6s to pull 30 quotes+charts from Yahoo, ~24s for the LLM screen, the rest is `npm install`).
- **Cost:** the LLM call (`Qwen/Qwen3-30B-A3B-Instruct-2507`, ≈ $0.10 / $0.30 per 1M
  input/output tokens) is **well under a cent per screen**; the whole CPU job is a
  few cents. No idle GPU.
- **Sample output (screen #6):**

| Side | Ticker | Conv. | Entry | Stop | Target | Thesis (abridged) |
|------|--------|-------|-------|------|--------|-------------------|
| BUY  | AMD  | 5 | 367.33 | 345 | 546.44 | AI-capex cycle; Wave 4 ABC complete, Wave 5 starting |
| BUY  | ABNB | 4 | 135.13 | 128 | 147.25 | Travel + digital-ad recovery; Wave 4 complete |
| SELL | ADBE | 5 | 204.02 | 215 | 196.90 | Momentum exhaustion into resistance |
| SELL | AMZN | 4 | 238.55 | 247 | 196.00 | Distribution after an extended run |

> *Optional visual proof:* drop in a screenshot of the live dashboard (dark
> Blue&nbsp;Whale UI, ranked picks) and of the Nebius **Job → Logs** view above.
> Live app: https://screener.trustfractals.com

## Lessons learned

- **Match the product to the workload.** Bursty + batchable → Serverless Jobs +
  pay-per-token, not a standing GPU. The cost difference is the difference between
  "cents" and "a monthly bill."
- **The edge runtime has opinions.** Prefer native `fetch` over vendor SDKs on
  Workers/edge; it's smaller, faster to cold-start, and more honest about errors.
- **Two wallets, one tenant.** Nebius AI Cloud credits and Token Factory billing are
  separate — fund the one your inference actually uses, and watch the trial→paid
  switch.
- **Reproducibility is a feature.** Because inference is just an OpenAI-compatible
  endpoint behind one env var, anyone can clone the repo, set `NEBIUS_API_KEY`, and
  run it — including the Serverless Job, which clones the public repo at runtime so
  you don't even need a local Docker build.

## Try it

The full project — Next.js UI, the Serverless AI Job, deploy scripts, and docs — is
open-source (MIT): **https://github.com/bijoyr/mobius-screen**. Setup is one
`.env`, one `npm run dev`, and a Nebius key.

*Not investment advice — outputs are research candidates, not signals.*

`#NebiusServerlessChallenge`
