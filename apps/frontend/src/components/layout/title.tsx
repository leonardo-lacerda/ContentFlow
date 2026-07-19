'use client';

import { useMenuItem } from '@gitroom/frontend/components/layout/top.menu';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export const Title = () => {
  const path = usePathname();
  const { all } = useMenuItem();

  const current = useMemo(() => {
    // Prefer longest matching path prefix so nested routes keep a sensible title
    // (e.g. /social-posts/video-scripts → Video Scripts if present, else Criativos).
    const items = Array.isArray(all) ? all : [];
    const matches = items
      .filter((item) => item.path && item.path !== '#')
      .filter((item) => path === item.path || path.startsWith(item.path + '/'))
      .sort((a, b) => b.path.length - a.path.length);
    return matches[0];
  }, [all, path]);

  return (
    <div className="flex">
      <h1 className="text-[24px] font-[600] font-serif tracking-[-0.02em] flex gap-[20px] items-center text-newTextColor">
        <div>{current?.name || 'ContentFlow'}</div>
      </h1>
    </div>
  );
};
