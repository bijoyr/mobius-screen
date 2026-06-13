# Deployment

Three pieces: the **LLM** (Nebius Serverless AI), the **web app** (Cloudflare or
Docker), and the **batch Job** (Nebius Serverless AI Jobs). The database is Turso
(libSQL) in all cases.

## 0. Local

```powershell
npm install
Copy-Item .env.example .env.local   # fill in NEBIUS_API_KEY, TURSO_*, AUTH_*
npm run dev                         # http://localhost:3000
npm run job                         # run the batch screener locally
```

## 1. LLM — Nebius Serverless AI

Pick one and set `NEBIUS_BASE_URL` + `NEBIUS_API_KEY` accordingly.

### A. Token Factory (hosted)
Per-token, no GPU to manage. Base URL `https://api.tokenfactory.nebius.com/v1`,
key from the Nebius console. Default `NEBIUS_MODEL=Qwen/Qwen3-30B-A3B-Instruct-2507`.

### B. Dedicated Serverless AI Endpoint (vLLM)
```bash
bash scripts/nebius/deploy-endpoint.sh   # prints endpoint IP + AUTH_TOKEN
# NEBIUS_BASE_URL=http://<endpoint_ip>/v1 ; NEBIUS_API_KEY=<AUTH_TOKEN>
```
Smoke test:
```bash
curl http://<endpoint_ip>/v1/chat/completions \
  -H "Authorization: Bearer $AUTH_TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"<MODEL>","messages":[{"role":"user","content":"ping"}]}'
```
Size the model to the GPU preset — 72B needs more than one L40S; prefer 7B/32B
self-hosted, or Token Factory for full 72B.

Docs: <https://docs.nebius.com/serverless/tutorials/deploy-model>

## 2. Database — Turso (libSQL)

1. Provision a DB at <https://turso.tech>; grab `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.
2. Schema migrates automatically on first connection ([src/lib/db.ts](../src/lib/db.ts)).
   The job and the app share the same DB, so price-cache refreshes from the job
   speed up live UI screens.

## 3. Web app

### Cloudflare (live deploy — Workers via OpenNext)
```bash
npx wrangler login
# set secrets once:
wrangler secret put NEBIUS_API_KEY
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put AUTH_SECRET
wrangler secret put AUTH_GOOGLE_ID
wrangler secret put AUTH_GOOGLE_SECRET
wrangler secret put AUTH_URL          # https://screener.trustfractals.com
wrangler secret put INGEST_SECRET
wrangler secret put DEMO_USERNAME     # shared demo login (e.g. Tintin)
wrangler secret put DEMO_PASSWORD     # e.g. Mobius9
npm run deploy
```
Non-secret vars (`NEBIUS_BASE_URL`, `NEBIUS_MODEL`, `NEXT_PUBLIC_FORMSPREE_ID`)
live in [wrangler.jsonc](../wrangler.jsonc).

**Custom domain.** [wrangler.jsonc](../wrangler.jsonc) binds the Worker to
`screener.trustfractals.com` via a `custom_domain` route — `npm run deploy`
auto-creates the DNS record + TLS cert. The zone (`trustfractals.com`) must be in
the same Cloudflare account. To change/remove the domain, edit the `routes` block.

**Google OAuth.** Add the production redirect URI to your Google OAuth client:
`https://screener.trustfractals.com/api/auth/callback/google` (must match `AUTH_URL`).

### Price-cache cron (optional — GitHub Actions)
[.github/workflows/ingest.yml](../.github/workflows/ingest.yml) refreshes the Turso
cache by calling `/api/ingest`. Set these **repo secrets** (Settings → Secrets →
Actions): `WORKER_URL=https://screener.trustfractals.com` and `INGEST_SECRET`
(must equal the Worker's `INGEST_SECRET`). Superseded by the Nebius batch Job; keep
only if you want an HTTP-driven refresh.

### Docker (portable)
```bash
docker build -t mobius-screen .
docker run --rm -p 3000:3000 --env-file .env.local mobius-screen
```
Uses Next.js `output: "standalone"` ([next.config.ts](../next.config.ts)).

## 4. Batch Job — Nebius Serverless AI Jobs

Build → push → create. Store secrets in a Nebius MysteryBox and pass via `--env-secret`.

```bash
REGISTRY=cr.<region>.nebius.cloud/<project> SECRET_ID=<secret-id> \
  bash scripts/nebius/run-job.sh
nebius ai job logs <job_id> --follow
```

The job ([jobs/batch-screen.ts](../jobs/batch-screen.ts), [jobs/Dockerfile](../jobs/Dockerfile))
is **CPU-only** — it fetches market data and calls the LLM over HTTP. For a
schedule, wrap the create call in a cron (e.g. a Nebius routine or GitHub Actions
that invokes the CLI). This run satisfies the challenge's "at least one Serverless
run" requirement — capture the logs/console screenshot for your blog post.

Docs: <https://docs.nebius.com/serverless/jobs/manage>

## Legacy ingest (optional)

The pre-Nebius cache refresh via `POST /api/ingest` + `.github/workflows/ingest.yml`
still works (guarded by `INGEST_SECRET`). The Nebius Job supersedes it; keep it
only as an HTTP fallback.

## Build verification

```bash
npm run build      # must pass (standalone output + openai dep)
npm run job        # batch path against your Nebius key + Turso DB
```
