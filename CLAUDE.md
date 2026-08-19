# Working process for agents on ContentFlow

This file documents how to work on this codebase, distilled from what actually
worked well on a real feature (manual logo upload/compositing + real carousel
downloads, 2026-08-18) and a real bug fix that followed it. Follow this by
default on non-trivial work in this repo, even without being told to.

## Planning

- Before writing any code for a non-trivial feature, read how the system
  **currently** generates, stores, displays and manipulates the data you're
  about to touch. This repo has non-obvious conventions (e.g. carousels are a
  *synthetic* grouping computed at read time from flat `Media` rows, matched
  by `originalName` prefix; per-carousel metadata is JSON embedded inside one
  slide's `alt` field behind a prefix constant). Guessing the shape instead of
  reading it first is how you end up fighting the existing system.
- Build a concrete plan before touching code: which components/pages change,
  which APIs need to be added or changed, how new data will be stored, how it
  connects end to end, and what regression/compatibility risks exist.
- When the user explicitly authorizes proceeding without plan approval, still
  write the plan out for your own reasoning — then execute it directly rather
  than re-asking at each step. The responsibility for verifying the result is
  correct shifts to you in that mode, not away from anyone.
- Prefer extending an existing convention over inventing a new one or doing a
  schema migration, when the existing convention can genuinely carry the new
  data (e.g. adding a `logo` key to the carousel metadata JSON instead of a
  new Prisma model/migration).

## Development

- Don't apply a security/defensive pattern reflexively because it was used
  elsewhere in the session. Evaluate it against the actual threat model of
  the specific call site. Example of getting this wrong: wrapping a fetch of
  the app's *own* previously-uploaded `Media.path` (an org-scoped, trusted
  URL) in `ssrfSafeDispatcher` — that dispatcher exists to stop a fetch to an
  attacker-*chosen* address, and blocking loopback IPs broke every legitimate
  local-dev fetch instead of adding any real protection.
- No premature abstraction, no backwards-compat shims, no speculative error
  handling for states that can't happen — this repo's general engineering
  defaults apply as normal.
- Comments explain the non-obvious WHY (a hidden constraint, a workaround for
  a specific bug, a subtle invariant) — never restate WHAT the code does.

## Testing — the part that matters most

- **Never consider a feature done because the code compiles or a button
  renders in the UI.** That is not evidence the feature works. This exact
  distinction, stated explicitly by the user on the logo/download feature,
  is what caught three real bugs that a code review alone would have missed:
  a security wrapper breaking a legitimate same-origin fetch, an unset
  `UPLOAD_DIRECTORY` env var silently writing/reading files from mismatched
  folders, and `@IsUrl()`'s default `require_tld: true` rejecting `localhost`
  URLs. None of these were visible from reading the code — only from actually
  running the flow.
- For a UI-facing feature, the bar is: open the real browser, reproduce the
  actual user flow (not a shortcut version of it), and verify the *output*,
  not just the response code. For a file download, that means downloading
  the real bytes and inspecting them (e.g. `sharp` pixel sampling on a
  downloaded PNG, `unzip -l` + per-file inspection on a downloaded ZIP) —
  a `200 OK` in the network tab is not proof the file is correct.
- When a test surfaces a bug, fix it and re-test the same step before moving
  on. Don't accumulate "known issues" and call the task done anyway.
- Write unit tests for new logic using real fixtures over mocks where
  feasible (e.g. real `sharp`-generated fixture images with pixel assertions,
  rather than a mocked image buffer that can't actually reveal a wrong
  compositing offset).
- After the manual E2E pass is green, run the full automated test suite
  (backend + frontend) once more before considering the work finished.
- When investigating a bug report, reproduce it from the actual reported
  content when possible — a regression test built from real production text
  catches more than a synthetic minimal example.

## Git / deploy discipline

- Only commit when explicitly asked. Stage precisely the files that belong to
  the change — check `git status` for unrelated pre-existing modifications or
  scratch files before a broad `git add`, and exclude them.
- `git fetch origin main` and check divergence before pushing.
- After pushing, **verify CI/deploy actually went green** — don't assume a
  push succeeded just because `git push` returned 0. If a workflow fails,
  read the actual failure log and fix the root cause (e.g. a stale
  `pnpm-lock.yaml` failing `--frozen-lockfile`, or a version mismatch between
  a pinned runtime dependency and its `@types/*` package) rather than
  retrying blindly. If some checks were already failing before your change
  (compare against the previous commit's run results), that's a pre-existing
  issue out of scope — say so explicitly rather than either ignoring it
  silently or trying to fix everything.

## Known personal failure mode to double-check for

When writing an accent-stripping regex (`.normalize('NFD').replace(/[...]/g, '')`),
double check the character class is the literal escape sequence
double check the character class is the literal escape-sequence text `\u0300-\u036f`, not literal Unicode combining-mark characters typed directly
into the regex (they look identical in an editor but silently corrupt every
future occurrence of that pattern). This has happened multiple times in this
codebase's history — grep for `normalize('NFD')` and eyeball the byte length
of the following character class if touching this pattern again.
