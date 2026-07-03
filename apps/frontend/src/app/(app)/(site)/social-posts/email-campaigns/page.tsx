import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { EmailCampaignsPage } from '@gitroom/frontend/components/social-posts/email-campaigns-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Email Campaigns`,
  description: 'Generate newsletter, welcome, and promotional email campaigns',
};

export default async function EmailCampaignsRoute() {
  return <EmailCampaignsPage />;
}
