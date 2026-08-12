'use client';

import React, { FC, ReactNode, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminFetch, useAdminStatus, AdminSessionInvalidError } from '@gitroom/frontend/components/admin/admin-api.hooks';
import { AdminLoginComponent } from '@gitroom/frontend/components/admin/admin-login.component';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { Button } from '@gitroom/react/form/button';

const NAV = [
  { href: '/admin/security', label: 'Security', permission: 'security.session.self.read' },
  { href: '/admin/audit', label: 'Audit log', permission: 'security.audit.read' },
  { href: '/admin/users', label: 'Users', permission: 'users.read' },
  { href: '/admin/organizations', label: 'Organizations', permission: 'orgs.read' },
  { href: '/admin/billing', label: 'Billing & Credits', permission: 'billing.read' },
  { href: '/admin/ai', label: 'AI & Jobs', permission: 'ai.jobs.read' },
  { href: '/admin/content', label: 'Content', permission: 'content.read' },
  { href: '/admin/integrations', label: 'Integrations', permission: 'integrations.read' },
  { href: '/admin/system', label: 'System', permission: 'system.read' },
  { href: '/admin/analytics', label: 'Analytics', permission: 'analytics.read' },
  { href: '/admin/approvals', label: 'Approvals', permission: 'security.approvals.read' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'], ADMIN: ['users.*', 'orgs.*', 'billing.*', 'credits.*', 'content.*', 'ai.*', 'integrations.*', 'system.*', 'analytics.*', 'security.audit.read'],
  SUPPORT: ['users.read', 'orgs.read', 'billing.read', 'content.read'],
  FINANCE: ['billing.*', 'credits.*', 'orgs.read', 'analytics.revenue.*'],
  ENGINEER: ['system.*', 'ai.*', 'integrations.*', 'content.errors.*'],
  READONLY: ['users.read', 'orgs.read', 'billing.read', 'credits.read', 'content.read', 'system.read', 'analytics.read', 'security.audit.read'],
};
const canPermission = (role: string | undefined, permission: string) => (ROLE_PERMISSIONS[role || ''] || []).some((pattern) => pattern === '*' || pattern === permission || (pattern.endsWith('.*') && permission.startsWith(pattern.slice(0, -1))));

// Every /admin/* page (except /admin/login) renders through this. It gates
// on a *verified* admin_auth session (not just an AdminUser record), and
// reacts to a session going invalid mid-use (expired/revoked) by dropping
// back to the login/step-up screen instead of showing a raw 401.
export const AdminShellComponent: FC<{ children: ReactNode }> = ({ children }) => {
  const { data: status, isLoading } = useAdminStatus();
  const pathname = usePathname();
  const adminFetch = useAdminFetch();
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await adminFetch('/admin/auth/sessions');
      setHasSession(res.ok);
    } catch (e) {
      if (e instanceof AdminSessionInvalidError) setHasSession(false);
    } finally {
      setCheckedSession(true);
    }
  }, [adminFetch]);

  React.useEffect(() => {
    if (status?.isAdmin) checkSession();
  }, [status?.isAdmin, checkSession]);

  if (isLoading || (status?.isAdmin && !checkedSession)) {
    return <LoadingComponent />;
  }

  if (!status?.isAdmin || !hasSession || sessionInvalid) {
    return (
      <div className="bg-newBgColorInner flex-1 flex items-center justify-center min-h-[60vh]">
        <AdminLoginComponent
          onVerified={() => {
            setSessionInvalid(false);
            setHasSession(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-newBgColorInner text-textColor min-h-[80vh]">
      <div className="w-[220px] shrink-0 border-r border-newTableBorder p-[16px] flex flex-col gap-[4px]">
        <div className="text-[13px] uppercase opacity-50 mb-[8px] px-[8px]">
          Admin · {status.role}
        </div>
        {NAV.filter((item) => !item.permission || canPermission(status.role, item.permission)).map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'px-[10px] py-[8px] rounded-[6px] text-[14px] ' +
                (active ? 'bg-tableBorder font-[600]' : 'opacity-80 hover:opacity-100')
              }
            >
              {item.label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <Button
          secondary
          onClick={async () => {
            await adminFetch('/admin/auth/logout', { method: 'POST' });
            setHasSession(false);
          }}
        >
          Exit admin session
        </Button>
      </div>
      <div className="flex-1 p-[20px] overflow-auto">{children}</div>
    </div>
  );
};
