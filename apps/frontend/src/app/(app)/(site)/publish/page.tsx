export const dynamic = 'force-dynamic';

import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';
import { Metadata } from 'next';
import { PageShell } from '@gitroom/frontend/components/new-layout/page-system';

export const metadata: Metadata = {
  title: 'ContentFlow — Calendário',
  description: 'Agende e publique nas suas redes',
};

export default async function Index() {
  return (
    <PageShell variant="flush" className="!flex-row">
      <LaunchesComponent />
    </PageShell>
  );
}
