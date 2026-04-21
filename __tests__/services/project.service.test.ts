import { describe, it, expect, vi, beforeEach } from 'vitest';

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

beforeEach(() => vi.clearAllMocks());

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
  it('hace upsert con isTechLead correcto', async () => {
    const membership = { userId: 'u1', projectId: 'p1', isTechLead: true };
    mockProjectUser.upsert.mockResolvedValue(membership as never);

    await projectService.assignMember('p1', { userId: 'u1', isTechLead: true });

    expect(mockProjectUser.upsert).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: 'u1', projectId: 'p1' } },
      create: { projectId: 'p1', userId: 'u1', isTechLead: true },
      update: { isTechLead: true },
    });
  });

  it('no duplica si el usuario ya pertenece al proyecto (upsert actualiza)', async () => {
    mockProjectUser.upsert.mockResolvedValue({ isTechLead: false } as never);

    await projectService.assignMember('p1', { userId: 'u1', isTechLead: false });

    expect(mockProjectUser.upsert).toHaveBeenCalledTimes(1);
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
