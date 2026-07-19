export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { AdCreativesPage } from '@gitroom/frontend/components/social-posts/ad-creatives-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Anúncios',
  description: 'Gere criativos de anúncio a partir do DNA e das ideias da marca',
};

export default async function AdsPage() {
  return <AdCreativesPage />;
}
