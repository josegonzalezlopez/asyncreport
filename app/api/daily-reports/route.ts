import { getAuthContext } from '@/lib/helpers/auth';
import { dailyService } from '@/lib/services/daily.service';
import { createDailySchema } from '@/lib/validators/daily.schema';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const body: unknown = await req.json();
    const parsed = createDailySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation error', 400, parsed.error.flatten());
    }

    const { projectId, userTimezone } = parsed.data;

    const canReport = await dailyService.canUserReport(
      ctx.dbUserId,
      projectId,
      userTimezone,
    );

    if (!canReport) {
      return errorResponse(
        'Ya cargaste tu daily para este proyecto hoy',
        409,
      );
    }

    const daily = await dailyService.create(ctx.dbUserId, parsed.data);
    return successResponse(daily, 201, 'Daily cargado correctamente');
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('FORBIDDEN')) {
      return errorResponse('No perteneces a este proyecto', 403);
    }
    return handleApiError(err);
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return errorResponse('projectId requerido', 400);

    const cursor = searchParams.get('cursor') ?? undefined;
    const take = Number(searchParams.get('take') ?? 20);

    const result = await dailyService.findByProject(projectId, { take, cursor });
    return successResponse(result);
  } catch (err) {
    return handleApiError(err);
  }
}
