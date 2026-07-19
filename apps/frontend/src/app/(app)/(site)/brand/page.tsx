export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

/** Atalho: /brand → lista de marcas */
export default async function Index() {
  redirect('/brands');
}
