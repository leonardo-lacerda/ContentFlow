'use client';

import { useMemo, useState } from 'react';
import { Loader, Cpu, X } from 'lucide-react';
import { useJobs } from './generation-jobs.hooks';
import clsx from 'clsx';

export function JobsIndicator() {
  const { data } = useJobs();
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const raw = Array.isArray(data) ? data : (data as any)?.jobs || [];
    return raw as any[];
  }, [data]);

  const active = useMemo(
    () =>
      list.filter((j) =>
        ['QUEUED', 'RUNNING', 'WAITING_PROVIDER', 'PENDING'].includes(j.status)
      ),
    [list]
  );

  const recent = list.slice(0, 8);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative hover:text-newTextColor flex items-center"
        title="Gerações"
        aria-label="Gerações em andamento"
      >
        {active.length > 0 ? (
          <Loader className="w-5 h-5 animate-spin" />
        ) : (
          <Cpu className="w-5 h-5" />
        )}
        {active.length > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-btnPrimary text-btnText text-[10px] font-[700] flex items-center justify-center">
            {active.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[300]"
            onClick={() => setOpen(false)}
          />
          <div
            className={clsx(
              'absolute end-0 top-[calc(100%+10px)] z-[310]',
              'w-[320px] max-h-[360px] overflow-y-auto',
              'rounded-[12px] border border-newTableBorder bg-newBgColorInner shadow-lg p-3'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-[700] text-newTextColor">
                Gerações
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-textItemBlur hover:text-newTextColor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-textItemBlur py-4 text-center">
                Nenhuma geração recente
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {recent.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 hover:bg-boxHover text-sm"
                  >
                    <span className="truncate font-[600] text-newTextColor">
                      {job.type || job.kind || 'Job'}
                    </span>
                    <span className="text-[11px] text-textItemBlur shrink-0">
                      {job.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
