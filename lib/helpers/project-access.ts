import { prisma } from '@/lib/db';
import { projectService } from '@/lib/services/project.service';
import type { AuthContext } from '@/lib/types';

function forbidden(msg: string): never {
  throw new Error(`FORBIDDEN: ${msg}`);
}

/**
 * Ver lectura de metadatos/miembros de un proyecto: ADMIN o miembro.
 * Usar en listados (feed) y detalle de proyecto.
 */
export async function assertCanReadProject(
  ctx: AuthContext,
  projectId: string,
): Promise<void> {
  if (ctx.role === 'ADMIN') return;
  const ok = await projectService.isMember(projectId, ctx.dbUserId);
  if (!ok) forbidden('No perteneces a este proyecto');
}

/**
 * Alineado con `dashboard/p/[projectId]/ai-summary`: ADMIN, o TECH_LEAD con
 * isTechLead en el proyecto activo.
 */
export async function assertCanAccessAISummaryProject(
  ctx: AuthContext,
  projectId: string,
): Promise<void> {
  if (ctx.role === 'ADMIN') return;
  if (ctx.role === 'USER') {
    forbidden('Solo Tech Lead o Admin pueden acceder a resúmenes de IA');
  }
  if (ctx.role === 'TECH_LEAD') {
    const row = await prisma.projectUser.findUnique({
      where: { userId_projectId: { userId: ctx.dbUserId, projectId } },
      include: { project: { select: { status: true } } },
    });
    if (!row || row.project.status !== 'ACTIVE') {
      forbidden('No perteneces a este proyecto o no está activo');
    }
    if (!row.isTechLead) {
      forbidden('Debes ser Tech Lead del proyecto');
    }
  }
}

/**
 * Polling de un AISummary: mismo criterio que el historial del proyecto.
 */
export async function assertCanViewAISummaryRecord(
  ctx: AuthContext,
  summaryProjectId: string,
): Promise<void> {
  await assertCanAccessAISummaryProject(ctx, summaryProjectId);
}
