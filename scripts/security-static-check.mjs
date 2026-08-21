import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const ignored = /(^|\/)(\.env(?:\.|$)|.*\.example$|.*\.sample$|docs\/|.*\.md$|.*\.spec\.[jt]sx?$|.*\.test\.[jt]sx?$)/i;
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((file) => !ignored.test(file));

// Files with a known, already-triaged, dev-only credential (local Postgres/
// pgAdmin password, never used outside a developer's own machine, no
// production risk — see SECURITY-AUDIT-2026-07-23.md / SECURITY-AUDIT-2026-08-20.md).
// Scanned by every OTHER pattern below; only exempted from the generic
// connection-string check so this list stays short and auditable.
const knownDevOnlyConnectionStrings = new Set([
  'docker-compose.dev.yaml',
  'scripts/start-local.mjs',
  'scripts/run-backend-local.cmd',
]);

const findings = [];
const privateKey = /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/;
const hardcodedSecret = /\b(?:JWT_SECRET|ADMIN_JWT_SECRET|OPENAI_API_KEY|KIEAI_API_KEY|STRIPE_SECRET_KEY|AI_GENERATE_API_KEY)\b\s*[:=]\s*['"]([^'"$]{16,})['"]/i;
const insecureFallback = /\$\{(?:JWT_SECRET|ADMIN_JWT_SECRET|AI_GENERATE_API_KEY)[:-][^}]+\}/i;
// Broader, name-agnostic patterns (2026-08-20 audit, N-14): the list above
// only catches secrets under one of a handful of known variable names.
// These catch a live Stripe secret key regardless of what variable holds it,
// an AWS access key id, and any connection string with a username:password
// embedded directly in the URL (Postgres/MySQL/Redis/MongoDB).
const stripeLiveKey = /\bsk_live_[A-Za-z0-9]{16,}/;
const awsAccessKeyId = /\bAKIA[0-9A-Z]{16}\b/;
// The password segment must not start with `$` — `${POSTGRES_PASSWORD}`-style
// interpolation is a reference to a runtime-injected secret, not a hardcoded
// one, and every production compose file in this repo uses that pattern.
const connectionStringWithCredentials =
  /\b(?:postgres|postgresql|mysql|rediss?|mongodb(?:\+srv)?):\/\/[^:\/\s'"]+:(?!\$)[^@\/\s'"]+@/i;

for (const file of tracked) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (privateKey.test(content)) findings.push(`${file}: private key marker`);
  if (hardcodedSecret.test(content)) findings.push(`${file}: hardcoded credential assignment`);
  if (insecureFallback.test(content)) findings.push(`${file}: insecure credential fallback`);
  if (stripeLiveKey.test(content)) findings.push(`${file}: Stripe live secret key`);
  if (awsAccessKeyId.test(content)) findings.push(`${file}: AWS access key id`);
  if (
    connectionStringWithCredentials.test(content) &&
    !knownDevOnlyConnectionStrings.has(file)
  ) {
    findings.push(`${file}: connection string with embedded credentials`);
  }
}

if (findings.length) {
  console.error('[security-static-check] findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`[security-static-check] scanned ${tracked.length} tracked files; no credential patterns found`);
