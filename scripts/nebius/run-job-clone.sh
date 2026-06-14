#!/usr/bin/env bash
# Run the batch screener as a Nebius Serverless AI Job WITHOUT building a Docker
# image — the job clones this public repo at runtime on a stock node:22 image.
# Use this when you can't build/push a container locally (e.g. no Docker).
# CPU-only + short timeout = a few cents per run.
#
# Prereqs:
#   - `nebius` CLI installed & authenticated to the tenant that owns the credits
#     (Trinfac-yva, tenant-e00f410wqzyyj0tgeq).  Docs: https://docs.nebius.com/cli
#   - A MysteryBox secret holding the job env (see SECRET_ID below) with keys:
#       NEBIUS_API_KEY, NEBIUS_BASE_URL, NEBIUS_MODEL,
#       TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
#   - A subnet id (auto-picked below if not set).
# Docs: https://docs.nebius.com/serverless/jobs/manage
set -euo pipefail

REPO="${REPO:-https://github.com/bijoyr/mobius-screen}"
JOB_NAME="${JOB_NAME:-mobius-batch-screen}"
PLATFORM="${PLATFORM:-cpu-d3}"          # adjust to an available CPU platform
PRESET="${PRESET:-4vcpu-16gb}"          # adjust to a matching CPU preset
TIMEOUT="${TIMEOUT:-30m}"
MARKETS="${MARKETS:-IN UAE}"
MAX_SYMBOLS="${MAX_SYMBOLS:-0}"          # 0 = full universe; set small for a cheap test
SECRET_ID="${SECRET_ID:?Set SECRET_ID to the MysteryBox secret holding NEBIUS_*/TURSO_*}"
SUBNET_ID="${SUBNET_ID:-$(nebius vpc subnet list --format jsonpath='{.items[0].metadata.id}')}"

# Clone the public repo, install deps, run the TS job via tsx — all at container start.
RUN_CMD="set -e; \
apt-get update -qq && apt-get install -y -qq git ca-certificates >/dev/null; \
git clone --depth 1 ${REPO} /app; cd /app; \
npm ci --no-audit --no-fund; \
npx tsx jobs/batch-screen.ts"

echo "Creating Serverless AI Job '${JOB_NAME}' (runtime clone, no image build)…"
nebius ai job create \
  --name "${JOB_NAME}" \
  --image "node:22-slim" \
  --container-command "bash" \
  --args "-lc" --args "${RUN_CMD}" \
  --platform "${PLATFORM}" \
  --preset "${PRESET}" \
  --timeout "${TIMEOUT}" \
  --env "MARKETS=${MARKETS}" \
  --env "MAX_SYMBOLS=${MAX_SYMBOLS}" \
  --env-secret "${SECRET_ID}" \
  --subnet-id "${SUBNET_ID}"

echo
echo "Follow logs:  nebius ai job logs <job_id> --follow"
echo "List jobs:    nebius ai job list"
