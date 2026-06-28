import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { ContentSwipePage } from '@gitroom/frontend/components/content-ideas/content-swipe-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Content Swipe`,
  description: 'Approve or reject carousel ideas',
};

export default async function ContentSwipeRoute() {
  return <ContentSwipePage />;
}
