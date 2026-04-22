import { prisma } from '@/lib/db';
import { sanitizeForAI } from '@/lib/helpers/sanitize';
import { buildDailySummaryPrompt } from '@/lib/helpers/prompts';
import { toUTCDayStart } from '@/lib/helpers/dates';
import { MAX_DAILY_SUMMARIES } from '@/lib/helpers/constants';
import { logger } from '@/lib/helpers/logger';
import { generateAIContent } from '@/lib/helpers/ai-provider';
import { notificationService } from '@/lib/services/notification.service';
import { AISummaryStatus } from '@prisma/client';

/**
 * Convierte errores del proveedor de IA en mensajes amigables para el usuario.
 */
function resolveAIError(raw: string): string {
  // Ollama: modelo no encontrado o servidor caído
  if (raw.toLowerCase().includes('ollama') || raw.includes('localhost:11434')) {
    if (raw.includes('404') || raw.toLowerCase().includes('not found')) {
      const model = process.env['OLLAMA_MODEL'] ?? 'qwen2.5:7b';
      return `El modelo "${model}" no está disponible en Ollama. Ejecuta: ollama pull ${model}`;
    }
    return 'No se pudo conectar con Ollama. Verifica que esté corriendo con: ollama serve';
  }
  if (raw.toLowerCase().includes('econnrefused') || raw.toLowerCase().includes('fetch failed')) {
    const provider = process.env['AI_PROVIDER'] ?? 'gemini';
    if (provider === 'ollama') {
      return 'No se pudo conectar con Ollama. Verifica que esté corriendo con: ollama serve';
    }
    return 'Error de conexión con el proveedor de IA.';
  }

  // Gemini: cuota diaria
  if (
    raw.includes('429') ||
    raw.toLowerCase().includes('quota') ||
    raw.toLowerCase().includes('too many requests')
  ) {
    const isDailyLimit =
      raw.includes('PerDay') ||
      raw.includes('PerDayPer') ||
      raw.includes('GenerateRequestsPerDay');
    if (isDailyLimit) {
      return 'Cuota diaria de la API de Gemini agotada (free tier). Se reinicia a medianoche (hora del Pacífico). Para uso intensivo, activa billing en https://ai.google.dev';
    }
    const delayMatch = raw.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
    const seconds = delayMatch ? Math.ceil(parseFloat(delayMatch[1]!)) : 60;
    return `Límite por minuto de Gemini alcanzado. El sistema reintentará automáticamente en ${seconds} segundos.`;
  }
  if (raw.includes('404') || raw.toLowerCase().includes('not found')) {
    const model = process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash';
    return `El modelo "${model}" no está disponible. Verifica que GEMINI_MODEL sea un modelo válido (ej: gemini-2.0-flash).`;
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return 'GEMINI_API_KEY no está configurada en las variables de entorno.';
  }

  return raw;
}

export const aiService = {
  /**
   * Verifica rate limit, crea un AISummary en estado PENDING y retorna su id.
   * La generación real se delega a processInBackground (patrón 202 Accepted).
   */
  async initiateSummary(projectId: string, generatedById: string): Promise<string> {
    const todayStart = toUTCDayStart(
      new Date().toISOString().slice(0, 10),
      'UTC',
    );
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const todayCount = await prisma.aISummary.count({
      where: {
        projectId,
        summaryDate: { gte: todayStart, lt: tomorrow },
        status: { not: 'FAILED' },
      },
    });

    if (todayCount >= MAX_DAILY_SUMMARIES) {
      throw new Error(
        `RATE_LIMIT_EXCEEDED: Límite de ${MAX_DAILY_SUMMARIES} resúmenes diarios alcanzado para este proyecto. Se reinicia a las 00:00 UTC.`,
      );
    }

    const todayReports = await prisma.dailyReport.findMany({
      where: {
        projectId,
        reportDate: { gte: todayStart, lt: tomorrow },
      },
      take: 1,
    });

    if (todayReports.length === 0) {
      throw new Error('NO_REPORTS: No hay reportes del equipo para hoy.');
    }

    const summary = await prisma.aISummary.create({
      data: {
        projectId,
        generatedById,
        status: AISummaryStatus.PENDING,
        summaryDate: new Date(),
        content: '',
      },
    });

    return summary.id;
  },

  /**
   * Ejecuta la generación con el proveedor de IA configurado y actualiza el registro.
   * Diseñado para ejecutarse en background via after() de Next.js.
   *
   * Proveedor activo: variable AI_PROVIDER ("gemini" | "ollama")
   */
  async processInBackground(summaryId: string): Promise<void> {
    await prisma.aISummary.update({
      where: { id: summaryId },
      data: { status: AISummaryStatus.PROCESSING },
    });

    const provider = process.env['AI_PROVIDER'] ?? 'gemini';
    logger.info('AI summary starting', { summaryId, provider });

    try {
      const summary = await prisma.aISummary.findUniqueOrThrow({
        where: { id: summaryId },
        include: {
          project: {
            include: {
              memberships: { select: { userId: true } },
            },
          },
        },
      });

      const todayStart = toUTCDayStart(
        new Date().toISOString().slice(0, 10),
        'UTC',
      );
      const tomorrow = new Date(todayStart);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      const reports = await prisma.dailyReport.findMany({
        where: {
          projectId: summary.projectId,
          reportDate: { gte: todayStart, lt: tomorrow },
        },
        include: {
          user: { select: { name: true, specialization: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      const totalMembers = summary.project.memberships.length;

      const prompt = buildDailySummaryPrompt({
        projectName: summary.project.name,
        date: new Date().toISOString().slice(0, 10),
        totalMembers,
        reportsCount: reports.length,
        reports: reports.map((r) => ({
          userName: r.user.name ?? 'Miembro del equipo',
          specialization: String(r.user.specialization ?? 'N/A'),
          yesterday: sanitizeForAI(r.yesterday),
          today: sanitizeForAI(r.today),
          blockers: r.blockers ? sanitizeForAI(r.blockers) : null,
          mood: r.mood,
        })),
      });

      const { content, tokenCount } = await generateAIContent(prompt);

      // AISummary COMPLETED + Notification en la misma transacción
      await prisma.$transaction(async (tx) => {
        await tx.aISummary.update({
          where: { id: summaryId },
          data: {
            status: AISummaryStatus.COMPLETED,
            content,
            promptUsed: prompt,
            tokenCount,
          },
        });

        if (summary.generatedById) {
          await notificationService.notifyAISummaryInTx(
            tx,
            summary.generatedById,
            summary.projectId,
            summary.project.name,
            summaryId,
          );
        }
      });

      logger.info('AI summary generated', { summaryId, provider, tokenCount });
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      const message = resolveAIError(rawMessage);

      logger.error('AI summary generation failed', { summaryId, provider, message: rawMessage });

      await prisma.aISummary.update({
        where: { id: summaryId },
        data: {
          status: AISummaryStatus.FAILED,
          errorMessage: message,
        },
      });
    }
  },

  async getStatus(summaryId: string) {
    return prisma.aISummary.findUnique({
      where: { id: summaryId },
      select: {
        id: true,
        status: true,
        content: true,
        errorMessage: true,
        tokenCount: true,
        summaryDate: true,
        generatedBy: { select: { name: true } },
      },
    });
  },

  async getProjectSummaryHistory(projectId: string) {
    return prisma.aISummary.findMany({
      where: {
        projectId,
        status: { not: AISummaryStatus.FAILED },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        summaryDate: true,
        tokenCount: true,
        status: true,
        generatedBy: { select: { name: true } },
      },
    });
  },
};
