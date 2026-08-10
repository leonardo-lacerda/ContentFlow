export const dynamic = 'force-dynamic';
import { SettingsPopup } from '@gitroom/frontend/components/layout/settings.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PageShell } from '@gitroom/frontend/components/new-layout/page-system';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Settings`,
  description: '',
};

export default async function Page() {
  return (
    <PageShell variant="split">
      <SettingsPopup />
    </PageShell>
  );
}
