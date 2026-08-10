export const dynamic = 'force-dynamic';
import { BillingV2Component } from '@gitroom/frontend/components/billing/billing-v2.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PageShell, PageBody } from '@gitroom/frontend/components/new-layout/page-system';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Billing`,
  description: '',
};

export default async function Page() {
  return (
    <PageShell className="bg-[#EEF1EA]">
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link
        href="https://cdn.jsdelivr.net/fontsource/css/anton@latest/index.css"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/fontsource/css/space-mono@latest/index.css"
        rel="stylesheet"
      />
      <PageBody className="overflow-y-auto">
          <BillingV2Component />
      </PageBody>
    </PageShell>
  );
}
