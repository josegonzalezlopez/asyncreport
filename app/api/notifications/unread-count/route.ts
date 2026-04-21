import { getAuthContext } from '@/lib/helpers/auth';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { notificationService } from '@/lib/services/notification.service';

/** GET /api/notifications/unread-count — llamado frecuentemente por el badge de la campana. */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const count = await notificationService.countUnread(ctx.dbUserId);
    return successResponse({ count });
  } catch (error) {
    return handleApiError(error);
  }
}
