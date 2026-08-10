import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CreativePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  redirect(
    params.view === 'projects' ? '/studio/new?view=projects' : '/studio/new'
  );
}
