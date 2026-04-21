import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    projectUser: { findUnique: vi.fn() },
    dailyReport: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/helpers/dates', () => ({
  toUTCDayStart: vi.fn(() => new Date('2026-04-20T00:00:00.000Z')),
  isSameLocalDay: vi.fn(() => false),
}));

import { prisma } from '@/lib/db';
import { dailyService } from '@/lib/services/daily.service';
import type { CreateDailyDto } from '@/lib/validators/daily.schema';

const mockProjectUser = vi.mocked(prisma.projectUser);
const mockDailyReport = vi.mocked(prisma.dailyReport);
const mockTransaction = vi.mocked(prisma.$transaction);

const BASE_DTO: CreateDailyDto = {
  projectId: 'project-1',
  yesterday: 'Terminé el módulo de autenticación',
  today: 'Voy a trabajar en el endpoint de proyectos',
  mood: 4,
  userTimezone: 'America/Argentina/Buenos_Aires',
};

beforeEach(() => vi.clearAllMocks());

describe('dailyService.create', () => {
  it('lanza error FORBIDDEN si el usuario no pertenece al proyecto', async () => {
    mockProjectUser.findUnique.mockResolvedValue(null);

    await expect(dailyService.create('user-1', BASE_DTO)).rejects.toThrow(
      'FORBIDDEN',
    );
    expect(mockDailyReport.create).not.toHaveBeenCalled();
  });

  it('crea el reporte sin transacción cuando no hay bloqueadores', async () => {
    mockProjectUser.findUnique.mockResolvedValue({ id: 'm1' } as never);
    const fakeDaily = { id: 'd1', isBlocker: false };
    mockDailyReport.create.mockResolvedValue(fakeDaily as never);

    const result = await dailyService.create('user-1', BASE_DTO);

    expect(mockDailyReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isBlocker: false }) }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(result).toEqual(fakeDaily);
  });

  it('usa transacción atómica cuando hay bloqueadores', async () => {
    mockProjectUser.findUnique.mockResolvedValue({ id: 'm1' } as never);
    mockTransaction.mockImplementation(async (fn) => {
      const fakeDaily = { id: 'd1', isBlocker: true };
      return fn({
        dailyReport: { create: vi.fn().mockResolvedValue(fakeDaily) },
        notification: { create: vi.fn().mockResolvedValue({}) },
      } as never);
    });

    const dto = { ...BASE_DTO, blockers: 'Bloqueado por dependencia de diseño' };
    await dailyService.create('user-1', dto);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('calcula isBlocker=true cuando blockers tiene contenido', async () => {
    mockProjectUser.findUnique.mockResolvedValue({ id: 'm1' } as never);
    mockTransaction.mockImplementation(async (fn) => {
      const fakeDaily = { id: 'd1', isBlocker: true };
      return fn({
        dailyReport: {
          create: vi.fn().mockImplementation(({ data }: { data: { isBlocker: boolean } }) => {
            expect(data.isBlocker).toBe(true);
            return Promise.resolve(fakeDaily);
          }),
        },
        notification: { create: vi.fn().mockResolvedValue({}) },
      } as never);
    });

    await dailyService.create('user-1', {
      ...BASE_DTO,
      blockers: '  Tengo un bloqueador  ',
    });
  });

  it('calcula isBlocker=false cuando blockers está vacío o solo espacios', async () => {
    mockProjectUser.findUnique.mockResolvedValue({ id: 'm1' } as never);
    mockDailyReport.create.mockResolvedValue({ id: 'd1', isBlocker: false } as never);

    await dailyService.create('user-1', { ...BASE_DTO, blockers: '   ' });

    expect(mockDailyReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isBlocker: false }) }),
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe('dailyService.canUserReport', () => {
  it('retorna true si no existe reporte para hoy', async () => {
    mockDailyReport.findFirst.mockResolvedValue(null);

    const result = await dailyService.canUserReport(
      'user-1',
      'project-1',
      'UTC',
    );

    expect(result).toBe(true);
  });

  it('retorna false si ya existe un reporte para hoy', async () => {
    mockDailyReport.findFirst.mockResolvedValue({ id: 'd1' } as never);

    const result = await dailyService.canUserReport(
      'user-1',
      'project-1',
      'UTC',
    );

    expect(result).toBe(false);
  });
});
