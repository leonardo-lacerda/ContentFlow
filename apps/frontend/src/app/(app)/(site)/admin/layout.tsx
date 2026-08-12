import React from 'react';
import { AdminShellComponent } from '@gitroom/frontend/components/admin/admin-shell.component';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShellComponent>{children}</AdminShellComponent>;
}
