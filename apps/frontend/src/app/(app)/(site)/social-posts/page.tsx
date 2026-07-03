import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { SocialPostsPage } from '@gitroom/frontend/components/social-posts/social-posts-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Social Posts`,
  description: 'Generate platform-optimized social media posts',
};

export default async function SocialPostsRoute() {
  return <SocialPostsPage />;
}
