# Next Steps to Finish (simple checklist)

The app is built, live, and working. To complete the Nebius challenge submission,
do these in order. Deadline: **June 30, 2026**.

### 1. Run the Serverless Job on Nebius (the required "Serverless run")
- Go to **console.nebius.com → AI Services → Jobs → Create job** (tenant: Trinfac-yva).
- **Image:** `docker.io/library/node:22-slim`
- **Entrypoint command:**
  ```
  apt-get update -qq && apt-get install -y -qq git ca-certificates >/dev/null && git clone --depth 1 https://github.com/bijoyr/mobius-screen /app && cd /app && npm ci --no-audit --no-fund && npx tsx jobs/batch-screen.ts
  ```
- **Env vars:** `MARKETS=US`, `MAX_SYMBOLS=10`, `NEBIUS_BASE_URL`, `NEBIUS_MODEL`, `NEBIUS_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (real values).
- **Resources:** Without GPU, smallest CPU preset, timeout 1h.
- Run it → open **Logs** → **take a screenshot** of the successful run.

### 2. Redeploy the website
- In a terminal: `cd mobius-screen/mobius-screen` then `npm run deploy`
- Open https://screener.trustfractals.com and check the **US · S&P 500** market works.

### 3. Take screenshots for the blog
- The dashboard with US picks (buys/sells).
- The Nebius Job logs from Step 1.

### 4. Finish the blog post
- Open `docs/BLOG.md`, replace every `[SCREENSHOT]` and `[NUMBER]` placeholder.
- Publish on Medium / Dev / LinkedIn. Tag it **#NebiusServerlessChallenge** and link the repo.

### 5. Submit
- Submit the **repo link + blog link** on the Nebius AI Academy form before **June 30**.

---

### Housekeeping (do once, anytime)
- Rotate the **Turso** auth token (it sat in local config) and update `.env.local`.
- Rotate the **Nebius** API key (it was shared in chat) and update `.env.local` + `npx wrangler secret put NEBIUS_API_KEY`.

Demo login to share with people: **Username `Tintin` · Password `Mobius9`**.
