'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

export const PageBody: FC<{
  children: ReactNode;
  className?: string;
  /** Remove default padding (grids, tables edge-to-edge) */
  flush?: boolean;
}> = ({ children, className, flush }) => {
  return (
    <div
      className={clsx(
        'flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden',
        !flush && 'p-[20px] gap-[16px]',
        className
      )}
    >
      {children}
    </div>
  );
};
