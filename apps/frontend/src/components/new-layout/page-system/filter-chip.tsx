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
        'h-[32px] px-[12px] rounded-[8px] text-[12px] font-[600] transition-colors whitespace-nowrap',
        active
          ? 'bg-boxFocused text-textItemFocused'
          : 'bg-newSettings text-textItemBlur hover:text-newTextColor border border-newTableBorder',
        className
      )}
    >
      {children}
    </button>
  );
};
