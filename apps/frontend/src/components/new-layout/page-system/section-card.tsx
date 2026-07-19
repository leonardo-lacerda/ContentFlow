'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

export const SectionCard: FC<{
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}> = ({ children, className, title, description, actions }) => {
  return (
    <div
      className={clsx(
        'bg-newBgColorInner border border-newTableBorder rounded-[14px] p-[16px] shadow-cfSm',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-start gap-[12px] mb-[12px]">
          <div className="flex-1 min-w-0">
            {title ? (
              <h3 className="text-[14px] font-[600] text-newTextColor tracking-[-0.01em]">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="text-[12px] text-textItemBlur mt-[2px] leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
};
