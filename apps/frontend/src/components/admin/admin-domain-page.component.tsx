'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { AdminDataTable } from '@gitroom/frontend/components/admin/admin-data-table.component';
import { useAdminList, useAdminFetch, AdminStepUpRequiredError } from '@gitroom/frontend/components/admin/admin-api.hooks';
import { AdminReasonField, AdminStepUpModal, executeAdminAction } from '@gitroom/frontend/components/admin/admin-action.components';
import { useToaster } from '@gitroom/react/toaster/toaster';

const RESOURCE: Record<string, { endpoint: string; actionRoot?: string; title: string; actions?: { label: string; action: string }[] }> = {
  users: { endpoint: '/admin/users', actionRoot: '/admin/users', title: 'Users', actions: [{ label: 'Deactivate', action: 'deactivate' }, { label: 'Activate', action: 'activate' }, { label: 'Restore', action: 'restore' }] },
  organizations: { endpoint: '/admin/organizations', actionRoot: '/admin/organizations', title: 'Organizations', actions: [{ label: 'Suspend', action: 'suspend' }, { label: 'Restore', action: 'unsuspend' }] },
  billing: { endpoint: '/admin/billing/plans', title: 'Billing & Credits' },
  ai: { endpoint: '/admin/ai/jobs', actionRoot: '/admin/ai/jobs', title: 'AI & Jobs', actions: [{ label: 'Cancel', action: 'cancel' }, { label: 'Retry', action: 'retry' }] },
  content: { endpoint: '/admin/content/posts', title: 'Content' },
  integrations: { endpoint: '/admin/integrations', actionRoot: '/admin/integrations', title: 'Integrations', actions: [{ label: 'Disable', action: 'disable' }] },
  system: { endpoint: '/admin/system/flags', title: 'System & Feature Flags' },
  analytics: { endpoint: '/admin/analytics/timeseries', title: 'Analytics' },
  approvals: { endpoint: '/admin/auth/approvals', title: 'Critical-action approvals' },
};

export const AdminDomainPage = ({ section }: { section: string }) => {
  const definition = RESOURCE[section] || RESOURCE.system;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<{ id: string; action: string } | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const adminFetch = useAdminFetch();
  const toaster = useToaster();
  const key = `${definition.endpoint}?page=${page}&limit=25&search=${encodeURIComponent(search)}`;
  const { data, isLoading, error, mutate } = useAdminList<Record<string, any>>(key);
  const rows = data?.items || [];
  const columns = useMemo(() => {
    const keys = rows.length ? Object.keys(rows[0]).filter((key) => !['id', 'createdAt', 'updatedAt'].includes(key)).slice(0, 5) : ['id', 'status'];
    return keys.map((key) => ({ header: key, render: (row: Record<string, any>) => String(row[key] ?? '—') }));
  }, [rows]);
  const run = async () => {
    if (!pending || !reason.trim()) { toaster.show('A reason is required', 'warning'); return; }
    try {
      await executeAdminAction(adminFetch, `${definition.actionRoot}/${pending.id}/${pending.action}`, { reason });
      toaster.show('Action completed', 'success'); setPending(null); setReason(''); await mutate();
    } catch (error) {
      if (error instanceof AdminStepUpRequiredError) { setStepUp(true); return; }
      toaster.show(error instanceof Error ? error.message : 'Action failed', 'warning');
    }
  };
  return <div className="flex flex-col gap-[16px]">
    <div className="flex items-center justify-between gap-[12px]"><div><h1 className="text-[22px] font-[600]">{definition.title}</h1><div className="text-[13px] opacity-60">Controlled platform operations with audit logging.</div></div><input value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} placeholder="Search" className="bg-newBgColorInner border border-newTableBorder rounded-[8px] px-[10px] h-[36px] text-textColor" /></div>
    <AdminDataTable columns={columns} rows={rows as any} isLoading={isLoading} error={error} total={data?.total} page={data?.page ?? page} limit={data?.limit ?? 25} hasMore={data?.hasMore} onPageChange={setPage} rowActions={definition.actions ? (row) => definition.actions!.map((item) => <Button key={item.action} secondary onClick={() => setPending({ id: row.id, action: item.action })}>{item.label}</Button>) : undefined} />
    {pending && <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-[20px]"><div className="bg-newBgColorInner border border-newTableBorder rounded-[10px] p-[20px] w-full max-w-[420px] flex flex-col gap-[12px]"><div className="text-[18px] font-[600]">Confirm action</div><AdminReasonField value={reason} onChange={setReason} /><div className="flex justify-end gap-[8px]"><Button secondary onClick={() => setPending(null)}>Cancel</Button><Button onClick={run}>Continue</Button></div></div></div>}
    {stepUp && <AdminStepUpModal onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); void run(); }} />}
  </div>;
};
