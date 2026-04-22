import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AR_CURRENT_PROJECT_COOKIE } from '@/lib/constants/dashboard-workspace';

export { AR_CURRENT_PROJECT_COOKIE };

/**
 * Resuelve un projectId seguro para el sidebar y redirects:
 * cookie si el proyecto está en la lista permitida; si no, el primero.
 * ADMIN: cualquier proyecto no archivado; el resto: solo con membresía.
 */
export async function resolveSafeCurrentProjectId(
  cookieProjectId: string | undefined,
  userId: string,
  role: Role,
): Promise<string | null> {
  const where =
    role === 'ADMIN'
      ? { status: { not: 'ARCHIVED' as const } }
      : {
          memberships: { some: { userId } },
          status: { not: 'ARCHIVED' as const },
        };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  const ids = new Set(projects.map((p) => p.id));
  if (cookieProjectId && ids.has(cookieProjectId)) {
    return cookieProjectId;
  }
  return projects[0]?.id ?? null;
}

/**
 * Para Resumen IA: TECH_LEAD solo puede usar proyectos donde es TL; ADMIN igual que
 * {@link resolveSafeCurrentProjectId}.
 */
export async function resolveSafeCurrentProjectIdForAi(
  cookieProjectId: string | undefined,
  user: { id: string; role: Role },
): Promise<string | null> {
  if (user.role === 'ADMIN') {
    return resolveSafeCurrentProjectId(cookieProjectId, user.id, user.role);
  }

  const rows = await prisma.projectUser.findMany({
    where: { userId: user.id, isTechLead: true },
    include: { project: { select: { id: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const activeIds = rows
    .filter((r) => r.project.status === 'ACTIVE')
    .map((r) => r.project.id);

  if (cookieProjectId && activeIds.includes(cookieProjectId)) {
    return cookieProjectId;
  }
  return activeIds[0] ?? null;
}
