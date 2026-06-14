# Mobius-Screen — AI equities screener on Nebius Serverless AI

An open, reproducible stock screener that ranks an F&O / equities universe by
combining **macro-thematic context + Elliott-Wave structure + classical
technicals** and asks an LLM to produce ranked, risk/reward-gated trade ideas as
strict JSON. Inference runs on **Nebius Serverless AI** — a hosted/dedicated
**Endpoint** for live screens, and a containerized **Serverless AI Job** for
batch ingest + screening.

> Built for the **Nebius Serverless AI Builders Challenge**. Blog post tag:
> `#NebiusServerlessChallenge`.

## Why Serverless AI fits this problem

Screening is **bursty and embarrassingly batchable**. A market is interesting for
a few hours a day; the rest of the time you want zero idle GPU cost. Two Nebius
products map cleanly onto the two access patterns:

- **Serverless AI Endpoints** — an OpenAI-compatible LLM endpoint backs the live
  "Screen now" button in the UI. Pay for inference, not idle capacity.
- **Serverless AI Jobs** — a one-off/scheduled container refreshes the price
  cache for the whole universe and runs the screener end-to-end, with per-item
  retry and per-market isolation. Exactly the batch shape Jobs are built for.

## Architecture

```
  Browser ──▶ Next.js UI (Cloudflare or Docker)
                 │  POST /api/screen
                 ▼
        src/lib/llm.ts  ──selects provider──▶  Nebius Serverless AI Endpoint
                 ▲                              (OpenAI-compatible /v1, Qwen2.5)
                 │                                       ▲
   Nebius Serverless AI JOB ───────────────────────────┘  (batch screens)
   (jobs/batch-screen.ts)
                 │  ingest prices + indicators
                 ▼
            Turso (libSQL)  ◀── reads ── Next.js UI
```

- **Provider:** [src/lib/llm.ts](src/lib/llm.ts) talks to Nebius via the
  [`nebius`](src/lib/providers/nebius.ts) OpenAI-compatible `ChatProvider`. Because
  it's configured purely by `NEBIUS_BASE_URL` + `NEBIUS_API_KEY`, you can point it
  at a dedicated Serverless AI Endpoint, Token Factory, or any OpenAI-compatible
  server with no code change. No proprietary AI SDK is used.
- **Data:** `yahoo-finance2` (NSE + US S&P 500, full OHLC); RSI/MACD/SMA
  via `technicalindicators`, Fibonacci computed manually.

## Quick start (local)

```bash
npm install
cp .env.example .env.local      # fill in NEBIUS_API_KEY, TURSO_*, AUTH_*
npm run dev                     # http://localhost:3000
```

The screener needs a populated price cache. Either run a screen (it tops up
missing symbols live) or run the batch job once: `npm run job`.

## Using Nebius Serverless AI

### Option A — Token Factory (hosted, recommended for cost/repro)
No GPU to manage; pay per token. Get a key from the Nebius console, then set:

```bash
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_API_KEY=...          # your Nebius key
NEBIUS_MODEL=Qwen/Qwen3-30B-A3B-Instruct-2507
```

### Option B — dedicated Serverless AI Endpoint (vLLM)
Deploy your own model endpoint and point the app at it:

```bash
bash scripts/nebius/deploy-endpoint.sh        # prints endpoint IP + AUTH_TOKEN
# then:
NEBIUS_BASE_URL=http://<endpoint_ip>/v1
NEBIUS_API_KEY=<AUTH_TOKEN>
NEBIUS_MODEL=Qwen/Qwen2.5-7B-Instruct         # size to your GPU preset
```

> **Cost note:** large dense models need multiple GPUs on a self-hosted endpoint.
> Use a small/MoE model for Option B, or Token Factory (per-token, no GPU to manage)
> for the default `Qwen3-30B-A3B-Instruct` at very low cost.

### Run the batch Serverless AI Job

```bash
# cheap local test run — 3 symbols, one market (uses your .env.local)
MARKETS=US MAX_SYMBOLS=3 npm run job
# full run
npm run job

# on Nebius (build → push → create job)
REGISTRY=cr.<region>.nebius.cloud/<project> SECRET_ID=<mysterybox-secret> \
  bash scripts/nebius/run-job.sh
nebius ai job logs <job_id> --follow
```

## Run with Docker

```bash
docker build -t mobius-screen .
docker run --rm -p 3000:3000 --env-file .env.local mobius-screen
```

## Configuration

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NEBIUS_BASE_URL` | yes | Token Factory `/v1` | or `http://<endpoint_ip>/v1` |
| `NEBIUS_API_KEY` | yes | — | Nebius key or endpoint token |
| `NEBIUS_MODEL` | no | `Qwen/Qwen3-30B-A3B-Instruct-2507` | any served model |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | yes | — | libSQL DB |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL` | yes | — | Google sign-in |
| `MARKETS` | job | `IN US INTL` | markets the job screens |
| `MAX_SYMBOLS` | job | `0` | cap symbols/market (`0`=all); set small for a cheap test |
| `BATCH_USER_ID` | job | `batch` | owner of job-written screens |

Full deploy details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Hardware & runtime

- **App / Job container:** CPU only (data fetch + LLM call are HTTP). A full-universe
  job run is dominated by upstream data latency + one LLM call per market.
- **Endpoint (Option B):** GPU (e.g. `gpu-l40s-a` / `1gpu-8vcpu-32gb`), sized to the model.
- **Approx cost:** Token Factory inference is a few cents per screen at 72B; a
  self-hosted endpoint bills GPU-time while running. Record your measured numbers
  in your blog post (judges expect a cost figure).

## Expected output

`POST /api/screen` (and each job market) returns ranked picks:

```json
{
  "generatedAt": "2026-06-08T09:30:00.000Z",
  "macroNote": "Rate-cut tailwind for rate-sensitives; metals cooling.",
  "topBuys": [
    {
      "symbol": "RELIANCE", "side": "BUY", "conviction": 4,
      "thesis": "Energy/retail theme intact; Wave-4 ABC complete.",
      "waveCount": "Wave 4 ABC complete, Wave 5 starting",
      "entry": 1450, "stop": 1390, "target": 1620,
      "timeframe": "1-3 months", "risks": ["Loses 1390 support"]
    }
  ],
  "topSells": []
}
```

## Project map

| Path | What |
|------|------|
| [src/lib/llm.ts](src/lib/llm.ts) | provider dispatch + shared screen orchestration |
| [src/lib/providers/](src/lib/providers/) | `nebius` OpenAI-compatible provider |
| [src/lib/prompts.ts](src/lib/prompts.ts) | system/user prompts + JSON schema |
| [src/lib/markets.ts](src/lib/markets.ts) | market registry (add markets/stocks here) |
| [jobs/batch-screen.ts](jobs/batch-screen.ts) | Serverless AI Job entrypoint |
| [jobs/Dockerfile](jobs/Dockerfile) · [Dockerfile](Dockerfile) | job image · app image |
| [scripts/nebius/](scripts/nebius/) | endpoint deploy + job run scripts |

## License

[MIT](LICENSE). Not investment advice — outputs are research candidates, not signals.
