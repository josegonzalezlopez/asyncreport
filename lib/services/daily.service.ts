import { prisma } from '@/lib/db';
import { toUTCDayStart, isSameLocalDay } from '@/lib/helpers/dates';
import type { CreateDailyDto } from '@/lib/validators/daily.schema';

export const dailyService = {
  /**
   * Crea un daily report.
   *
   * Regla de atomicidad: cuando hay bloqueador, DailyReport + Notification
   * se crean en una única transacción interactiva de Prisma. Si la Notification
   * falla, el DailyReport NO queda huérfano (rollback automático).
   *
   * El envío de email se ejecuta FUERA de la transacción para que un fallo
   * de Resend no deshaga la escritura en DB.
   */
  async create(userId: string, data: CreateDailyDto) {
    const membership = await prisma.projectUser.findUnique({
      where: { userId_projectId: { userId, projectId: data.projectId } },
    });

    if (!membership) {
      throw new Error('FORBIDDEN: El usuario no pertenece al proyecto');
    }

    const isBlocker = Boolean(data.blockers?.trim());
    const reportDate = toUTCDayStart(
      new Date().toLocaleDateString('en-CA', { timeZone: data.userTimezone }),
      data.userTimezone,
    );

    if (isBlocker) {
      return prisma.$transaction(async (tx) => {
        const daily = await tx.dailyReport.create({
          data: {
            userId,
            projectId: data.projectId,
            yesterday: data.yesterday,
            today: data.today,
            blockers: data.blockers,
            isBlocker: true,
            mood: data.mood,
            userTimezone: data.userTimezone,
            reportDate,
          },
        });

        await tx.notification.create({
          data: {
            type: 'BLOCKER_ALERT',
            title: '⚠️ Bloqueador detectado',
            message: `${data.blockers}`,
            projectId: data.projectId,
            metadata: { dailyReportId: daily.id, userId },
          },
        });

        return daily;
      });
    }

    return prisma.dailyReport.create({
      data: {
        userId,
        projectId: data.projectId,
        yesterday: data.yesterday,
        today: data.today,
        blockers: data.blockers,
        isBlocker: false,
        mood: data.mood,
        userTimezone: data.userTimezone,
        reportDate,
      },
    });
  },

  /**
   * Verifica si el usuario ya reportó hoy en un proyecto.
   * Compara usando la zona horaria local del usuario, no UTC.
   */
  async canUserReport(
    userId: string,
    projectId: string,
    userTimezone: string,
  ): Promise<boolean> {
    const localDateISO = new Date().toLocaleDateString('en-CA', {
      timeZone: userTimezone,
    });

    const todayStart = toUTCDayStart(localDateISO, userTimezone);
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const existing = await prisma.dailyReport.findFirst({
      where: {
        userId,
        projectId,
        reportDate: { gte: todayStart, lt: tomorrow },
      },
    });

    return existing === null;
  },

  /**
   * Lista reportes de un proyecto usando cursor-based pagination.
   * El cursor es el `id` del último registro visto (k-sortable, evita
   * pagination drift cuando llegan nuevos reportes mientras el usuario navega).
   */
  async findByProject(
    projectId: string,
    options: { take?: number; cursor?: string } = {},
  ) {
    const take = options.take ?? 20;

    const reports = await prisma.dailyReport.findMany({
      where: { projectId },
      orderBy: { id: 'desc' },
      take: take + 1,
      ...(options.cursor
        ? { cursor: { id: options.cursor }, skip: 1 }
        : {}),
      include: {
        user: {
          select: { id: true, name: true, imageUrl: true, specialization: true },
        },
      },
    });

    const hasMore = reports.length > take;
    const items = hasMore ? reports.slice(0, take) : reports;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return { items, nextCursor };
  },

  async findByUser(userId: string, projectId: string) {
    return prisma.dailyReport.findMany({
      where: { userId, projectId },
      orderBy: { reportDate: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.dailyReport.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, imageUrl: true, specialization: true },
        },
      },
    });
  },

  async isSameDayReport(
    userId: string,
    projectId: string,
    date: Date,
    timezone: string,
  ): Promise<boolean> {
    const localDate = date.toLocaleDateString('en-CA', { timeZone: timezone });
    const existing = await prisma.dailyReport.findFirst({
      where: { userId, projectId },
      orderBy: { reportDate: 'desc' },
    });

    if (!existing) return false;
    return isSameLocalDay(existing.reportDate, localDate, timezone);
  },
};
