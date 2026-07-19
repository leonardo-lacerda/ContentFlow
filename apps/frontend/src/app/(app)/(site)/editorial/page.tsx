import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { EditorialPlanPage } from '@gitroom/frontend/components/editorial-plans/editorial-plan-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'
  } Calendário Editorial`,
  description: 'Planeje e gerencie seu calendário de conteúdo',
};

export default async function EditorialPage() {
  return <EditorialPlanPage />;
}
