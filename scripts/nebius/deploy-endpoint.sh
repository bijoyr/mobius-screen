#!/usr/bin/env bash
# Deploy an open LLM to a Nebius Serverless AI Endpoint (vLLM, OpenAI-compatible).
#
# Prereqs: `nebius` CLI installed and authenticated, a project + subnet created.
# Docs: https://docs.nebius.com/serverless/tutorials/deploy-model
#
# After it prints the endpoint IP, point the app at it:
#   NEBIUS_BASE_URL=http://<endpoint_ip>/v1
#   NEBIUS_API_KEY=<the AUTH_TOKEN printed below>
#   NEBIUS_MODEL=<MODEL_ID below>
#
# Cost note: a 72B model needs more than one L40S. For a self-hosted endpoint
# default to a smaller Qwen2.5 (7B/32B) to keep GPU cost sane; use Token Factory
# (https://api.tokenfactory.nebius.com/v1) for full 72B at low per-token cost.
set -euo pipefail

MODEL_ID="${MODEL_ID:-Qwen/Qwen2.5-7B-Instruct}"
ENDPOINT_NAME="${ENDPOINT_NAME:-mobius-screen-llm}"
PLATFORM="${PLATFORM:-gpu-l40s-a}"
PRESET="${PRESET:-1gpu-8vcpu-32gb}"
VLLM_IMAGE="${VLLM_IMAGE:-vllm/vllm-openai:v0.18.0-cu130}"

# Reuse an existing token if provided, else generate one.
AUTH_TOKEN="${AUTH_TOKEN:-$(openssl rand -hex 32)}"

# Pick the first subnet unless SUBNET_ID is set.
SUBNET_ID="${SUBNET_ID:-$(nebius vpc subnet list --format jsonpath='{.items[0].metadata.id}')}"

echo "Deploying endpoint '$ENDPOINT_NAME' serving '$MODEL_ID' on $PLATFORM/$PRESET…"
echo "AUTH_TOKEN (save this — it is your NEBIUS_API_KEY): $AUTH_TOKEN"

nebius ai endpoint create \
  --name "$ENDPOINT_NAME" \
  --image "$VLLM_IMAGE" \
  --container-command "python3 -m vllm.entrypoints.openai.api_server" \
  --args "--model $MODEL_ID --host 0.0.0.0 --port 8000" \
  --platform "$PLATFORM" \
  --preset "$PRESET" \
  --public \
  --container-port 8000 \
  --auth token \
  --token "$AUTH_TOKEN" \
  --shm-size 16Gi \
  --subnet-id "$SUBNET_ID"

echo
echo "Once status is RUNNING, find the public IP in: nebius ai endpoint list"
echo "Then smoke-test:"
echo "  curl http://<endpoint_ip>/v1/chat/completions \\"
echo "    -H \"Authorization: Bearer $AUTH_TOKEN\" -H 'Content-Type: application/json' \\"
echo "    -d '{\"model\":\"$MODEL_ID\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}'"
