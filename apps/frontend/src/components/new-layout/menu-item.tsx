'use client';
import { FC, ReactNode, memo } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  onClick?: () => void;
}> = memo(({ label, icon, path, onClick }) => {
  const currentPath = usePathname() || '';
  // Exact match for home `/`; prefix match for nested routes
  const isActive =
    path !== '#' && path.indexOf('http') !== 0
      ? path === '/'
        ? currentPath === '/'
        : currentPath === path || currentPath.startsWith(path + '/')
      : false;

  const className = clsx(
    'w-full h-[40px] gap-[10px] flex flex-row items-center rounded-[10px] shrink-0',
    'justify-center group-hover/sidebar:justify-start',
    'px-0 group-hover/sidebar:px-[10px]',
    'text-[12px] font-[600] whitespace-nowrap overflow-hidden',
    'transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
    'hover:text-textItemFocused hover:bg-boxFocused active:scale-[0.97]',
    isActive
      ? 'text-textItemFocused bg-boxFocused shadow-cfSm'
      : 'text-textItemBlur'
  );

  const content = (
    <>
      <div className="w-[20px] h-[20px] flex items-center justify-center shrink-0 [&>svg]:max-w-[18px] [&>svg]:max-h-[18px]">
        {icon}
      </div>
      <span className="hidden group-hover/sidebar:inline truncate leading-none min-w-0">
        {label}
      </span>
    </>
  );

  const tooltipProps = {
    'data-tooltip-id': 'tooltip',
    'data-tooltip-content': label,
    'data-tooltip-place': 'right' as const,
  };

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} {...tooltipProps}>
        {content}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      {...(path.indexOf('http') === 0 ? { target: '_blank' } : {})}
      className={className}
      {...tooltipProps}
    >
      {content}
    </Link>
  );
});
