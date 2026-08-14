import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

const baseUrl = process.env.ADMIN_SMOKE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
const failures = [];
const checks = [];

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

function check(name, actual, expected) {
  const ok = actual === expected;
  checks.push({ name, expected, actual, ok });
  if (!ok) failures.push(`${name}: expected ${expected}, received ${actual}`);
}

function tokenFor(adminId, jti) {
  if (!process.env.ADMIN_JWT_SECRET) throw new Error('ADMIN_JWT_SECRET is required');
  return jwt.sign({ sub: adminId, jti, typ: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '60m' });
}

async function createSession(adminId, mfaVerifiedAt = new Date()) {
  const jti = randomUUID();
  await prisma.adminSession.create({ data: { adminUserId: adminId, jti, expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt } });
  return { jti, cookie: `admin_auth=${tokenFor(adminId, jti)}` };
}

let admin;
let createdAdmin = false;
const sessions = [];
try {
  const user = await prisma.user.findFirst({ where: { deletedAt: null, activated: true } });
  if (!user) throw new Error('No active user exists for admin smoke test');
  const existing = await prisma.adminUser.findUnique({ where: { userId: user.id } });
  createdAdmin = !existing;
  admin = await prisma.adminUser.upsert({ where: { userId: user.id }, update: { role: 'OWNER', status: 'ACTIVE', mfaEnabled: true }, create: { userId: user.id, role: 'OWNER', status: 'ACTIVE', mfaEnabled: true } });
  const valid = await createSession(admin.id);
  const stale = await createSession(admin.id, new Date(Date.now() - 10 * 60 * 1000));
  const revoke = await createSession(admin.id);
  sessions.push(valid, stale, revoke);

  check('status without admin session', (await call('/admin/auth/status')).status, 200);
  check('protected list without admin session', (await call('/admin/users')).status, 401);

  for (const [name, path] of [
    ['users list', '/admin/users?page=0&limit=25'],
    ['organizations list', '/admin/organizations?page=0&limit=25'],
    ['billing summary', '/admin/billing/summary'],
    ['AI jobs', '/admin/ai/jobs'],
    ['content posts', '/admin/content/posts?page=0&limit=10'],
    ['integrations', '/admin/integrations'],
    ['system health', '/admin/system/health'],
    ['system flags', '/admin/system/flags'],
    ['analytics summary', '/admin/analytics/summary'],
    ['security overview', '/admin/security/overview'],
    ['audit list', '/admin/audit-log?limit=10'],
  ]) {
    check(name, (await call(path, { cookie: valid.cookie })).status, 200);
  }

  const stepUp = await call(`/admin/users/${user.id}/password-reset`, { method: 'POST', cookie: stale.cookie, body: { reason: 'smoke test step-up' } });
  check('critical action requires recent step-up', stepUp.status, 403);
  check('critical action returns step-up code', stepUp.body?.code, 'ADMIN_STEP_UP_REQUIRED');

  const revocationBefore = await call('/admin/users?limit=1', { cookie: revoke.cookie });
  check('revocation session works before revoke', revocationBefore.status, 200);
  await prisma.adminSession.update({ where: { jti: revoke.jti }, data: { revokedAt: new Date(), revokedBy: admin.id } });
  await redis.del(`admin:session:${revoke.jti}`);
  const revocationAfter = await call('/admin/users?limit=1', { cookie: revoke.cookie });
  check('revoked session is rejected immediately', revocationAfter.status, 401);

  await new Promise((resolve) => setTimeout(resolve, 500));
  const auditCount = await prisma.adminAuditLog.count({ where: { adminUserId: admin.id } });
  check('admin requests are audited', auditCount > 0, true);
} finally {
  if (admin) {
    await prisma.adminSession.deleteMany({ where: { adminUserId: admin.id } });
    if (createdAdmin) await prisma.adminUser.delete({ where: { id: admin.id } });
  }
  await redis.quit();
  await prisma.$disconnect();
}

console.log(JSON.stringify({ checks, failures }, null, 2));
if (failures.length) process.exit(1);
