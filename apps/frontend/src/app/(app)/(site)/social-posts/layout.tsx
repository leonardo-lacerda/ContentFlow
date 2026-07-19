import { ReactNode } from 'react';
import { CreativesTabs } from '@gitroom/frontend/components/social-posts/creatives-tabs.component';

export default function SocialPostsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
      <CreativesTabs />
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}
