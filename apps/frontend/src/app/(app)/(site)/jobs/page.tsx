import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { JobsListPage } from '@gitroom/frontend/components/generation-jobs/jobs-list-page.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Jobs`,
  description: 'Acompanhe os jobs de geracao de conteudo',
};

export default async function JobsPage() {
  return <JobsListPage />;
}
