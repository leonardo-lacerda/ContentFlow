export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { ChannelsPage } from '@gitroom/frontend/components/channels/channels-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Canais',
  description: 'Conecte Instagram, Facebook, LinkedIn, X e TikTok',
};

export default async function Index() {
  return <ChannelsPage />;
}
