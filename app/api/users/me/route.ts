import { getAuthContext } from '@/lib/helpers/auth';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2, { error: 'El nombre debe tener al menos 2 caracteres' }).optional(),
  specialization: z
    .enum(['DEVELOPER', 'DESIGNER', 'ANALYST', 'QA', 'DEVOPS', 'OTHER'] as const)
    .optional(),
});

/** GET /api/users/me — perfil completo con proyectos activos. */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: ctx.dbUserId },
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        role: true,
        specialization: true,
        createdAt: true,
        projectMemberships: {
          include: {
            project: {
              select: { id: true, name: true, code: true, status: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) return errorResponse('Usuario no encontrado', 404);

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/users/me — actualiza nombre y/o especialización (no el role). */
export async function PATCH(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const body: unknown = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Datos inválidos', 400, parsed.error.flatten());
    }

    // role nunca se puede actualizar desde este endpoint
    const { name, specialization } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: ctx.dbUserId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(specialization !== undefined ? { specialization } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        imageUrl: true,
        role: true,
        specialization: true,
      },
    });

    return successResponse(updated, 200, 'Perfil actualizado');
  } catch (error) {
    return handleApiError(error);
  }
}
