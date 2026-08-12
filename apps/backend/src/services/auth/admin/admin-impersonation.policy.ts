export function applyImpersonationIdentity<T extends { isSuperAdmin?: boolean }>(user: T): T {
  return { ...user, isSuperAdmin: false };
}
