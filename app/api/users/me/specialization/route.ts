import { z } from 'zod';
import { getAuthContext } from '@/lib/helpers/auth';
import { userService } from '@/lib/services/user.service';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';

const schema = z.object({
  specialization: z.enum([
    'DEVELOPER',
    'DESIGNER',
    'ANALYST',
    'QA',
    'DEVOPS',
    'OTHER',
  ]),
});

export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const body: unknown = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid specialization', 400, parsed.error.flatten());
    }

    const user = await userService.updateSpecialization(
      ctx.dbUserId,
      parsed.data.specialization,
    );

    return successResponse({ specialization: user.specialization });
  } catch (err) {
    return handleApiError(err);
  }
}
