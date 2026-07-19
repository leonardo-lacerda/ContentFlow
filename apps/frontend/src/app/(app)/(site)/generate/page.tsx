export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { GeneratePage } from '@gitroom/frontend/components/ai-generate/generate-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Gerar carrossel',
  description: 'Estúdio de carrosséis com Brand DNA',
};

export default async function Index() {
  return <GeneratePage />;
}
