import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { userService } from '@/lib/services/user.service';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'ADMIN')) return errorResponse('Forbidden', 403);

    const users = await userService.findAll();

    const sanitized = users
      .filter((u) => !u.clerkUserId.startsWith('DELETED_'))
      .map(({ id, name, email, imageUrl, role, specialization }) => ({
        id,
        name,
        email,
        imageUrl,
        role,
        specialization,
      }));

    return successResponse(sanitized);
  } catch (err) {
    return handleApiError(err);
  }
}
