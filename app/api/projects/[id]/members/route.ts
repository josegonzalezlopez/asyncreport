import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { projectService } from '@/lib/services/project.service';
import { assignMemberSchema } from '@/lib/validators/project.schema';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const { id: projectId } = await params;

    const project = await projectService.findById(projectId);
    if (!project) return errorResponse('Proyecto no encontrado', 404);

    const body: unknown = await req.json();
    const parsed = assignMemberSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation error', 400, parsed.error.flatten());
    }

    const membership = await projectService.assignMember(projectId, parsed.data);
    return successResponse(membership, 201, 'Miembro asignado al proyecto');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const { id: projectId } = await params;
    const { userId } = (await req.json()) as { userId?: string };

    if (!userId) return errorResponse('userId es requerido', 400);

    await projectService.removeMember(projectId, userId);
    return successResponse({ removed: true }, 200, 'Miembro removido del proyecto');
  } catch (err) {
    return handleApiError(err);
  }
}
