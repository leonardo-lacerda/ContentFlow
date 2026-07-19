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
        'h-[32px] px-[12px] rounded-full text-[12px] font-[600] transition-colors whitespace-nowrap border',
        active
          ? 'bg-boxFocused text-textItemFocused border-transparent'
          : 'bg-newBgColorInner text-textItemBlur border-newTableBorder hover:text-newTextColor hover:border-[color:var(--cf-line-strong,#d6d3d1)]',
        className
      )}
    >
      {children}
    </button>
  );
};
