# Mobius-Screen — Challenge Completion Runbook

Step-by-step to finish the **Nebius Serverless AI Builders Challenge** submission.
Deadline: **2026-06-30 23:59 UTC**. None of these steps require Claude Code.

The code is done and tested. What remains is: get Nebius access → run on Nebius →
publish the repo → write the blog post → submit.

---

## Step 1 — Nebius account + API key
1. Sign in at <https://console.nebius.com> (tenant `tenant-e00f410wqzyyj0tgeq`).
2. Create an **API key** for Serverless AI / Token Factory. Copy it.
3. (For the Job/Endpoint CLI later) install the `nebius` CLI and `nebius auth login`.

## Step 2 — Pick how the LLM runs (choose ONE)
**A. Token Factory (easiest, recommended):** hosted, per-token, no GPU.
```
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
NEBIUS_API_KEY=<your key>
NEBIUS_MODEL=Qwen/Qwen3-30B-A3B-Instruct-2507
```
**B. Dedicated Serverless AI Endpoint (vLLM):**
```
bash scripts/nebius/deploy-endpoint.sh     # prints endpoint IP + AUTH_TOKEN
# then: NEBIUS_BASE_URL=http://<endpoint_ip>/v1 ; NEBIUS_API_KEY=<AUTH_TOKEN>
```
Use a smaller model (7B/32B) for a self-hosted endpoint to control GPU cost.

## Step 3 — Configure & test locally
1. `cp .env.example .env.local` and fill in `NEBIUS_*` + `TURSO_*` (+ `AUTH_*` if running the UI).
2. Smoke-test the AI path (no DB/UI needed):
   ```
   npx tsx --env-file=.env.local scripts/smoke-screener.ts
   ```
   Expect a few buys/sells printed → confirms Nebius inference works.
3. Test the batch job cheaply (3 symbols, writes to Turso):
   ```
   MARKETS=US MAX_SYMBOLS=3 npm run job
   ```

## Step 4 — Run the Serverless AI Job on Nebius  ← the eligibility run
This satisfies the "≥1 Serverless run during the window" requirement.
1. Store secrets in a Nebius MysteryBox (NEBIUS_API_KEY, TURSO_*, NEBIUS_BASE_URL, NEBIUS_MODEL).
2. Build, push, and create the job (image builds on push — no local Docker needed):
   ```
   REGISTRY=cr.<region>.nebius.cloud/<project> SECRET_ID=<secret-id> \
     bash scripts/nebius/run-job.sh
   ```
3. Watch it: `nebius ai job logs <job_id> --follow`
4. **Capture screenshots/logs** of the job (and endpoint, if used) — needed as blog evidence.

## Step 5 — (Optional) Deploy the web UI
- **Cloudflare:** set secrets via `wrangler secret put NEBIUS_API_KEY` (+ `TURSO_*`, `AUTH_*`), then `npm run deploy`.
- Or skip — the Job + Endpoint already demonstrate the Serverless usage.

## Step 6 — Publish the repo (public, no secrets)
1. Verify nothing sensitive is staged: `git status` — `.env.local`/`.dev.vars` are gitignored.
2. `LICENSE` (MIT) is present. README has setup + cost + expected output.
3. Push to a **public** GitHub repo. (Rotate `.env.local` keys if they were ever shared.)
   ```
   git add -A && git commit -m "Mobius-Screen: Nebius Serverless AI screener"
   git push
   ```

## Step 7 — Write the blog post (600+ words)
Publish on Medium / Dev / Hashnode / LinkedIn. Must:
- Link the repo.
- Be tagged **#NebiusServerlessChallenge**.
- Cover: the problem, architecture (Endpoint for live screens + Job for batch),
  why Serverless fits (bursty/batchable, no idle GPU), implementation, results,
  lessons learned. **Original narrative — not a copy of the README.**
- Include **evidence it ran on Nebius**: job logs / console screenshots / a sample screen result.
- Note approximate **runtime + cost** per run.

## Step 8 — Submit
Enter the submission via the official AI Academy form before **2026-06-30 23:59 UTC**
(repo link + blog link + optional 3–10 min video). One submission per Tenant ID.

---

## Quick reference
| Thing | Value |
|-------|-------|
| Inference | `src/lib/providers/nebius.ts` (OpenAI-compatible, Nebius only) |
| Batch Job | `jobs/batch-screen.ts` + `jobs/Dockerfile` |
| Deploy scripts | `scripts/nebius/deploy-endpoint.sh`, `scripts/nebius/run-job.sh` |
| Smoke test | `npx tsx --env-file=.env.local scripts/smoke-screener.ts` |
| Cheap job run | `MARKETS=US MAX_SYMBOLS=3 npm run job` |
| Build check | `npm run build` · `npx tsc --noEmit` |
