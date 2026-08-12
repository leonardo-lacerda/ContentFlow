import { AdminDomainPage } from '@gitroom/frontend/components/admin/admin-domain-page.component';

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <AdminDomainPage section={section} />;
}
