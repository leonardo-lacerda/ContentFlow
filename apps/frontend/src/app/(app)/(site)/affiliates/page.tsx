import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { AffiliatesPage } from '@gitroom/frontend/components/affiliates/affiliates-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Afiliados`,
  description: 'Programa de afiliados - indique e ganhe comissão',
};

export default async function AffiliatesRoute() {
  return <AffiliatesPage />;
}
