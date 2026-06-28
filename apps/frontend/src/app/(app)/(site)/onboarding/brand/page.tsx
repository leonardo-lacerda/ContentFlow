import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { OnboardingWizard } from '@gitroom/frontend/components/onboarding/onboarding-wizard.component';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Onboarding`,
  description: 'Configure sua marca e gere seu primeiro carrossel',
};

export default async function OnboardingBrandPage() {
  return <OnboardingWizard />;
}
