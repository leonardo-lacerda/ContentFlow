import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { AdCreativesPage } from '@gitroom/frontend/components/social-posts/ad-creatives-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Ad Creatives`,
  description: 'Generate ad creatives for Meta and LinkedIn campaigns',
};

export default async function AdCreativesRoute() {
  return <AdCreativesPage />;
}
