import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnvFile() {
  const candidates = [
    process.env.CONTENTFLOW_ENV_FILE,
    path.join(projectRoot, '.env'),
    '/opt/contentflow/.env',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { file: candidate, values: dotenv.parse(fs.readFileSync(candidate, 'utf8')) };
    }
  }

  return { file: null, values: {} };
}

function isSet(envOrValue, key) {
  const value = key === undefined ? envOrValue : envOrValue?.[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function addRequired(env, issues, key) {
  if (!isSet(env, key)) issues.push(`${key} is missing or empty`);
}

function addUrl(env, issues, key) {
  if (!isSet(env, key)) {
    issues.push(`${key} is missing or empty`);
    return;
  }

  try {
    const url = new URL(env[key]);
    if (!['http:', 'https:'].includes(url.protocol)) issues.push(`${key} must use http:// or https://`);
    if (url.pathname !== '/' && url.pathname.endsWith('/')) issues.push(`${key} must not end with /`);
  } catch {
    issues.push(`${key} is not a valid URL`);
  }
}

export function validateRuntimeEnv({ env = process.env, production = env.NODE_ENV === 'production' } = {}) {
  const file = readEnvFile();
  const merged = { ...file.values, ...env };
  const issues = [];

  if (production && merged.NODE_ENV !== 'production') issues.push('NODE_ENV must be production');

  for (const key of [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'STORAGE_PROVIDER',
    'AI_PRIMARY_PROVIDER',
  ]) addRequired(merged, issues, key);

  if (production) {
    addRequired(merged, issues, 'ADMIN_JWT_SECRET');
    addRequired(merged, issues, 'ADMIN_AUDIT_EXPORT_SECRET');
    addRequired(merged, issues, 'AI_GENERATE_API_KEY');
    addRequired(merged, issues, 'DATA_ENCRYPTION_KEY');
  }

  if (production) addRequired(merged, issues, 'UPLOAD_DIRECTORY');

  if (isSet(merged.JWT_SECRET) && merged.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET must contain at least 32 characters');
  }
  if (isSet(merged.ADMIN_JWT_SECRET) && merged.ADMIN_JWT_SECRET.length < 32) {
    issues.push('ADMIN_JWT_SECRET must contain at least 32 characters');
  }
  if (isSet(merged.ADMIN_AUDIT_EXPORT_SECRET) && merged.ADMIN_AUDIT_EXPORT_SECRET.length < 32) {
    issues.push('ADMIN_AUDIT_EXPORT_SECRET must contain at least 32 characters');
  }
  if (isSet(merged.DATA_ENCRYPTION_KEY) && merged.DATA_ENCRYPTION_KEY.length < 32) {
    issues.push('DATA_ENCRYPTION_KEY must contain at least 32 characters');
  }
  if (production && isSet(merged.AI_GENERATE_API_KEY) && merged.AI_GENERATE_API_KEY.length < 32) {
    issues.push('AI_GENERATE_API_KEY must contain at least 32 characters');
  }
  for (const [key, value] of [
    ['JWT_SECRET', merged.JWT_SECRET],
    ['ADMIN_JWT_SECRET', merged.ADMIN_JWT_SECRET],
    ['DATA_ENCRYPTION_KEY', merged.DATA_ENCRYPTION_KEY],
  ]) {
    if (isSet(value) && /change-this|troque_por|random string|your jwt secret/i.test(value)) {
      issues.push(`${key} must not use a placeholder value`);
    }
  }
  if (isSet(merged.DATABASE_URL) && !/^postgres(ql)?:\/\//i.test(merged.DATABASE_URL)) {
    issues.push('DATABASE_URL must use the postgres:// or postgresql:// scheme');
  }
  if (isSet(merged.REDIS_URL) && !/^rediss?:\/\//i.test(merged.REDIS_URL)) {
    issues.push('REDIS_URL must use redis:// or rediss://');
  }

  for (const key of ['MAIN_URL', 'FRONTEND_URL', 'NEXT_PUBLIC_BACKEND_URL', 'BACKEND_INTERNAL_URL']) {
    if (production || isSet(merged, key)) addUrl(merged, issues, key);
  }

  // Re-enabled 2026-08-20 (security remediation): restores the guard that
  // was temporarily commented out on 2026-08-14. If the production host
  // still has no domain/TLS reverse proxy, this will now block deploy again
  // — that's intentional; stand up TLS (docker-compose.proxy.yaml) rather
  // than leaving this silently disabled. See
  // SECURITY-REMEDIATION-2026-08-14.md, "Production actions required before
  // deploying this revision".
  if (production) {
    for (const key of ['MAIN_URL', 'FRONTEND_URL', 'NEXT_PUBLIC_BACKEND_URL']) {
      if (isSet(merged, key) && !String(merged[key]).startsWith('https://')) {
        issues.push(`${key} must use HTTPS in production`);
      }
    }
    if (String(merged.NOT_SECURED).toLowerCase() === 'true') {
      issues.push('NOT_SECURED must not be enabled in production');
    }
  }

  const provider = String(merged.AI_PRIMARY_PROVIDER || '').toLowerCase();
  if (provider === 'kie') {
    addRequired(merged, issues, 'KIEAI_API_KEY');
    addRequired(merged, issues, 'KIEAI_CHAT_MODEL');
    if (!isSet(merged.KIEAI_CHAT_BASE_URL) && !isSet(merged.CREATIVE_KIE_BASE_URL)) {
      issues.push('KIEAI_CHAT_BASE_URL or CREATIVE_KIE_BASE_URL is required for Kie chat');
    }
  } else if (provider === 'openai') {
    addRequired(merged, issues, 'OPENAI_API_KEY');
  } else if (isSet(merged.AI_PRIMARY_PROVIDER)) {
    issues.push(`AI_PRIMARY_PROVIDER has unsupported value: ${merged.AI_PRIMARY_PROVIDER}`);
  }

  if (String(merged.CREATIVE_KIE_ENABLED).toLowerCase() === 'true') {
    addRequired(merged, issues, 'KIEAI_API_KEY');
    addRequired(merged, issues, 'CREATIVE_KIE_IMAGE_MODEL');
    addRequired(merged, issues, 'CREATIVE_KIE_VIDEO_MODEL');
  }

  return { ok: issues.length === 0, issues, envFile: file.file };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRuntimeEnv({ production: process.argv.includes('--production') || process.env.NODE_ENV === 'production' });
  if (result.envFile) console.log(`[env-check] file: ${result.envFile}`);
  if (result.ok) {
    console.log('[env-check] configuration is valid');
    process.exit(0);
  }

  console.error('[env-check] configuration is invalid:');
  for (const issue of result.issues) console.error(`- ${issue}`);
  process.exit(1);
}
