import { Metadata } from 'next';
import { Suspense } from 'react';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { UnifiedOnboarding } from '@gitroom/frontend/components/onboarding/unified/unified-onboarding';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} Onboarding`,
  description: '',
};

export default async function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <UnifiedOnboarding />
    </Suspense>
  );
}
