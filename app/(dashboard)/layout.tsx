import type { ReactNode } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services/user.service';
import { Sidebar } from '@/components/layout/sidebar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (!userId) redirect('/sign-in');

  let user = await userService.findByClerkId(userId);

  // JIT provisioning: el webhook puede no haber disparado en desarrollo.
  // Si el usuario está autenticado en Clerk pero no existe en DB, lo creamos aquí.
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) redirect('/sign-in');

    user = await userService.syncFromClerk({
      id: clerkUser.id,
      email_addresses: clerkUser.emailAddresses.map((e) => ({
        id: e.id,
        email_address: e.emailAddress,
      })),
      primary_email_address_id: clerkUser.primaryEmailAddressId ?? '',
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      image_url: clerkUser.imageUrl,
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
