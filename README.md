# ContentFlow

ContentFlow is a self-hosted AI content and social media marketing platform. It started as a fork of [Postiz](https://github.com/gitroomhq/postiz-app), but has since grown well past a scheduling tool: it now covers brand strategy, AI-driven content generation, paid ad creative production, editorial planning, and multi-channel publishing in one monorepo.

> This is a private fork under active development (see [`PRODUCAO_ATUAL.md`](PRODUCAO_ATUAL.md) for current deployment status). It is not the open-source Postiz community project.

## What it does

- **Brand DNA** — analyze a brand (site, docs, assets) into a reusable profile that drives every piece of generated content (`/brands`).
- **Content generation** — AI-generated carousels, images, articles-to-posts, and a conversational "studio" workspace for iterating on creative with an agent (`/studio`, `/generate`, `/ai-generate-images`).
- **Ad creatives** — a full UGC/paid-ad production console: actors, voices, product assets, AI image/video jobs, rights/consent tracking, credits, and localization (`/ads`, `/creative/advanced`).
- **Copy generation** — platform-optimized social post copy, email campaigns, and video scripts (Reels/TikTok) generated from a topic, idea, or imported article (`/social-posts`, `/email`, `/video`).
- **Editorial planning** — calendar-based content planning per platform with scheduled auto-generation (`/editorial`).
- **Content review** — a swipe-style UI for approving/rejecting AI-generated ideas before they go into production (`/content-swipe`).
- **Scheduling & publishing** — connect social channels (Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Google Business Profile, Pinterest, Threads, and more) and schedule posts on a calendar (`/publish`, `/launches`, `/channels`).
- **Agents** — a chat assistant scoped to your organization and connected channels, built on Mastra/CopilotKit (`/agents`).
- **Analytics** — per-channel and per-post performance metrics (`/analytics`).
- **Automations** — post-publish "plugs" (reposting, conditional actions) and third-party media integrations (`/plugs`, `/third-party`).
- **Billing** — subscriptions, trials, lifetime deals, and crypto payments via Stripe/NOWPayments, gating features by plan tier (`/billing`).
- **Admin** — audit logs, session management, error monitoring, and per-domain admin views (`/admin`).
- **Public/developer API, OAuth apps, webhooks, and a browser extension** for cookie-based platform auth.

## Monorepo layout

```
apps/
  frontend/      Next.js web app (all pages above live under src/app)
  backend/       NestJS API (controllers in src/api/routes)
  orchestrator/  Temporal workers for scheduled/background jobs
                 (publishing, refresh tokens, digests, streaks, creative pipelines)
  commands/      NestJS worker for one-off/admin tasks (backfills, token refresh, agents)
  extension/     Chrome (Manifest V3) extension for cookie-based social auth
  sdk/           @contentflow/node — publishable Node.js API client

libraries/       Shared services: Prisma schema, DTOs, social integrations,
                 uploads, billing, AI/agent tooling, webhooks
```

Data flow for most features: **Next.js page → React component → NestJS controller → service/repository in `libraries` → Postgres/Redis/storage/Stripe/AI/social APIs**, with Temporal picking up anything that needs to run on a schedule or in the background.

## Tech stack

- pnpm workspaces (monorepo)
- Next.js 16 / React 19 (frontend)
- NestJS (backend API, orchestrator, commands)
- Prisma + PostgreSQL
- Redis
- Temporal (scheduled/background workflows)
- Mastra + CopilotKit + LangChain/LangGraph (AI agents and content generation)
- Stripe / NOWPayments (billing)
- Docker Compose (local and production runtime)

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in the required values
pnpm run dev
```

`pnpm run dev` runs the extension, orchestrator, backend, and frontend together. Useful variants:

```bash
pnpm run dev-backend       # backend + frontend only
pnpm run dev:docker        # start Postgres/Redis/etc. via docker-compose.dev.yaml
pnpm run prisma-db-push    # sync the Prisma schema to your database
```

See [`.env.example`](.env.example) for the full list of environment variables (database, Redis, JWT/encryption secrets, storage provider, and per-platform social API credentials).

## Deployment

Production runs on Docker Compose, deployed to DigitalOcean via GitHub Actions on push to `main`. See [`DIGITALOCEAN_DEPLOY.md`](DIGITALOCEAN_DEPLOY.md) for the deploy process and [`PRODUCAO_ATUAL.md`](PRODUCAO_ATUAL.md) for the current known state of the production/test environment.

## Security

See [`SECURITY.md`](SECURITY.md) for the vulnerability reporting process, and [`SECURITY-AUDIT-2026-07-23.md`](SECURITY-AUDIT-2026-07-23.md) / [`SECURITY-REMEDIATION-2026-08-14.md`](SECURITY-REMEDIATION-2026-08-14.md) for audit history and remediation notes.

## License

This repository's source code is available under the [AGPL-3.0 license](LICENSE).
