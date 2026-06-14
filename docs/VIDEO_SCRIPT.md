# Mobius-Screen — 3-minute video walkthrough script

Optional but recommended for the Nebius challenge. Record with Loom/OBS; screen-share
the app + the Nebius console. ~450 words spoken ≈ 3 min. `[SHOW: …]` = what's on screen.

---

**0:00 — Hook (the problem)**
[SHOW: the Mobius-Screen dashboard, dark UI]
"Every trading day, a screener has to answer one question across hundreds of stocks:
which setups actually deserve attention right now? This is Mobius-Screen — an
open-source AI equities screener that answers it by combining Elliott-Wave structure,
classical technicals, and live macro themes — and it runs entirely on Nebius
Serverless AI."

**0:25 — The edge: Elliott Wave**
[SHOW: a results row with its thesis + wave count expanded]
"The core isn't 'ask an LLM what's hot.' It's a strict Elliott-Wave framework built
from years of chart reading. For longs, it looks for the end of a Wave 2 or Wave 4
pullback, or a completed A–B correction starting a new impulse. For shorts, Wave 5
exhaustion or a Wave B lower high. The aim is to catch impulse and corrective moves
while they're still forming — not after."

**0:55 — Confirmation stack**
[SHOW: the indicator columns / a pick's entry-stop-target]
"Every candidate is cross-examined against RSI divergence, MACD posture, Fibonacci
retracements, and moving-average structure, then gated by a hard risk/reward floor.
A name only surfaces when the wave count, the technicals, and a macro theme all line
up. The indicators are computed deterministically in code and handed to the model as
exact numbers — it reasons, it never does the math."

**1:25 — Why Nebius Serverless**
[SHOW: Nebius console — Token Factory + the Job]
"Screening is bursty and batchable — the worst fit for an always-on GPU. So inference
runs on Nebius Token Factory, pay-per-token, zero idle cost. And the heavy lifting is
a CPU-only Nebius Serverless AI Job that fetches data, screens the whole universe, and
saves the results — then exits. No servers to babysit."

**1:55 — Demo: the Serverless Job**
[SHOW: Nebius → Jobs → the completed job → Logs]
"Here's a real run. The Job clones the repo, screens 30 S&P 500 names, and saves the
result — 'five buys, five sells, all markets OK' — in about a minute, for a few cents."

**2:25 — Demo: live app**
[SHOW: click Run Screen on the live site, picks render]
"And here it is live — ranked buys and sells with entry, stop, target, conviction, and
the wave thesis for each."

**2:45 — Close**
[SHOW: the GitHub repo]
"Cheap, reproducible, and fully open-source — clone it, add one Nebius key, and run it
yourself. That's Mobius-Screen, powered by Nebius AI. Thanks for watching."

---

Tips: keep it under 3 min; lead with the dashboard; make sure the Nebius Job logs and
a live screen are both on camera (that's the product proof judges look for).
