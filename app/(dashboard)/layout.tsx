import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services/user.service';
import { Sidebar } from '@/components/layout/sidebar';
import { AR_CURRENT_PROJECT_COOKIE } from '@/lib/constants/dashboard-workspace';
import {
  resolveSafeCurrentProjectId,
  resolveSafeCurrentProjectIdForAi,
} from '@/lib/helpers/dashboard-workspace';

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

  const cookie = (await cookies()).get(AR_CURRENT_PROJECT_COOKIE)?.value;
  const workspaceProjectId = await resolveSafeCurrentProjectId(cookie, user.id, user.role);
  const aiWorkspaceProjectId = await resolveSafeCurrentProjectIdForAi(cookie, user);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={user.role}
        workspaceProjectId={workspaceProjectId}
        aiWorkspaceProjectId={aiWorkspaceProjectId}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
