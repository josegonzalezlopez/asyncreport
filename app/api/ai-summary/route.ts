import { after } from 'next/server';
import { getAuthContext, requireRole } from '@/lib/helpers/auth';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { aiService } from '@/lib/services/ai.service';
import { z } from 'zod';

const postSchema = z.object({
  projectId: z.string().min(1, { error: 'projectId es requerido' }),
});

/** POST /api/ai-summary — Inicia generación asíncrona. Responde 202 Accepted de inmediato. */
export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'TECH_LEAD', 'ADMIN')) {
      return errorResponse('Solo Tech Lead o Admin pueden generar resúmenes', 403);
    }

    const body: unknown = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('projectId es requerido', 400);
    }

    const { projectId } = parsed.data;

    const summaryId = await aiService.initiateSummary(projectId, ctx.dbUserId);

    // Procesar con Gemini después de enviar la respuesta (patrón 202 + polling)
    after(async () => {
      await aiService.processInBackground(summaryId);
    });

    return successResponse({ summaryId }, 202, 'Generación en progreso');
  } catch (error) {
    const err = error as Error;
    if (err.message?.startsWith('RATE_LIMIT_EXCEEDED')) {
      return errorResponse(
        err.message.replace('RATE_LIMIT_EXCEEDED: ', ''),
        429,
      );
    }
    if (err.message?.startsWith('NO_REPORTS')) {
      return errorResponse(
        'No hay reportes del equipo para hoy. Espera a que al menos un miembro reporte.',
        422,
      );
    }
    return handleApiError(error);
  }
}

/** GET /api/ai-summary?projectId=xxx — Historial de resúmenes del proyecto. */
export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!requireRole(ctx, 'TECH_LEAD', 'ADMIN')) {
      return errorResponse('Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return errorResponse('projectId es requerido', 400);

    const history = await aiService.getProjectSummaryHistory(projectId);
    return successResponse(history);
  } catch (error) {
    return handleApiError(error);
  }
}
