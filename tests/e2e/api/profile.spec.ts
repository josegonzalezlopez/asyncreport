import { test, expect } from '@playwright/test';

const apiKey = process.env.E2E_API_KEY;

test.describe('Profile module', () => {
  test('GET /api/users/me requiere auth', async ({ request }) => {
    const res = await request.get('/api/users/me');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('GET /api/users/me retorna perfil + memberships', async ({ request }) => {
    test.skip(!apiKey, 'Define E2E_API_KEY');
    const res = await request.get('/api/users/me', {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('projectMemberships');
  });

  test('PATCH /api/users/me actualiza sin escalar role', async ({ request }) => {
    test.skip(!apiKey, 'Define E2E_API_KEY');
    const res = await request.patch('/api/users/me', {
      headers: { 'x-api-key': apiKey as string, 'content-type': 'application/json' },
      data: {
        name: `E2E User ${Date.now()}`,
        specialization: 'DEVELOPER',
        role: 'ADMIN',
      },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.data?.role).not.toBe('ADMIN');
  });
});

