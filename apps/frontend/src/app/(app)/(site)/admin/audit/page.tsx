'use client';

import React, { useState } from 'react';
import { useAdminList } from '@gitroom/frontend/components/admin/admin-api.hooks';
import { AdminDataTable } from '@gitroom/frontend/components/admin/admin-data-table.component';

export default function AdminAuditPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useAdminList<any>(`/admin/audit-log?page=${page}&limit=50`);
  const columns = [
    { header: 'When', width: '170px', render: (row: any) => new Date(row.createdAt).toLocaleString() },
    { header: 'Action', render: (row: any) => row.action },
    { header: 'Actor', render: (row: any) => row.actorEmail },
    { header: 'Severity', width: '110px', render: (row: any) => row.severity },
    { header: 'Result', width: '80px', render: (row: any) => row.success ? 'OK' : 'Failed' },
  ];
  return <div className="flex flex-col gap-[16px]"><h1 className="text-[22px] font-[600]">Audit log</h1><AdminDataTable columns={columns} rows={data?.items} isLoading={isLoading} error={error} page={data?.page ?? page} limit={data?.limit ?? 50} total={data?.total} hasMore={data?.hasMore} onPageChange={setPage} /></div>;
}
