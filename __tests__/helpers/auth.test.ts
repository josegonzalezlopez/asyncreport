import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@prisma/client';

// Mocks deben declararse antes de los imports de los módulos bajo test
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/services/user.service', () => ({
  userService: {
    findByClerkId: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('@/lib/services/apikey.service', () => ({
  apiKeyService: {
    verify: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(null) }),
}));

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { userService } from '@/lib/services/user.service';
import { apiKeyService } from '@/lib/services/apikey.service';
import { getAuthContext, requireRole } from '@/lib/helpers/auth';

const mockAuth = vi.mocked(auth);
const mockHeaders = vi.mocked(headers);
const mockFindByClerkId = vi.mocked(userService.findByClerkId);
const mockFindById = vi.mocked(userService.findById);
const mockVerify = vi.mocked(apiKeyService.verify);

const MOCK_USER: User = {
  id: 'db-user-1',
  clerkUserId: 'clerk-user-1',
  email: 'test@example.com',
  name: 'Test User',
  imageUrl: null,
  role: 'USER',
  specialization: 'DEVELOPER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAuthContext', () => {
  it('retorna null si Clerk no tiene userId activo', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);

    const ctx = await getAuthContext();

    expect(ctx).toBeNull();
    expect(mockFindByClerkId).not.toHaveBeenCalled();
  });

  it('retorna null si el clerkId no existe en la DB', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-user-1' } as never);
    mockFindByClerkId.mockResolvedValue(null);

    const ctx = await getAuthContext();

    expect(ctx).toBeNull();
  });

  it('retorna AuthContext completo cuando el usuario existe en Clerk y en DB', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-user-1' } as never);
    mockFindByClerkId.mockResolvedValue(MOCK_USER);

    const ctx = await getAuthContext();

    expect(ctx).toEqual({
      clerkUserId: 'clerk-user-1',
      dbUserId: 'db-user-1',
      role: 'USER',
    });
  });

  it('preserva el rol correcto del usuario (ADMIN)', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-admin-1' } as never);
    mockFindByClerkId.mockResolvedValue({ ...MOCK_USER, role: 'ADMIN' });

    const ctx = await getAuthContext();

    expect(ctx?.role).toBe('ADMIN');
  });

  it('autentica vía X-API-Key cuando no hay sesión Clerk', async () => {
    mockHeaders.mockResolvedValue({
      get: (key: string) => (key === 'x-api-key' ? 'test-api-token' : null),
    } as never);
    mockVerify.mockResolvedValue('db-user-1');
    mockFindById.mockResolvedValue(MOCK_USER);

    const ctx = await getAuthContext();

    expect(ctx).toEqual({ clerkUserId: '', dbUserId: 'db-user-1', role: 'USER' });
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it('retorna null si X-API-Key es inválida', async () => {
    mockHeaders.mockResolvedValue({
      get: (key: string) => (key === 'x-api-key' ? 'invalid-token' : null),
    } as never);
    mockVerify.mockResolvedValue(null);

    const ctx = await getAuthContext();

    expect(ctx).toBeNull();
    expect(mockAuth).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  const adminCtx = { clerkUserId: 'x', dbUserId: 'y', role: 'ADMIN' as const };
  const techLeadCtx = { clerkUserId: 'x', dbUserId: 'y', role: 'TECH_LEAD' as const };
  const userCtx = { clerkUserId: 'x', dbUserId: 'y', role: 'USER' as const };

  it('retorna true con rol exacto', () => {
    expect(requireRole(adminCtx, 'ADMIN')).toBe(true);
  });

  it('retorna true cuando el rol está entre múltiples roles permitidos', () => {
    expect(requireRole(techLeadCtx, 'TECH_LEAD', 'ADMIN')).toBe(true);
    expect(requireRole(adminCtx, 'TECH_LEAD', 'ADMIN')).toBe(true);
  });

  it('retorna false con rol incorrecto', () => {
    expect(requireRole(userCtx, 'ADMIN')).toBe(false);
    expect(requireRole(techLeadCtx, 'ADMIN')).toBe(false);
  });

  it('retorna false si el contexto es null', () => {
    expect(requireRole(null, 'ADMIN')).toBe(false);
    expect(requireRole(null, 'USER')).toBe(false);
  });
});
