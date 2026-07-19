export const dynamic = 'force-dynamic';
import { BillingComponent } from '@gitroom/frontend/components/billing/billing.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PageShell, PageBody } from '@gitroom/frontend/components/new-layout/page-system';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Billing`,
  description: '',
};

export default async function Page() {
  return (
    <PageShell>
      <PageBody className="overflow-y-auto">
        <BillingComponent />
      </PageBody>
    </PageShell>
  );
}
