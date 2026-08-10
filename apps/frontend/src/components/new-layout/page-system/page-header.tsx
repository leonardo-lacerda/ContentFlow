'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

export const PageHeader: FC<{
  description?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
  className?: string;
}> = ({ description, filters, actions, tabs, className }) => {
  return (
    <div
      className={clsx(
        'cf-page-header flex flex-col shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-[12px] px-[20px] min-h-[56px] py-[10px]">
        <div className="flex-1 min-w-0">
          {description ? (
            <p className="text-[13px] text-textItemBlur truncate leading-relaxed max-w-[720px] tracking-[-0.005em]">
              {description}
            </p>
          ) : null}
        </div>
        {filters ? (
          <div className="flex items-center gap-[8px] shrink-0">{filters}</div>
        ) : null}
        {actions ? (
          <div className="flex items-center gap-[8px] shrink-0">{actions}</div>
        ) : null}
      </div>
      {tabs ? (
        <div className="px-[20px] pb-[10px] flex items-center gap-[6px] flex-wrap">
          {tabs}
        </div>
      ) : null}
    </div>
  );
};
