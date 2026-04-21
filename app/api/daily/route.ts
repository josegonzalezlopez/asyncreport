import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { dailyService } from '@/lib/services/daily.service';
import { createDailySchema } from '@/lib/validators/daily.schema';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { handleApiError } from '@/lib/helpers/handle-error';
import { prisma } from '@/lib/db';
import { toUTCDayStart } from '@/lib/helpers/dates';
import { z } from 'zod';

const createDailyFromCliSchema = createDailySchema.extend({
  asUserEmail: z.string().email('Email inválido').optional(),
});

/**
 * POST /api/daily
 * Crea un reporte diario. Usado principalmente por el CLI.
 * El projectId viene en el body (no en la URL como el route de admin).
 */
export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const body: unknown = await req.json();
    const parsed = createDailyFromCliSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation error', 400, parsed.error.flatten().fieldErrors);
    }

    const { asUserEmail, ...dailyData } = parsed.data;
    let targetUserId = ctx.dbUserId;

    // Solo ADMIN puede reportar en nombre de otro usuario.
    if (asUserEmail) {
      if (!requireRole(ctx, 'ADMIN')) {
        return errorResponse('Forbidden: solo ADMIN puede usar --as-user', 403);
      }

      const target = await prisma.user.findUnique({
        where: { email: asUserEmail },
        select: { id: true },
      });

      if (!target) {
        return errorResponse('Usuario destino no encontrado', 404);
      }

      targetUserId = target.id;
    }

    const canReport = await dailyService.canUserReport(
      targetUserId,
      dailyData.projectId,
      dailyData.userTimezone,
    );
    if (!canReport) {
      return errorResponse('Ya enviaste un reporte hoy para este proyecto', 409);
    }

    const daily = await dailyService.create(targetUserId, dailyData);
    return successResponse(daily, 201, 'Reporte enviado');
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * GET /api/daily?date=YYYY-MM-DD&projectId=...
 * Lista los reportes del usuario autenticado para una fecha (default: hoy).
 */
export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const projectId = searchParams.get('projectId') ?? undefined;

    const localDateISO =
      dateParam ??
      new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' });

    const dayStart = toUTCDayStart(localDateISO, 'UTC');
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const reports = await prisma.dailyReport.findMany({
      where: {
        userId: ctx.dbUserId,
        reportDate: { gte: dayStart, lt: dayEnd },
        ...(projectId ? { projectId } : {}),
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(reports);
  } catch (err) {
    return handleApiError(err);
  }
}
