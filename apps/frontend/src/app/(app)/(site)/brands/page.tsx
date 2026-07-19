export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

/** ContentFlow v1: multi-marca removido — single brand */
export default async function Index() {
  redirect('/brand');
}
