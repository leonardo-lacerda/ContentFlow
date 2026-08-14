# Security remediation — 2026-08-14

This document records the hardening applied after the security audit. It does
not contain credentials or production secret values.

## Applied in code

- Session JWTs are explicitly `HS256`, carry `typ=session`, expire in 24 hours,
  and are checked against `User.authSessionVersion` on every request.
- Activation and password-reset links are opaque, hashed in Redis, expire, and
  are consumed atomically once. They no longer contain reusable session JWTs.
- Payment callbacks require a short-lived `typ=payment` token and an exact
  `order_id` match before granting anything.
- Organization invite tokens are type-scoped and expire after one hour.
- Admin sessions require a dedicated `ADMIN_JWT_SECRET`; they no longer fall
  back to the regular user JWT secret.
- Authenticated encryption uses a separate `DATA_ENCRYPTION_KEY`, so rotating
  JWT signing keys does not make stored integration secrets undecryptable.
- New MFA, third-party, and social integration secrets use AES-256-GCM with a
  random nonce and authentication tag. Decryption remains backward compatible
  with the legacy CBC format for lazy migration.
- Organization API keys now use one-way SHA-256 lookup hashes plus GCM storage;
  newly issued keys are never persisted as plaintext. Existing legacy keys are
  migrated on successful use and remain compatible until rotated.
- OAuth client secrets, authorization codes, and access tokens now use lookup
  hashes plus authenticated encryption. Legacy deterministic values are only a
  compatibility read path and are replaced on the next rotation/exchange.
- Public API authentication no longer fabricates a `SUPERADMIN` membership for
  bearer keys; public requests use the `USER` policy path and remain subject to
  API feature/capacity checks.
- Dynamic third-party function dispatch is restricted to an explicit allowlist;
  URL parameters cannot invoke constructors or provider internals.
- Legacy provider clients no longer contain fake credential literals. Audit
  export signing fails closed unless `ADMIN_AUDIT_EXPORT_SECRET` is configured,
  and production environment validation requires that secret.
- SSRF validation now resolves all addresses, fails closed on DNS errors, and
  uses a guarded undici dispatcher for redirects and connection lookup.
- CORS/proxy/security headers, strict request validation, cookie attributes,
  exact public-route matching, and API-role shape were hardened.
- The monitor endpoint is unavailable unless `MONITOR_TOKEN` is configured and
  the request supplies the matching header.
- Production compose files no longer provide fallback JWT or internal API
  credentials. Runtime startup rejects placeholders, short secrets, insecure
  HTTP URLs, and `NOT_SECURED=true`.
- Static credential scanning and focused auth/SSRF/authorization regression
  tests are now part of CI.

## Production actions required before deploying this revision

The current Vultr environment was inspected without printing secret values.
`ADMIN_JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and a replacement
`AI_GENERATE_API_KEY` were provisioned with restrictive file permissions; the
running processes were not restarted by this audit. The environment is still
configured with `NOT_SECURED=true` and HTTP URLs. The new release intentionally
refuses to start under that configuration so a bad deploy cannot replace a
healthy process.

Before rollout, provision:

```bash
openssl rand -hex 32  # JWT_SECRET, if rotating it
openssl rand -hex 32  # ADMIN_JWT_SECRET
openssl rand -hex 32  # DATA_ENCRYPTION_KEY
openssl rand -hex 32  # AI_GENERATE_API_KEY
openssl rand -hex 32  # MONITOR_TOKEN, if monitor checks are used
openssl rand -hex 32  # ADMIN_AUDIT_EXPORT_SECRET
```

Then configure a real HTTPS domain/reverse proxy, set `NOT_SECURED=false` (or
remove it), update the production `.env`, and restart through the selective
deployment workflow. Rotating `JWT_SECRET` invalidates all existing user
sessions and must be scheduled with that expectation. The historical JWT
secret committed in an old repository revision must also be considered
compromised and rotated; removing it from Git history requires a coordinated
history rewrite and force-push, which was deliberately not performed
automatically.

The workspace also contains ignored deployment archives. One archive contains
`.env` and `credentials/` paths. These archives are not tracked by Git, but
they must be removed from shared storage and any secrets they contain must be
rotated before distributing the workspace or using those artifacts. They were
not deleted automatically because they are local deployment artifacts.

## Verification performed locally

- Backend and frontend production builds: passed.
- Focused security tests: 44 tests passed.
- Static credential scan: passed over tracked files.
- `pnpm audit --audit-level high`: registry command timed out locally; CI now
  runs it as a required check.
