# Mobius-Screen web app — portable Docker image (Next.js standalone output).
# Build:  docker build -t mobius-screen .
# Run:    docker run --rm -p 3000:3000 --env-file .env mobius-screen
# This is the vendor-neutral way to run the UI anywhere; the Cloudflare/OpenNext
# path (npm run deploy) still works and is used for the live deployment.
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts sets output:"standalone", producing .next/standalone + static.
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
