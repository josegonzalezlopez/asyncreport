import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/helpers/auth';
import { requireRole } from '@/lib/helpers/auth';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx || !requireRole(ctx, 'ADMIN')) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
