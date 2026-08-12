'use client';

import React from 'react';
import { Button } from '@gitroom/react/form/button';
import { useAdminFetch, useAdminSessions } from '@gitroom/frontend/components/admin/admin-api.hooks';
import { AdminDataTable } from '@gitroom/frontend/components/admin/admin-data-table.component';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const AdminSessionsComponent = () => {
  const { data, isLoading, error, mutate } = useAdminSessions();
  const adminFetch = useAdminFetch();
  const toaster = useToaster();
  const revoke = async (id: string) => {
    const response = await adminFetch(`/admin/auth/sessions/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: 'Manual session revocation from security panel' }) });
    if (!response.ok) { toaster.show('Unable to revoke session', 'warning'); return; }
    await mutate(); toaster.show('Session revoked', 'success');
  };
  const revokeAll = async () => {
    const response = await adminFetch('/admin/auth/sessions/revoke-all', { method: 'POST', body: JSON.stringify({ reason: 'Manual global logout from security panel' }) });
    if (!response.ok) { toaster.show('Unable to revoke sessions', 'warning'); return; }
    toaster.show('All sessions revoked', 'success'); await mutate();
  };
  const columns = [
    { header: 'Created', render: (row: any) => new Date(row.createdAt).toLocaleString() },
    { header: 'IP', render: (row: any) => row.ip || '—' },
    { header: 'User agent', render: (row: any) => row.userAgent || '—' },
    { header: 'Status', render: (row: any) => row.current ? 'Current' : 'Active' },
  ];
  return <div className="flex flex-col gap-[16px]"><div className="flex justify-between items-center"><div><h1 className="text-[22px] font-[600]">Security sessions</h1><div className="text-[13px] opacity-60">Revoke a single session or force a global logout.</div></div><Button secondary onClick={revokeAll}>Revoke all</Button></div><AdminDataTable columns={columns} rows={data} isLoading={isLoading} error={error} page={0} limit={data?.length || 1} onPageChange={() => undefined} rowActions={(row) => <Button secondary disabled={row.current} onClick={() => revoke(row.id)}>Revoke</Button>} /></div>;
};
