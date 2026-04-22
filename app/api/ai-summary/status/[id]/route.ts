import { getAuthContext } from '@/lib/helpers/auth';
import { assertCanViewAISummaryRecord } from '@/lib/helpers/project-access';
import { handleApiError } from '@/lib/helpers/handle-error';
import { successResponse, errorResponse } from '@/lib/helpers/api-response';
import { aiService } from '@/lib/services/ai.service';
import { prisma } from '@/lib/db';

/** GET /api/ai-summary/status/:id — Estado del resumen para polling del cliente. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return errorResponse('Unauthorized', 401);

    const { id } = await params;

    const ref = await prisma.aISummary.findUnique({
      where: { id },
      select: { id: true, projectId: true },
    });
    if (!ref) return errorResponse('Resumen no encontrado', 404);
    await assertCanViewAISummaryRecord(ctx, ref.projectId);

    const summary = await aiService.getStatus(id);

    if (!summary) return errorResponse('Resumen no encontrado', 404);

    return successResponse(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
