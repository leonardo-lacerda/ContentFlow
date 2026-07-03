import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { VideoScriptsPage } from '@gitroom/frontend/components/social-posts/video-scripts-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Video Scripts`,
  description: 'Generate short-form video scripts from carousels',
};

export default async function VideoScriptsRoute() {
  return <VideoScriptsPage />;
}
