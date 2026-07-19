export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'ContentFlow — Ideias',
};

/** Lista de ideias vive no Swipe no v1 */
export default async function Index() {
  redirect('/swipe');
}
