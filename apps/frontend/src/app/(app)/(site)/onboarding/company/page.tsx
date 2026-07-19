export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

/** Legacy Company Profile onboarding → unified */
export default async function Index() {
  redirect('/onboarding');
}
