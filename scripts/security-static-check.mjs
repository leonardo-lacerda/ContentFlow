import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const ignored = /(^|\/)(\.env(?:\.|$)|.*\.example$|.*\.sample$|docs\/|.*\.md$|.*\.spec\.[jt]sx?$|.*\.test\.[jt]sx?$)/i;
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((file) => !ignored.test(file));

const findings = [];
const privateKey = /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/;
const hardcodedSecret = /\b(?:JWT_SECRET|ADMIN_JWT_SECRET|OPENAI_API_KEY|KIEAI_API_KEY|STRIPE_SECRET_KEY|AI_GENERATE_API_KEY)\b\s*[:=]\s*['"]([^'"$]{16,})['"]/i;
const insecureFallback = /\$\{(?:JWT_SECRET|ADMIN_JWT_SECRET|AI_GENERATE_API_KEY)[:-][^}]+\}/i;

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
}

if (findings.length) {
  console.error('[security-static-check] findings:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`[security-static-check] scanned ${tracked.length} tracked files; no credential patterns found`);
