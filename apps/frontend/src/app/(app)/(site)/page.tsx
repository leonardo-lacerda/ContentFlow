export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { StudioHome } from '@gitroom/frontend/components/studio/studio-home.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Estúdio',
  description: 'DNA → Swipe → Criar → Publicar',
};

export default async function Index() {
  return <StudioHome />;
}
