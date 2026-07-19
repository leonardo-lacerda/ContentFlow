export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

/** ContentFlow v1: detalhe de marca unificado em /brand */
export default async function Index() {
  redirect('/brand');
}
