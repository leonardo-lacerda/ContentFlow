export const dynamic = 'force-dynamic';
import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { PageShell } from '@gitroom/frontend/components/new-layout/page-system';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Calendário`,
  description: '',
};

export default async function Index() {
  return (
    <PageShell variant="flush" className="!flex-row">
      <LaunchesComponent />
    </PageShell>
  );
}
