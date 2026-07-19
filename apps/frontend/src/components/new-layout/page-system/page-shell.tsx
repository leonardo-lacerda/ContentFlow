'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

export type PageShellVariant = 'scroll' | 'flush' | 'split';

export const PageShell: FC<{
  children: ReactNode;
  variant?: PageShellVariant;
  className?: string;
}> = ({ children, variant = 'scroll', className }) => {
  return (
    <div
      className={clsx(
        'bg-newBgColorInner flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden',
        'transition-[background-color] duration-200',
        variant === 'split' && 'flex-row',
        className
      )}
    >
      {children}
    </div>
  );
};
