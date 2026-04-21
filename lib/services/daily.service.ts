import { prisma } from '@/lib/db';
import { toUTCDayStart, isSameLocalDay } from '@/lib/helpers/dates';
import { notificationService } from '@/lib/services/notification.service';
import { sendBlockerAlertEmail } from '@/lib/services/email.service';
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
      include: { user: { select: { name: true } } },
    });

    if (!membership) {
      throw new Error('FORBIDDEN: El usuario no pertenece al proyecto');
    }

    const isBlocker = Boolean(data.blockers?.trim());
    const reportDate = toUTCDayStart(
      new Date().toLocaleDateString('en-CA', { timeZone: data.userTimezone }),
      data.userTimezone,
    );
    const reporterName = membership.user.name ?? 'Miembro del equipo';

    if (isBlocker) {
      const daily = await prisma.$transaction(async (tx) => {
        const d = await tx.dailyReport.create({
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

        await notificationService.notifyBlockerInTx(
          tx,
          data.projectId,
          d.id,
          reporterName,
          data.blockers!,
          userId,
        );

        return d;
      });

      // Email al Tech Lead FUERA de la transacción — fallo silencioso
      const techLead = await prisma.projectUser.findFirst({
        where: { projectId: data.projectId, isTechLead: true },
        include: { user: { select: { email: true, name: true } } },
      });
      if (techLead) {
        const project = await prisma.project.findUnique({
          where: { id: data.projectId },
          select: { name: true },
        });
        void sendBlockerAlertEmail(
          techLead.user.email,
          techLead.user.name ?? techLead.user.email,
          project?.name ?? data.projectId,
          reporterName,
          data.blockers!,
        );
      }

      return daily;
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
