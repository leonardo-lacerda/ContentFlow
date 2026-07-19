import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { BrandListPage } from '@gitroom/frontend/components/brand-dna/brand-list-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Marcas`,
  description: 'Gerencie seus perfis de marca e Brand DNA',
};

export default async function BrandsPage() {
  return <BrandListPage />;
}
