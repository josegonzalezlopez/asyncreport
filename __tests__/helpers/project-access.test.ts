import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@/lib/types';
import {
  assertCanReadProject,
  assertCanAccessAISummaryProject,
} from '@/lib/helpers/project-access';

vi.mock('@/lib/services/project.service', () => ({
  projectService: {
    isMember: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    projectUser: { findUnique: vi.fn() },
  },
}));

import { projectService } from '@/lib/services/project.service';
import { prisma } from '@/lib/db';

const memberCtx: AuthContext = {
  clerkUserId: 'c',
  dbUserId: 'u1',
  role: 'USER',
};
const adminCtx: AuthContext = { ...memberCtx, role: 'ADMIN' };
const tlCtx: AuthContext = { ...memberCtx, role: 'TECH_LEAD' };

describe('assertCanReadProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN no consulta membresía', async () => {
    await assertCanReadProject(adminCtx, 'p1');
    expect(projectService.isMember).not.toHaveBeenCalled();
  });

  it('USER miembro: OK', async () => {
    vi.mocked(projectService.isMember).mockResolvedValue(true);
    await expect(assertCanReadProject(memberCtx, 'p1')).resolves.toBeUndefined();
  });

  it('USER no miembro: lanza', async () => {
    vi.mocked(projectService.isMember).mockResolvedValue(false);
    await expect(assertCanReadProject(memberCtx, 'p1')).rejects.toThrow(/FORBIDDEN/);
  });
});

describe('assertCanAccessAISummaryProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN: OK', async () => {
    await expect(assertCanAccessAISummaryProject(adminCtx, 'p1')).resolves.toBeUndefined();
  });

  it('USER: prohibido', async () => {
    await expect(assertCanAccessAISummaryProject(memberCtx, 'p1')).rejects.toThrow(
      /Solo Tech Lead/,
    );
  });

  it('TECH_LEAD sin isTechLead: prohibido', async () => {
    vi.mocked(prisma.projectUser.findUnique).mockResolvedValue({
      isTechLead: false,
      project: { status: 'ACTIVE' },
    } as never);
    await expect(assertCanAccessAISummaryProject(tlCtx, 'p1')).rejects.toThrow(
      /Tech Lead del proyecto/,
    );
  });

  it('TECH_LEAD con isTechLead: OK', async () => {
    vi.mocked(prisma.projectUser.findUnique).mockResolvedValue({
      isTechLead: true,
      project: { status: 'ACTIVE' },
    } as never);
    await expect(assertCanAccessAISummaryProject(tlCtx, 'p1')).resolves.toBeUndefined();
  });
});
