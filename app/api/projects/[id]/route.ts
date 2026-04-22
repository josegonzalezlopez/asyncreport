import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { assertCanReadProject } from '@/lib/helpers/project-access';
import { projectService } from '@/lib/services/project.service';
import { updateProjectSchema } from '@/lib/validators/project.schema';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    await assertCanReadProject(ctx, id);

    const project = await projectService.findById(id);
    if (!project) return errorResponse('Proyecto no encontrado', 404);

    return successResponse(project);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const { id } = await params;
    const project = await projectService.findById(id);
    if (!project) return errorResponse('Proyecto no encontrado', 404);

    const body: unknown = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation error', 400, parsed.error.flatten());
    }

    const updated = await projectService.update(id, parsed.data);
    return successResponse(updated, 200, 'Proyecto actualizado');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const { id } = await params;
    const project = await projectService.findById(id);
    if (!project) return errorResponse('Proyecto no encontrado', 404);

    const archived = await projectService.archive(id);
    return successResponse(archived, 200, 'Proyecto archivado');
  } catch (err) {
    return handleApiError(err);
  }
}
