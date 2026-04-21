import { getAuthContext } from '@/lib/helpers/auth';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { notificationService } from '@/lib/services/notification.service';

/** PATCH /api/notifications/read-all — marca todas las notificaciones del usuario como leídas. */
export async function PATCH() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const result = await notificationService.markAllAsRead(ctx.dbUserId);
    return successResponse({ updated: result.count }, 200, 'Todas marcadas como leídas');
  } catch (error) {
    return handleApiError(error);
  }
}
