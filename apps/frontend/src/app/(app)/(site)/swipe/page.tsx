export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { ContentSwipePage } from '@gitroom/frontend/components/content-ideas/content-swipe-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Content Swipe',
  description: 'Aprove ou rejeite ideias no estilo Tinder',
};

export default async function Index() {
  return <ContentSwipePage />;
}
