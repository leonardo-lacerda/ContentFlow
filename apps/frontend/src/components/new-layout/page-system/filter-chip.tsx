'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';

export const FilterChip: FC<{
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}> = ({ active, onClick, children, className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'h-[32px] px-[12px] rounded-full text-[12px] font-[600] tracking-[-0.005em]',
        'transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        'whitespace-nowrap border active:scale-[0.97]',
        active
          ? 'bg-boxFocused text-textItemFocused border-transparent shadow-cfSm'
          : 'bg-newBgColorInner text-textItemBlur border-newTableBorder hover:text-newTextColor hover:border-[color:var(--cf-line-strong,#d6d3d1)] hover:shadow-xs',
        className
      )}
    >
      {children}
    </button>
  );
};
