'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// ContentFlow v1: ads/email/video → backlog (barra oculta)
const TABS = [
  {
    href: '/posts',
    label: 'Posts',
    match: (path: string) =>
      path === '/posts' ||
      path === '/posts/' ||
      path === '/posts' ||
      path === '/social-posts/',
  },
] as const;

export function CreativesTabs() {
  const pathname = usePathname() || '';

  if (TABS.length <= 1) {
    return null;
  }

  return (
    <div className="shrink-0 border-b border-newTableBorder bg-newBgColorInner px-[20px]">
      <div className="flex items-center gap-[4px] overflow-x-auto py-[10px]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={clsx(
                'h-[32px] px-[12px] rounded-[8px] text-[12px] font-[600] whitespace-nowrap transition-colors',
                active
                  ? 'bg-boxFocused text-textItemFocused'
                  : 'text-textItemBlur hover:text-newTextColor hover:bg-boxHover'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
