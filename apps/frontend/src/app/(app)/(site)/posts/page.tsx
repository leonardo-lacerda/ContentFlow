export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { SocialPostsPage } from '@gitroom/frontend/components/social-posts/social-posts-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Posts',
  description: 'Gere posts sociais com a voz da marca',
};

export default async function Index() {
  return <SocialPostsPage />;
}
