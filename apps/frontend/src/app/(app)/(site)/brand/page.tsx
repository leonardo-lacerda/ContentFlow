export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { BrandSinglePage } from '@gitroom/frontend/components/brand-dna/brand-single-page.component';

export const metadata: Metadata = {
  title: 'ContentFlow — Minha marca',
  description: 'Brand DNA — uma marca por conta',
};

export default async function Index() {
  return <BrandSinglePage />;
}
