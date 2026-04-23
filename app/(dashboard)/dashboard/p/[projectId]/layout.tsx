import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { userService } from '@/lib/services/user.service';
import { projectService } from '@/lib/services/project.service';

type Props = {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
};

export default async function ProjectWorkspaceLayout({ children, params }: Props) {
  const { projectId } = await params;

  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await userService.findByClerkId(userId);
  if (!user) redirect('/sign-in');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true },
  });

  if (!project || project.status !== 'ACTIVE') {
    redirect('/dashboard/projects');
  }

  const canAccessWorkspace =
    user.role === 'ADMIN' || (await projectService.isMember(projectId, user.id));
  if (!canAccessWorkspace) {
    redirect('/dashboard/forbidden');
  }

  return <>{children}</>;
}
