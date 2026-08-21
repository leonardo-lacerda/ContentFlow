import { AdminRoleType } from '@prisma/client';

// Baseline every admin gets regardless of role: managing your own admin
// session (list/revoke your own sessions, log out). This is NOT about
// managing other admins' sessions — that's `security.sessions.*` below,
// a Fase 2+ "gestão de admins" capability.
const SELF_SERVICE_PERMISSIONS = [
  'security.session.self.read',
  'security.session.self.revoke',
  'security.session.self.stepup',
];

// Namespace grows as each admin domain (Fase 2+) ships; keep prefixes
// aligned with docs/admin/PLANO-SISTEMA-ADMIN.md §5.
export const ROLE_PERMISSIONS: Record<AdminRoleType, string[]> = {
  OWNER: ['*'],
  ADMIN: [
    ...SELF_SERVICE_PERMISSIONS,
    'users.*',
    'orgs.*',
    'billing.*',
    'credits.*',
    'content.*',
    'ai.*',
    'integrations.*',
    'system.*',
    'analytics.*',
    'security.alerts.*',
    'security.anomalies.*',
    'security.approvals.*',
    'security.sessions.*',
    'security.audit.read',
    'security.audit.export',
    'admins.*',
    'users.*',
    'orgs.*',
  ],
  SUPPORT: [
    ...SELF_SERVICE_PERMISSIONS,
    'users.read',
    'users.support.*',
    // Deliberately NOT 'users.write' (bare) and NOT 'users.email.write':
    // SUPPORT is a low-privilege, MFA-optional-by-default tier, and
    // 'users.write' historically also guarded the user-update endpoint that
    // could change a user's login email — changing email + /auth/forgot is
    // a full account-takeover chain, so any email-change capability must
    // stay CRITICAL-severity and out of this role. Only the narrow
    // activate/deactivate/basic-profile-field actions are exposed, via the
    // dedicated key below.
    'users.write.basic',
    'orgs.read',
    'billing.read',
    'credits.adjust.limited',
    'content.read',
    'content.moderate',
    'orgs.members.read',
  ],
  FINANCE: [
    ...SELF_SERVICE_PERMISSIONS,
    'billing.*',
    'credits.*',
    'orgs.read',
    'analytics.revenue.*',
    'analytics.read',
    'billing.*',
    'credits.*',
  ],
  ENGINEER: [
    ...SELF_SERVICE_PERMISSIONS,
    'system.*',
    'ai.*',
    'integrations.*',
    'content.errors.*',
    'system.*',
  ],
  READONLY: [
    ...SELF_SERVICE_PERMISSIONS,
    'users.read',
    'orgs.read',
    'billing.read',
    'credits.read',
    'content.read',
    'system.read',
    'system.errors.read',
    'analytics.read',
    'security.audit.read',
    'security.alerts.read',
    'security.anomalies.read',
  ],
};

// Actions in this namespace always require an admin session whose MFA was
// verified in the last STEP_UP_WINDOW_MS, even if the session itself is
// still valid — see docs/admin/PLANO-SISTEMA-ADMIN.md §4.2.
export const STEP_UP_WINDOW_MS = 5 * 60 * 1000;

export type AdminActionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

function matchPermission(pattern: string, key: string): boolean {
  if (pattern === '*') return true;
  if (pattern === key) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return key === prefix || key.startsWith(`${prefix}.`);
  }
  return false;
}

export function isStepUpValid(mfaVerifiedAt: Date | null | undefined): boolean {
  if (!mfaVerifiedAt) return false;
  return Date.now() - mfaVerifiedAt.getTime() <= STEP_UP_WINDOW_MS;
}

export function isAdminPermissionAllowed(
  role: AdminRoleType,
  overrides: Record<string, boolean> | null | undefined,
  permissionKey: string
): boolean {
  if (
    overrides &&
    Object.prototype.hasOwnProperty.call(overrides, permissionKey)
  ) {
    return !!overrides[permissionKey];
  }
  const patterns = ROLE_PERMISSIONS[role] || [];
  return patterns.some((pattern) => matchPermission(pattern, permissionKey));
}

export function isIpAllowed(ip: string | undefined, allowlist: string[]): boolean {
  if (!allowlist.length) return true;
  if (!ip) return false;
  return allowlist.some((entry) => {
    const value = entry.trim();
    if (!value) return false;
    if (value === ip || value === '*') return true;
    const [network, bitsRaw] = value.split('/');
    if (!bitsRaw || network.includes(':') || ip.includes(':')) return false;
    const bits = Number(bitsRaw);
    const toInt = (candidate: string) => candidate.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
    if (bits < 0 || bits > 32 || !/^\d+(\.\d+){3}$/.test(network) || !/^\d+(\.\d+){3}$/.test(ip)) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (toInt(network) & mask) === (toInt(ip) & mask);
  });
}
