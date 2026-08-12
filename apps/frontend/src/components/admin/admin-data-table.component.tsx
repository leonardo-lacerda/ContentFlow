'use client';

import React, { FC, ReactNode } from 'react';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

export interface AdminColumn<T> {
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

// Shared list-view chrome for every admin panel: same grid-column layout,
// same loading/empty/error states, same pager. Panels only supply columns +
// data, so every domain screen looks and behaves the same way.
export function AdminDataTable<T extends { id: string }>(props: {
  columns: AdminColumn<T>[];
  rows: T[] | undefined;
  isLoading: boolean;
  error?: unknown;
  total?: number;
  page: number;
  limit: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  emptyLabel?: string;
  rowActions?: (row: T) => ReactNode;
}) {
  const { columns, rows, isLoading, error, total, page, limit, hasMore, onPageChange, rowActions } = props;
  const gridTemplate = [
    ...columns.map((c) => c.width || '1fr'),
    ...(rowActions ? ['auto'] : []),
  ].join(' ');
  const totalPages = total !== undefined ? Math.max(1, Math.ceil(total / limit)) : undefined;

  return (
    <div className="flex flex-col gap-[12px]">
      {isLoading ? (
        <LoadingComponent />
      ) : error ? (
        <div className="text-red-400 text-[13px]">Failed to load.</div>
      ) : !rows || rows.length === 0 ? (
        <div className="opacity-70 text-[13px] py-[24px] text-center">
          {props.emptyLabel || 'Nothing found.'}
        </div>
      ) : (
        <div className="border border-newTableBorder rounded-[8px] overflow-hidden overflow-x-auto">
          <div
            className="grid gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder min-w-[600px]"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {columns.map((c) => (
              <div key={c.header} className={c.align === 'right' ? 'text-right' : ''}>
                {c.header}
              </div>
            ))}
            {rowActions && <div className="text-right">Actions</div>}
          </div>
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-[12px] px-[12px] py-[10px] text-[13px] border-b border-newTableBorder last:border-b-0 items-center min-w-[600px]"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((c) => (
                <div key={c.header} className={c.align === 'right' ? 'text-right' : 'break-all'}>
                  {c.render(row)}
                </div>
              ))}
              {rowActions && <div className="flex gap-[8px] justify-end">{rowActions(row)}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[13px] opacity-70">
          {totalPages !== undefined ? `Page ${page + 1} of ${totalPages}` : `Page ${page + 1}`}
        </div>
        <div className="flex gap-[8px]">
          <Button secondary disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
            Previous
          </Button>
          <Button
            disabled={totalPages !== undefined ? page + 1 >= totalPages : !hasMore}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
