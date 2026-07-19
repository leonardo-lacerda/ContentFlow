export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { EmailCampaignsPage } from '@gitroom/frontend/components/social-posts/email-campaigns-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — E-mail',
  description: 'Campanhas e sequências de e-mail com o DNA da marca',
};

export default async function EmailPage() {
  return <EmailCampaignsPage />;
}
