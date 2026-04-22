import { describe, expect, it } from 'vitest';
import { canAccessProtectedRoute, extractRoleFromClaims } from '@/proxy';

describe('extractRoleFromClaims', () => {
  it('retorna role desde metadata.role', () => {
    expect(extractRoleFromClaims({ metadata: { role: 'ADMIN' } })).toBe('ADMIN');
    expect(extractRoleFromClaims({ metadata: { role: 'TECH_LEAD' } })).toBe('TECH_LEAD');
    expect(extractRoleFromClaims({ metadata: { role: 'USER' } })).toBe('USER');
  });

  it('retorna role desde claims.role como fallback', () => {
    expect(extractRoleFromClaims({ role: 'ADMIN' })).toBe('ADMIN');
  });

  it('retorna null para roles invalidos o claims vacios', () => {
    expect(extractRoleFromClaims({ metadata: { role: 'ROOT' } })).toBeNull();
    expect(extractRoleFromClaims(null)).toBeNull();
    expect(extractRoleFromClaims({})).toBeNull();
  });
});

describe('canAccessProtectedRoute', () => {
  it('solo permite ADMIN en rutas admin', () => {
    expect(canAccessProtectedRoute('/api/projects', 'ADMIN').allowed).toBe(true);
    expect(canAccessProtectedRoute('/dashboard/admin', 'ADMIN').allowed).toBe(true);
    expect(canAccessProtectedRoute('/api/projects', 'TECH_LEAD').allowed).toBe(false);
    expect(canAccessProtectedRoute('/api/users', 'USER').allowed).toBe(false);
  });

  it('permite TECH_LEAD y ADMIN en rutas de TL', () => {
    expect(canAccessProtectedRoute('/api/ai-summary', 'TECH_LEAD').allowed).toBe(true);
    expect(canAccessProtectedRoute('/api/ai-summary', 'ADMIN').allowed).toBe(true);
    expect(canAccessProtectedRoute('/dashboard/team', 'USER').allowed).toBe(false);
    expect(canAccessProtectedRoute('/dashboard/p/abc/team', null).allowed).toBe(false);
  });

  it('no bloquea rutas protegidas no sujetas a RBAC de borde', () => {
    expect(canAccessProtectedRoute('/api/daily', 'USER').allowed).toBe(true);
    expect(canAccessProtectedRoute('/dashboard/profile', 'USER').allowed).toBe(true);
  });
});
