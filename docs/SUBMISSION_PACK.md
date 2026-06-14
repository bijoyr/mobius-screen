# Mobius-Screen — Nebius Serverless AI Builders Challenge · Submission Pack

Everything needed to submit, in one place. Deadline: **2026-06-30 23:59 UTC**.
Domain: **AI & ML**. Tag: **#NebiusServerlessChallenge**.

---

## 1. At a glance
**Mobius-Screen** — an open-source AI equities screener that finds Elliott-Wave
impulse/corrective setups *early* across global indexes, blending real-time market
developments with technical breaches and wave counts. Inference runs on **Nebius
Token Factory**; a CPU-only **Nebius Serverless AI Job** batch-screens the universe.

| Item | Link |
|------|------|
| **Live app** | https://screener.trustfractals.com  (demo login: `Tintin` / `Mobius9`) |
| **GitHub repo (public, MIT)** | https://github.com/bijoyr/mobius-screen |
| **Project site (GitHub Pages)** | https://bijoyr.github.io/mobius-screen/ |
| **Blog (rendered)** | https://bijoyr.github.io/mobius-screen/BLOG.html  ·  source: `docs/BLOG.md` |
| **Promo video (MP4)** | `video/out/mobius-promo.mp4` → upload to YouTube/Loom, paste URL below |

---

## 2. Submission-form answers (copy-paste)

- **Name / team name:** `Bijoy R` *(or `Trinfac`)*
- **Job title:** *(pick the closest in the dropdown — e.g. Founder / Software Engineer / Data Scientist)*
- **Domain category:** **AI & ML**
- **GitHub repository URL:** `https://github.com/bijoyr/mobius-screen`
- **Blog post URL:** `https://bijoyr.github.io/mobius-screen/BLOG.html` *(or your Medium/Dev URL)*
- **PDF export of blog post:** export from the blog page → **Ctrl+P → Save as PDF** (≤20 MB)
- **Video link (optional):** `__________` *(YouTube/Loom URL after upload)*

**Short summary (87 words — ≤100):**
> Mobius-Screen is an open-source AI equities screener that hunts Elliott-Wave impulse
> and corrective moves *as they form* — Wave 2/4 entries, Wave 5 exhaustion — confirmed
> by a deep technical stack (RSI divergence, MACD posture, Fibonacci retracements,
> moving-average structure) and live macro themes, then risk/reward-gated into ranked
> trade ideas. It screens the S&P 500 and India's NSE F&O. Inference runs on Nebius
> Token Factory; a CPU-only Nebius Serverless AI Job batch-screens the whole universe
> and persists results — no idle GPU, pennies per run, fully reproducible from one API key.

---

## 3. Nebius usage & evidence
- **Serverless AI Job** `mobius-batch-screen` (CPU-only, `cpu-d3`, 4 vCPU / 16 GB) ran
  end-to-end on Nebius: clones the public repo, screens the market, persists results.
  - Log evidence: `[US] fresh 30 … [US] saved screen #6 via nebius: 5 buys, 5 sells …
    Batch screen finished — all markets OK.`
  - DB-verified: US price cache = 30, `screen_history #6` (e.g. BUY AMD conv 5; SELL ADBE).
- **Token Factory inference:** model `Qwen/Qwen3-30B-A3B-Instruct-2507`
  (OpenAI-compatible REST via native fetch — no SDK; works on Cloudflare workerd).
- **Tenant:** Trinfac-yva · `tenant-e00f410wqzyyj0tgeq`.
- **Runtime / cost:** job ~60s; a screen ≈ **$0.002–0.003** (≈$0.10/1M in, $0.30/1M out);
  no idle GPU. (Capture a screenshot of the **Job → Logs** for the blog/video.)

---

## 4. Asset inventory (all in the repo)
| Asset | Path |
|------|------|
| App (Next.js + Serverless Job) | `src/`, `jobs/batch-screen.ts` |
| README (setup, hardware, cost, expected output) | `README.md` |
| Deployment runbook | `docs/DEPLOYMENT.md` |
| Blog (complete) | `docs/BLOG.md` · `docs/BLOG.html` |
| Video (Remotion source + MP4) | `video/` · `video/out/mobius-promo.mp4` |
| Video brief & script | `docs/VIDEO_BRIEF.md` · `docs/VIDEO_SCRIPT.md` |
| Nebius deploy scripts | `scripts/nebius/` |
| Simple step-by-step | `NEXT_STEPS.md` |
| License (MIT) | `LICENSE` |

---

## 5. Eligibility checklist (vs. official rules)
- [x] **Public repo** with code using Nebius Serverless AI (Job + Token Factory).
- [x] **Dockerfile / public image** (`Dockerfile`, `jobs/Dockerfile`; job also runs via public `node:22` image).
- [x] **README**: architecture, step-by-step setup, hardware/preset, expected outputs, runtime/cost.
- [x] **OSI license** (MIT).
- [x] **No committed secrets** (gitignored `.env.local`/`.claude`; verified).
- [x] **≥1 Serverless run** during the window (Job screen #6, verified).
- [x] **Blog ≥600 words**, original narrative, tagged `#NebiusServerlessChallenge`, links repo, includes Nebius run evidence + cost.
- [ ] **Blog published** (publish on Medium/Dev or use the Pages URL) + **PDF exported**.
- [ ] **Video uploaded** (optional) and URL added.
- [ ] **Submitted** via the AI Academy form (one entry per Tenant ID).

---

## 6. Final actions before hitting Submit
1. 🔴 **Rotate the Nebius API key** (it was shared in chat): Token Factory → new key →
   update `.env.local` + `wrangler secret put NEBIUS_API_KEY`.
2. **Export the blog to PDF** (Ctrl+P → Save as PDF from the blog page).
3. **(Optional)** Upload `video/out/mobius-promo.mp4` to YouTube/Loom → paste the link in §2.
4. **Publish the blog** (Medium/Dev or keep the Pages URL).
5. **Fill the form** with §2 → **Submit before 2026-06-30 23:59 UTC**.

*Not investment advice — outputs are research candidates, not signals.*
