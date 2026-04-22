import type { Role } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { sendProjectAssignmentEmail } from '@/lib/services/email.service';
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
    const { membership, project, userEmail, userName } = await prisma.$transaction(async (tx) => {
      const m = await tx.projectUser.upsert({
        where: { userId_projectId: { userId: data.userId, projectId } },
        create: { projectId, userId: data.userId, isTechLead: data.isTechLead },
        update: { isTechLead: data.isTechLead },
      });
      const p = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
        select: { name: true },
      });
      const u = await tx.user.findUniqueOrThrow({
        where: { id: data.userId },
        select: { email: true, name: true },
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
      return { membership: m, project: p, userEmail: u.email, userName: u.name };
    });

    // Email FUERA de la transacción — fallo silencioso no revierte la asignación
    void sendProjectAssignmentEmail(userEmail, userName ?? userEmail, project.name, data.isTechLead);

    return { ...membership, projectName: project.name };
  },

  async removeMember(projectId: string, userId: string) {
    return prisma.projectUser.delete({
      where: {
        userId_projectId: { userId, projectId },
      },
    });
  },

  /** Solo proyectos donde el usuario es miembro (p. ej. selector de daily — el API exige membresía). */
  async findMemberProjectsForUser(userId: string) {
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

  /**
   * Listado de “Mis proyectos”: miembrosía para USER/TECH_LEAD; ADMIN ve todos los no archivados.
   */
  async findProjectsForUser(userId: string, role: Role) {
    if (role === 'ADMIN') {
      return prisma.project.findMany({
        where: { status: { not: 'ARCHIVED' } },
        include: {
          _count: { select: { memberships: true, dailyReports: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return projectService.findMemberProjectsForUser(userId);
  },

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const membership = await prisma.projectUser.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return membership !== null;
  },
};
