# Nebius Serverless AI Job image — batch ingest + screen.
# Build:  docker build -f jobs/Dockerfile -t mobius-screen-job:latest .
# Run:    docker run --rm --env-file .env mobius-screen-job:latest
# Deploy: see scripts/nebius/run-job.sh  (nebius ai job create ...)
#
# CPU-only: the job fetches market data over HTTP and calls the LLM over HTTP —
# no GPU is needed in the job itself (the GPU lives behind the Nebius Endpoint).
FROM node:20-slim

WORKDIR /app

# Install deps first for layer caching. tsx (a devDependency) runs the TS job
# directly, resolving the "@/*" tsconfig path alias at runtime.
COPY package.json package-lock.json ./
RUN npm ci

# App source + config the job imports from (src/lib, src/types, tsconfig paths).
COPY tsconfig.json ./
COPY src ./src
COPY jobs ./jobs

ENV NODE_ENV=production
CMD ["npx", "tsx", "jobs/batch-screen.ts"]
