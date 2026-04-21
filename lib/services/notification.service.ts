import { prisma } from '@/lib/db';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  userId?: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async create(input: CreateNotificationInput) {
    return prisma.notification.create({ data: input });
  },

  async findByUser(
    userId: string,
    options: { take?: number; cursor?: string; isRead?: boolean } = {},
  ) {
    const take = options.take ?? 20;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(options.isRead !== undefined ? { isRead: options.isRead } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(options.cursor
        ? { cursor: { id: options.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = notifications.length > take;
    const items = hasMore ? notifications.slice(0, take) : notifications;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return { items, nextCursor };
  },

  async markAsRead(notificationId: string, userId: string) {
    // Verificar propiedad antes de marcar como leída
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('FORBIDDEN: No autorizado para marcar esta notificación');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  },

  /**
   * Crea una notificación de tipo ASSIGNMENT para el usuario asignado.
   * Se llama desde project.service.assignMember (FUERA de la transacción).
   */
  async notifyAssignment(
    userId: string,
    projectId: string,
    projectName: string,
    isTechLead: boolean,
  ) {
    const role = isTechLead ? 'Tech Lead' : 'miembro';
    return notificationService.create({
      userId,
      projectId,
      type: NotificationType.ASSIGNMENT,
      title: '📌 Asignado a un proyecto',
      message: `Fuiste asignado al proyecto "${projectName}" como ${role}.`,
      metadata: { projectName, isTechLead },
    });
  },

  /**
   * Busca al Tech Lead del proyecto y crea una notificación de tipo BLOCKER_ALERT.
   * Diseñado para llamarse DENTRO de la transacción de daily.service.create,
   * usando el cliente `tx` que se pasa como parámetro.
   */
  async notifyBlockerInTx(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    projectId: string,
    dailyReportId: string,
    reporterName: string,
    blockerContent: string,
    reporterUserId: string,
  ) {
    const techLead = await tx.projectUser.findFirst({
      where: { projectId, isTechLead: true },
    });

    return tx.notification.create({
      data: {
        userId: techLead?.userId ?? null,
        projectId,
        type: NotificationType.BLOCKER_ALERT,
        title: '⚠️ Bloqueador crítico reportado',
        message: `${reporterName}: ${blockerContent}`,
        metadata: { dailyReportId, reporterUserId },
      },
    });
  },

  /**
   * Crea una notificación de tipo AI_SUMMARY_READY para el Tech Lead.
   * Diseñado para llamarse dentro de la transacción de ai.service (con el cliente `tx`).
   */
  async notifyAISummaryInTx(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    techLeadId: string,
    projectId: string,
    projectName: string,
    summaryId: string,
  ) {
    return tx.notification.create({
      data: {
        userId: techLeadId,
        projectId,
        type: NotificationType.AI_SUMMARY_READY,
        title: '🤖 Resumen de IA listo',
        message: `El resumen ejecutivo de "${projectName}" ya está disponible.`,
        metadata: { summaryId },
      },
    });
  },
};
