import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { projectService } from '@/lib/services/project.service';
import { createProjectSchema } from '@/lib/validators/project.schema';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const projects = await projectService.findAll();
    return successResponse(projects);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const body: unknown = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation error', 400, parsed.error.flatten());
    }

    const project = await projectService.create(parsed.data);
    return successResponse(project, 201, 'Proyecto creado correctamente');
  } catch (err) {
    return handleApiError(err);
  }
}
