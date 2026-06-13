# Contributing

Thanks for your interest in Mobius-Screen! Contributions of all kinds are welcome.

## Getting started

```bash
npm install
cp .env.example .env.local      # fill in NEBIUS_* + TURSO_* (+ AUTH_* for the UI)
npm run dev                     # http://localhost:3000
```

See [README.md](README.md) for the architecture and [docs/](docs/) for deeper notes.

## Before opening a PR

- **Type-check:** `npx tsc --noEmit` (must pass).
- **Build:** `npm run build`.
- **Smoke-test the AI path:** `npx tsx --env-file=.env.local scripts/smoke-screener.ts`
  (requires a funded `NEBIUS_API_KEY`).
- Keep changes focused; match the existing code style (self-documenting, minimal comments).
- **Never** commit secrets — see [SECURITY.md](SECURITY.md).

## Adding a market or stocks

The market registry lives in [src/lib/markets.ts](src/lib/markets.ts) — add markets and
their universes there. Prompts are in [src/lib/prompts.ts](src/lib/prompts.ts).

## Changing the LLM

Inference goes through [src/lib/providers/nebius.ts](src/lib/providers/nebius.ts) over the
OpenAI-compatible API. Point `NEBIUS_BASE_URL` at any compatible endpoint and set
`NEBIUS_MODEL` — no code change needed to swap models.

## Reporting issues

Use GitHub Issues for bugs/features. For security, see [SECURITY.md](SECURITY.md).
By contributing you agree your work is licensed under the repo's [MIT License](LICENSE).
