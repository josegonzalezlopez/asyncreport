import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  projectUser: { upsert: vi.fn() },
  project: { findUniqueOrThrow: vi.fn() },
  notification: { create: vi.fn() },
};

vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    projectUser: {
      upsert: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: () => unknown) => fn),
}));

import { prisma } from '@/lib/db';
import { revalidateTag } from 'next/cache';
import { projectService } from '@/lib/services/project.service';

const mockProject = vi.mocked(prisma.project);
const mockProjectUser = vi.mocked(prisma.projectUser);
const mockRevalidate = vi.mocked(revalidateTag);

beforeEach(() => {
  vi.clearAllMocks();
  mockTx.projectUser.upsert.mockReset();
  mockTx.project.findUniqueOrThrow.mockReset();
  mockTx.notification.create.mockReset();
});

describe('projectService.create', () => {
  it('crea el proyecto y llama revalidateTag', async () => {
    const fakeProject = { id: 'p1', name: 'Test', status: 'ACTIVE' };
    mockProject.create.mockResolvedValue(fakeProject as never);

    const result = await projectService.create({ name: 'Test' });

    expect(mockProject.create).toHaveBeenCalledWith({ data: { name: 'Test' } });
    expect(mockRevalidate).toHaveBeenCalledWith('dashboard-metrics', 'default');
    expect(result).toEqual(fakeProject);
  });
});

describe('projectService.archive', () => {
  it('actualiza el status a ARCHIVED (soft-delete) y llama revalidateTag', async () => {
    const archived = { id: 'p1', status: 'ARCHIVED' };
    mockProject.update.mockResolvedValue(archived as never);

    const result = await projectService.archive('p1');

    expect(mockProject.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'ARCHIVED' },
    });
    expect(mockRevalidate).toHaveBeenCalledWith('dashboard-metrics', 'default');
    expect(result.status).toBe('ARCHIVED');
  });
});

describe('projectService.assignMember', () => {
  it('hace upsert dentro de una transacción con notificación', async () => {
    const membership = { userId: 'u1', projectId: 'p1', isTechLead: true };
    mockTx.projectUser.upsert.mockResolvedValue(membership);
    mockTx.project.findUniqueOrThrow.mockResolvedValue({ name: 'Mi Proyecto' });
    mockTx.notification.create.mockResolvedValue({ id: 'n1' });

    await projectService.assignMember('p1', { userId: 'u1', isTechLead: true });

    expect(mockTx.projectUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isTechLead: true }),
      }),
    );
    expect(mockTx.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'ASSIGNMENT', userId: 'u1' }),
      }),
    );
  });

  it('ejecuta el upsert una sola vez aunque el usuario ya sea miembro', async () => {
    mockTx.projectUser.upsert.mockResolvedValue({ isTechLead: false });
    mockTx.project.findUniqueOrThrow.mockResolvedValue({ name: 'P' });
    mockTx.notification.create.mockResolvedValue({ id: 'n1' });

    await projectService.assignMember('p1', { userId: 'u1', isTechLead: false });

    expect(mockTx.projectUser.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('projectService.isMember', () => {
  it('retorna true si existe la membresía', async () => {
    mockProjectUser.findUnique.mockResolvedValue({ id: 'm1' } as never);

    const result = await projectService.isMember('p1', 'u1');

    expect(result).toBe(true);
  });

  it('retorna false si no existe la membresía', async () => {
    mockProjectUser.findUnique.mockResolvedValue(null);

    const result = await projectService.isMember('p1', 'u1');

    expect(result).toBe(false);
  });
});
