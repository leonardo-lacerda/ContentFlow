import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { BrandListPage } from '@gitroom/frontend/components/brand-dna/brand-list-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Brands`,
  description: 'Manage your brand profiles',
};

export default async function BrandsPage() {
  return <BrandListPage />;
}
