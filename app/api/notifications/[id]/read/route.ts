import { getAuthContext } from '@/lib/helpers/auth';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { notificationService } from '@/lib/services/notification.service';

/** PATCH /api/notifications/:id/read — marca una notificación específica como leída. */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const notification = await notificationService.markAsRead(id, ctx.dbUserId);
    return successResponse(notification);
  } catch (error) {
    return handleApiError(error);
  }
}
