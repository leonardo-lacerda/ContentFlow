'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';

export const EmptyState: FC<{
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  secondary?: ReactNode;
  className?: string;
}> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading,
  secondary,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-1 flex-col items-center justify-center gap-[16px] text-center px-6 py-16 min-h-[320px]',
        className
      )}
    >
      {icon ? (
        <div className="w-[48px] h-[48px] rounded-[12px] bg-newSettings border border-newTableBorder flex items-center justify-center text-textItemBlur">
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-[8px] max-w-[380px]">
        <h2 className="text-[18px] font-[600] text-newTextColor leading-snug">
          {title}
        </h2>
        {description ? (
          <p className="text-[14px] text-textItemBlur leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {(actionLabel && onAction) || secondary ? (
        <div className="flex items-center gap-[10px] flex-wrap justify-center pt-[4px]">
          {actionLabel && onAction ? (
            <Button onClick={onAction} loading={actionLoading}>
              {actionLabel}
            </Button>
          ) : null}
          {secondary}
        </div>
      ) : null}
    </div>
  );
};
