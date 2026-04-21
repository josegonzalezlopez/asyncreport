import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';
import { prisma } from '@/lib/db';

/**
 * GET /api/projects/my
 * Retorna los proyectos en los que el usuario autenticado es miembro.
 * Usado por el CLI para mostrar el selector de proyectos.
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    // ADMIN puede ver todos los proyectos
    if (requireRole(ctx, 'ADMIN')) {
      const projects = await prisma.project.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, code: true, status: true },
        orderBy: { name: 'asc' },
      });
      return successResponse(projects);
    }

    const memberships = await prisma.projectUser.findMany({
      where: { userId: ctx.dbUserId },
      include: {
        project: {
          select: { id: true, name: true, code: true, status: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const projects = memberships
      .filter((m) => m.project.status === 'ACTIVE')
      .map((m) => m.project);

    return successResponse(projects);
  } catch (err) {
    return handleApiError(err);
  }
}
