import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { BrandDetailPage } from '@gitroom/frontend/components/brand-dna/brand-detail-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Marca`,
  description: 'Edite o perfil da marca e o Brand DNA',
};

export default async function BrandDetailRoute() {
  return <BrandDetailPage />;
}
