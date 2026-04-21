import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import type { CreateProjectDto, UpdateProjectDto, AssignMemberDto } from '@/lib/validators/project.schema';

export const projectService = {
  async create(data: CreateProjectDto) {
    const project = await prisma.project.create({ data });
    revalidateTag('dashboard-metrics', 'default');
    return project;
  },

  async findAll() {
    return prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            memberships: true,
            dailyReports: true,
          },
        },
      },
    });
  },

  async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                specialization: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { dailyReports: true } },
      },
    });
  },

  async update(id: string, data: UpdateProjectDto) {
    return prisma.project.update({ where: { id }, data });
  },

  async archive(id: string) {
    const project = await prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    revalidateTag('dashboard-metrics', 'default');
    return project;
  },

  async assignMember(projectId: string, data: AssignMemberDto) {
    // Transacción: UPSERT de membresía + notificación atómica
    const { membership, project } = await prisma.$transaction(async (tx) => {
      const m = await tx.projectUser.upsert({
        where: { userId_projectId: { userId: data.userId, projectId } },
        create: { projectId, userId: data.userId, isTechLead: data.isTechLead },
        update: { isTechLead: data.isTechLead },
      });
      const p = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
        select: { name: true },
      });
      await tx.notification.create({
        data: {
          userId: data.userId,
          projectId,
          type: 'ASSIGNMENT',
          title: '📌 Asignado a un proyecto',
          message: `Fuiste asignado al proyecto "${p.name}" como ${data.isTechLead ? 'Tech Lead' : 'miembro'}.`,
          metadata: { projectName: p.name, isTechLead: data.isTechLead },
        },
      });
      return { membership: m, project: p };
    });

    // Email de asignación se envía FUERA de la transacción (Fase 5 - NOTIF-03)
    // await emailService.sendProjectAssignmentEmail(...)

    return { ...membership, projectName: project.name };
  },

  async removeMember(projectId: string, userId: string) {
    return prisma.projectUser.delete({
      where: {
        userId_projectId: { userId, projectId },
      },
    });
  },

  async findProjectsForUser(userId: string) {
    return prisma.project.findMany({
      where: {
        memberships: { some: { userId } },
        status: { not: 'ARCHIVED' },
      },
      include: {
        _count: { select: { memberships: true, dailyReports: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const membership = await prisma.projectUser.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return membership !== null;
  },
};
