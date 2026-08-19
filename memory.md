# Project memory

Accumulated findings, decisions and gotchas from past work on this codebase —
the "why" behind non-obvious code, not a changelog. Read this before touching
an area listed below; it'll save you from re-discovering the same bug.

Companion to [CLAUDE.md](CLAUDE.md) (how to work here) — this file is what
we've learned, that one is how to act on it.

> Excluded on purpose: production server access details (IPs, SSH keys,
> credentials). Those live outside git. Ask the project owner if you need
> production access for debugging.

## Studio chat (contentPresentationTool / carousel & ideas cards)

- **Keep `contentPresentationTool`'s zod schema permissive.** The Studio
  model frequently omits fields (e.g. an idea with no `title`). A strict
  schema made those calls fail validation → no artifact returned → chat fell
  back to raw text → duplicated/looping cards in the UI. Fields are optional
  in the schema; sensible defaults are backfilled in `execute` instead of
  rejecting. Don't re-tighten this.
- **The model sometimes writes structured content as prose instead of
  calling the tool at all.** `fallback-artifact-parser.ts` on the frontend
  is the safety net — it recovers a card from raw text using several
  heuristic strategies (JSON leaked in prose, an "ideas" label-anchored
  shape, a "Slide N: / Título: / Texto:" carousel shape). If a bug report
  shows a wall of markdown where a card should be, check this file's
  strategy list first — the gap is usually "no strategy recognizes this
  particular shape yet," not a deeper architecture problem. Also worth a
  companion fix in `load.tools.service.ts`'s routing prompt, since the
  parser is a recovery mechanism, not the primary path. (One real instance:
  a `creationType='text'` copy request whose answer turned out slide-shaped
  had no matching prose strategy until one was added for it.)
- **Chat carousel cards persist their generated images server-side**
  (`StudioCarouselImage` table, keyed by `cardKey` = a stable hash of the
  card's slide headlines) so images survive leaving and returning to the
  chat — the card payload itself never carries image URLs or a project id.
- **A carousel slide's `imagePrompt` is written before the user picks a
  colour palette**, so it often bakes in its own colour/mood language that
  conflicts with the palette approved later in "Editar design". The image
  provider usually (not always) prioritizes the approved palette correctly;
  an explicit "colour override" instruction was added to narrow the odds,
  but this can't be made 100% reliable through prompt wording alone — if it
  recurs, regenerate just the affected slide rather than chasing full
  reliability.
- Two things were investigated for the Studio agent's prompt/routing logic
  and deliberately NOT done — don't re-litigate without new evidence:
  - Regex/keyword-based intent classification (greeting vs. content
    request) was tried once, reverted, because it missed real phrasing
    variations. Natural-language classification correctly stays in the
    model.
  - Routing card-button clicks through a typed request-context object
    instead of serializing them as text for the model to re-parse would be
    a real reliability win, but no one has verified the actual request
    shape with live traffic yet (every existing read of it hedges across
    multiple possible shapes) — don't build on an unverified shape.

## Creative generation (image/video jobs)

- Creative generation used to run the provider call **synchronously inside
  the HTTP request** (can take 1-2 min per image). For a multi-slide
  carousel this held the request open past the reverse proxy's timeout —
  the backend kept generating and billing in the background, but the
  browser never got a response, so images appeared to silently fail. Fixed
  by splitting the fast part (quote, access check, reservation) from the
  slow provider call, which now runs in a deferred background task that the
  frontend polls.
- **Single-video generation still has this same blocking-request shape** —
  not yet fixed. If a user reports video generation "stuck" or a proxy
  error, the same prepare/defer split is the fix.
- A concurrency guard (default 20 concurrent jobs) can trip mid-carousel on
  a large batch; individual slides get a per-slide error in that case,
  which is the accepted behavior, not a bug to chase.

## Backend DTOs (class-validator)

- **Every class-validator DTO field needs at least one decorator**
  (`@IsOptional()` at minimum). A bare undecorated field — even one the
  client never sends — makes NestJS's global `whitelist: true,
  forbidNonWhitelisted: true` pipe reject **every** request to that
  endpoint with 400, because the backend's swc compiler defines the field
  on every instance regardless of decoration, and class-validator only
  treats decorated properties as "known." This has caused a full login/
  register/billing outage in production before from an undecorated
  analytics-tracking field. If an endpoint suddenly 400s on 100% of
  requests with no obvious cause, check for a newly-added bare DTO field
  first.
- A `require_tld: false` option is needed on `@IsUrl()` for any field that
  may hold a local/self-hosted storage URL (`http://localhost:PORT/...`
  has no TLD, and the decorator rejects it by default).

## Local dev environment

- `node_modules/@gitroom/nestjs-libraries` and `/helpers` are Windows
  junctions to a hand-built compiled-JS mirror, not the `.ts` source
  (`nest start --watch`'s swc builder only compiles `apps/backend/src`,
  so anything reached via a `@gitroom/*` bare import needs a real build to
  exist first). After editing anything under `libraries/nestjs-libraries/src`
  or `libraries/helpers/src`, rebuild with
  `pnpm exec tsc -p libraries/<pkg>/tsconfig.lib.json` and repoint the
  junction (see the file's own memory for exact commands) before trusting a
  local boot — a stale mirror causes `MODULE_NOT_FOUND` at boot, or worse,
  boots fine but is missing a newer method on an existing class.
- `UPLOAD_DIRECTORY` must be set in `.env` for any upload/media flow to
  work locally — unset, both the backend's `LocalStorage` and the
  frontend's uploads route silently fall back to the literal string
  `"undefined"` as a directory prefix, so files get written and read from
  two different, mismatched, accidentally-created folders. Symptom: upload
  returns 200, but reading the file back 500s.
- `DISABLE_TEMPORAL` must be `"true"` for a minimal local dev boot (the
  adjacent `.env` comment says so, but check the actual value — it drifts).
- Full local-boot checklist: Docker Desktop running → Postgres/Redis
  containers up → both lib mirrors fresh → `DISABLE_TEMPORAL="true"` →
  `UPLOAD_DIRECTORY` set → `pnpm run prisma-db-push` if schema drifted.

## Testing setup

- Two test runners: backend + `libraries/` run under **jest**
  (`apps/backend/jest.config.ts`), frontend runs under **vitest**
  (`apps/frontend/vitest.config.ts`). Root `pnpm test` runs both; CI runs
  it on every push.
- Always point jest at the `.ts` config explicitly
  (`--config apps/backend/jest.config.ts`), not a bare `jest.config.js` —
  a stray compiled `.js` sibling can shadow the real config and break with
  `require is not defined in ES module scope` if a broad `tsc` run was ever
  done at the repo root without a scoped `outDir`.
- Backend jest hangs locally after tests pass (`--detectOpenHandles` waits
  for the real `.env`'s DB connection to close, which it never does
  locally). Add `--forceExit` for a clean local run; CI doesn't need it
  (no `.env` there).
- The tool→card contract between backend and frontend for Studio artifacts
  is pinned by tests on both sides (`content.presentation.tool.spec.ts` /
  `content-presentation-contract.spec.ts`) — if either side's shape drifts,
  a test fails instead of silently breaking the UI.

## Carousel logo & downloads feature

Manual (non-AI) logo upload, live positioning/sizing/opacity, and real
per-slide + full-ZIP carousel downloads on `/media` — logos are baked into
the actual PNG bytes server-side via `sharp` compositing, not just shown in
the UI.

- **`archiver` is pinned to `7.0.1`, not the newer `8.x`**, because `8.x`
  ships pure ESM and breaks jest's default CJS transform. If bumping it,
  re-verify jest still runs, and keep `@types/archiver`'s major version in
  sync with the pinned runtime major (a drift here caused a real type error
  once `node_modules` stopped being stale enough to mask it).
- **Don't wrap a fetch of the app's own previously-uploaded media in an
  SSRF-blocking dispatcher.** That kind of guard exists to stop a fetch to
  an attacker-*chosen* address; an org-scoped `Media.path` the app itself
  produced is never that, and in local dev it's legitimately a `localhost`
  URL — wrapping it broke every local compositing request for no real
  security gain. Evaluate a security wrapper against the actual call site's
  threat model, don't apply one just because it's used elsewhere.
- Logos are stored the same way carousel-level metadata already was
  (a JSON blob embedded in one slide's `alt` field behind a prefix
  constant) — extended rather than replaced with a schema migration.

## Admin system (Fase 0 — security foundation)

A phased admin-system plan exists at `docs/admin/PLANO-SISTEMA-ADMIN.md`.
Fase 0 (security foundation: short-lived revocable admin sessions, MFA,
deny-by-default permissions, audit logging) is implemented and verified —
everything else in the plan (actual admin domain panels: users, orgs,
billing, content) is deliberately built on top of it and comes later.
**Not yet run:** the backfill command that creates an `AdminUser(OWNER)`
for every legacy `isSuperAdmin=true` user — needs to run before anyone can
log into the new admin flow for real.
