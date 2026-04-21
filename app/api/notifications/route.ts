import { getAuthContext } from '@/lib/helpers/auth';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { notificationService } from '@/lib/services/notification.service';

/** GET /api/notifications?isRead=true|false&cursor=xxx */
export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const isReadParam = searchParams.get('isRead');
    const cursor = searchParams.get('cursor') ?? undefined;
    const take = Number(searchParams.get('take') ?? '20');

    const isRead =
      isReadParam === 'true' ? true
      : isReadParam === 'false' ? false
      : undefined;

    const result = await notificationService.findByUser(ctx.dbUserId, {
      take,
      cursor,
      isRead,
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
