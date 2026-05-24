import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { CompanyOnboardingComponent } from '@gitroom/frontend/components/onboarding/company-onboarding.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Onboarding`,
  description: '',
};

export default async function CompanyOnboardingPage() {
  return <CompanyOnboardingComponent />;
}
