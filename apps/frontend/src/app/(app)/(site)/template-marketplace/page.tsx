import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { TemplateMarketplacePage } from '@gitroom/frontend/components/templates/template-marketplace-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Template Marketplace`,
  description: 'Descubra e instale templates de carrossel',
};

export default async function TemplateMarketplaceRoute() {
  return <TemplateMarketplacePage />;
}
