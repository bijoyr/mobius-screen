# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead, use GitHub's
private **"Report a vulnerability"** (Security → Advisories) on this repository, or
email the maintainer. You'll get an acknowledgement within a few days.

## Secrets & configuration

This project keeps **all secrets out of the repository**:

- Real keys/tokens live only in `.env.local` (Node/Docker) or `.dev.vars`
  (Cloudflare) — both are gitignored. Use [`.env.example`](.env.example) as the template.
- Never commit `NEBIUS_API_KEY`, `TURSO_*`, `AUTH_*`, or any token.
- Tool/editor config that can contain tokens (e.g. `.claude/`) is gitignored.

If you discover a committed secret, treat it as compromised: **rotate it immediately**
and scrub it from history.

## Scope

This is a research/screening tool. Its output is **not investment advice** — picks are
candidates to research, not signals.
