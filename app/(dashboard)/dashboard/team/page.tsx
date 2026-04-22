import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { userService } from '@/lib/services/user.service';
import { resolveSafeCurrentProjectId } from '@/lib/helpers/dashboard-workspace';
import { AR_CURRENT_PROJECT_COOKIE } from '@/lib/constants/dashboard-workspace';

export default async function LegacyTeamRedirect() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const cookie = (await cookies()).get(AR_CURRENT_PROJECT_COOKIE)?.value;
  const id = await resolveSafeCurrentProjectId(cookie, user.id, user.role);
  if (!id) redirect('/dashboard/projects');
  redirect(`/dashboard/p/${id}/team`);
}
