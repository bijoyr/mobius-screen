#!/usr/bin/env bash
# Build, push, and run the batch screener as a Nebius Serverless AI Job.
#
# Prereqs: `nebius` CLI authenticated, Docker logged in to your Nebius container
# registry, and a MysteryBox secret holding the job's env (or pass --env-secret).
# Docs: https://docs.nebius.com/serverless/jobs/manage
#
# Required env:
#   REGISTRY        e.g. cr.eu-north1.nebius.cloud/<project>
#   SUBNET_ID       your VPC subnet id (or it is auto-picked below)
#   SECRET_ID       MysteryBox secret id holding NEBIUS_API_KEY/TURSO_*/etc.
set -euo pipefail

REGISTRY="${REGISTRY:?Set REGISTRY to your Nebius container registry path}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}"
IMAGE="${REGISTRY}/mobius-screen-job:${IMAGE_TAG}"
JOB_NAME="${JOB_NAME:-mobius-batch-screen}"
# CPU-only job: data fetch + LLM call over HTTP. Adjust to an available CPU preset.
PLATFORM="${PLATFORM:-cpu-d3}"
PRESET="${PRESET:-4vcpu-16gb}"
TIMEOUT="${TIMEOUT:-1h}"
MARKETS="${MARKETS:-IN US INTL}"

SUBNET_ID="${SUBNET_ID:-$(nebius vpc subnet list --format jsonpath='{.items[0].metadata.id}')}"

echo "Building $IMAGE…"
docker build -f jobs/Dockerfile -t "$IMAGE" .
echo "Pushing $IMAGE…"
docker push "$IMAGE"

echo "Creating job '$JOB_NAME'…"
# Secrets (NEBIUS_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, NEBIUS_BASE_URL,
# NEBIUS_MODEL) come from a MysteryBox secret via --env-secret.
nebius ai job create \
  --name "$JOB_NAME" \
  --image "$IMAGE" \
  --platform "$PLATFORM" \
  --preset "$PRESET" \
  --timeout "$TIMEOUT" \
  --env "MARKETS=${MARKETS}" \
  ${SECRET_ID:+--env-secret "${SECRET_ID}"} \
  --subnet-id "$SUBNET_ID"

echo
echo "Follow logs with:  nebius ai job logs <job_id> --follow"
echo "List jobs with:    nebius ai job list"
