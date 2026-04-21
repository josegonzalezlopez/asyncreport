import { getAuthContext } from '@/lib/helpers/auth';
import { projectService } from '@/lib/services/project.service';
import { dailyService } from '@/lib/services/daily.service';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { id: projectId } = await params;

    const isMember = await projectService.isMember(projectId, ctx.dbUserId);
    const isAdmin = ctx.role === 'ADMIN';

    if (!isMember && !isAdmin) {
      return errorResponse('No perteneces a este proyecto', 403);
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const take = Number(searchParams.get('take') ?? 20);

    const result = await dailyService.findByProject(projectId, { take, cursor });
    return successResponse(result);
  } catch (err) {
    return handleApiError(err);
  }
}
