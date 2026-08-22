# Testing strategy

This documents how automated testing works in ContentFlow: what layers
exist, what commands to run, how CI gates a deploy, and — just as
important — what's deliberately **not** covered yet and why.

## Layers

| Layer | Where | Runner | Hits a real DB? |
|---|---|---|---|
| Unit (backend + libraries) | `apps/backend/src/**/*.spec.ts`, `libraries/**/*.spec.ts` | Jest (`apps/backend/jest.config.ts`) | No — mocked |
| Unit/component (frontend) | `apps/frontend/src/**/*.spec.{ts,tsx}` | Vitest (`apps/frontend/vitest.config.ts`) | No |
| Integration (backend) | `apps/backend/src/**/*.integration-spec.ts` | Jest (`apps/backend/jest.integration.config.ts`) | Yes — real Postgres/Redis |
| Unit (orchestrator/Temporal) | `apps/orchestrator/src/**/*.spec.ts` | Jest (`apps/orchestrator/jest.config.ts`) | No |
| E2E | `e2e/**/*.spec.ts` | Playwright (`playwright.config.ts`) | Yes — real Postgres/Redis, real backend+frontend, external providers mocked |

The unit layer was already substantial before this effort (106 spec files,
most written directly off real incidents — the 2026-08-20 payment-security
audit, SSRF fixes, IDOR fixes, session-revocation bugs). It intentionally
mocks Prisma/Stripe/heavy transitive dependencies (see individual spec file
comments for why — e.g. `nostr-tools` being ESM-only breaks the default
`ts-jest` CommonJS transform). **Don't convert these to hit a real DB** —
that's what the integration layer is for. Add a new
`*.integration-spec.ts` file instead when a test needs real Prisma/Postgres
behavior (constraints, cascades, transactions) that a mock can't prove.

## Commands

```bash
pnpm run test:unit          # backend unit (jest) + frontend unit (vitest) — fast, fully mocked
pnpm run test:backend       # backend + libraries unit only
pnpm run test:frontend      # frontend unit only
pnpm run test:integration   # backend integration specs against a real test Postgres/Redis
pnpm run test:e2e           # Playwright, full stack
pnpm run test:regression    # test:unit + test:integration (see "Regression suite" below)
pnpm run test:coverage      # test:backend/test:frontend with coverage enabled
pnpm run typecheck          # tsc --noEmit, backend + frontend
pnpm run test:ci            # typecheck + build + test:unit + test:integration + test:e2e — what CI runs
```

### Running integration/E2E tests locally

Both need a real Postgres + Redis reachable at the ports `.env.test`
declares (`5434`/`6381` — distinct from the dev stack's `5433`/`6380` so you
can run both side by side):

```bash
docker run -d --name contentflow-test-pg  -p 5434:5432 -e POSTGRES_USER=contentflow-test -e POSTGRES_PASSWORD=contentflow-test-pwd -e POSTGRES_DB=contentflow-db-test postgres:17-alpine
docker run -d --name contentflow-test-redis -p 6381:6379 redis:7-alpine
```

`pnpm run test:integration` pushes the current Prisma schema onto that
database itself (`apps/backend/test/integration-env.ts`) — no manual
migration step needed. Every `*.integration-spec.ts` file truncates all
tables in `beforeEach` via `apps/backend/test/reset-db.ts`'s
`resetDatabase()`, so tests in the same file can't leak state, but **never
point `.env.test`/`DATABASE_URL` at a real database** — this repo genuinely
truncates on every test run.

`pnpm run test:e2e` additionally needs the AI-provider fake
(`apps/backend/test/fixtures/ai-provider-fake.ts`) and, for billing specs,
`stripe/stripe-mock` reachable — see "External providers in CI" below for
why, and `playwright.config.ts`'s `webServer` entries for how they're
started automatically for both local runs and CI.

## CI gating (the actual deploy gate)

Before this effort, the workflow that triggers on every push to `main` and
deploys to production (`.github/workflows/deploy-digitalocean.yml`) only ran
two hardcoded spec files before deploying — the full suite never ran on the
deploy path at all, and frontend tests never ran in CI under any workflow.
That's fixed now:

- **`.github/workflows/deploy-digitalocean.yml`**'s `verify` job (which
  `deploy` depends on via `needs: [changes, verify]` +
  `needs.verify.result == 'success'`) now runs: lint (blocking), typecheck,
  `test:backend`/`test:frontend` (for whichever service actually changed),
  `test:integration` (when backend changed), and `test:e2e` (always — a
  critical flow can break from either side of the stack). **Any of these
  failing blocks the deploy.**
- **`.github/workflows/build.yml`** (PRs, `merge_group`, and pushes to
  non-`main` branches) runs the same full set unconditionally, so you get
  the same signal before merging that the deploy gate would give you on
  `main`.
- **`.github/workflows/eslint.yml`** is a separate, pre-existing,
  deliberately `continue-on-error: true` SARIF/code-scanning workflow — it's
  for GitHub's code-scanning UI, not a pass/fail gate, and this effort
  didn't touch that choice. The actual blocking lint check lives inside
  `verify`/`build.yml` instead.

If a test is ever disabled or skipped in CI, it must say why inline (a
comment next to the skip, not a silent `.skip()`) — never disable a test to
make the pipeline green without fixing or explicitly flagging the underlying
problem.

## External providers in CI

CI must not depend on live third-party APIs — flaky, costs money, not
deterministic. `.env.test` and `playwright.config.ts` point these at local
fakes instead:

- **Stripe** → `stripe/stripe-mock` (official Docker image, run as a CI
  services container / locally via `docker run stripe/stripe-mock`).
- **AI (Kie/OpenAI)** → `apps/backend/test/fixtures/ai-provider-fake.ts`, a
  minimal local server returning canned responses. This proves the
  *pipeline* (request → job → storage → download) works — it does not and
  cannot prove real generation quality. That's an explicit, permanent scope
  boundary, not a gap to close later.
- **Social platforms** → a `MockProvider` implementing the existing
  `social.abstract.ts` interface, registered only when `NODE_ENV=test`.

## Regression suite

This repo doesn't use a separate tagging system for "regression tests" —
`test:regression` runs the existing unit + integration suites, because they
already function as the regression suite: the large majority of existing
spec files are named after and directly reproduce a specific real bug/audit
finding (grep any `libraries/**/*.spec.ts` file's leading comment for
examples). Keep doing that: **when you fix a real bug, reproduce it as a
failing test first, fix it, confirm the test passes, and leave the test in
place permanently.**

## Coverage

Coverage thresholds (`coverageThreshold` in `apps/backend/jest.config.ts`,
`coverage.thresholds` in `apps/frontend/vitest.config.ts`) are set as a
**floor a few points below the measured baseline, not a target** — they
exist to catch a coverage regression, not to imply that hitting the number
means the code is well-tested. A high percentage from superficial
mock-everything tests is worse than a lower percentage from tests that
actually exercise real behavior; don't write tests to move this number.

## Explicitly deferred (tracked debt, not silently skipped)

Scoped out of this pass by risk-based prioritization, not forgotten:

- **~24 of the 29 social-integration providers** (`libraries/nestjs-libraries/src/integrations/social/`)
  have no test yet. 5 already do (`bluesky.provider.ssrf.spec.ts`,
  `lemmy.provider.spec.ts`, `listmonk.provider.spec.ts`,
  `mastodon.provider.spec.ts`, `wordpress.provider.spec.ts`) — that's the
  pattern to replicate (mainly an SSRF-guard-on-custom-instance-URL check)
  for the rest; it's mechanical, just not done yet.
- **`apps/commands`, `apps/extension`, `apps/sdk`** have no test
  infrastructure at all. None are on the production deploy critical path
  the way backend/frontend/orchestrator are.
- **Exhaustive per-endpoint coverage** of all ~70 admin routes and all
  ~115 Prisma models. This pass covers the highest-risk gaps (previously
  fully-untested admin controllers, auth, the Stripe webhook controller,
  outbound webhooks, orchestrator workflows) with representative-sample
  depth, not exhaustive depth.
- **`libraries/react-shared-libraries`** has no test runner wired up at all
  — not even referenced by `apps/frontend/vitest.config.ts`.

If you're closing one of these gaps, delete the corresponding bullet here
when you do.
