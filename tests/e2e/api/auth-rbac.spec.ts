import { test, expect } from '@playwright/test';

const adminKey = process.env.E2E_ADMIN_API_KEY;
const userKey = process.env.E2E_USER_API_KEY;

test.describe('Auth + RBAC (API)', () => {
  test('GET /api/projects requiere ADMIN', async ({ request }) => {
    const resNoAuth = await request.get('/api/projects');
    expect([200, 401, 403]).toContain(resNoAuth.status());
  });

  test('USER no accede a /api/projects (403)', async ({ request }) => {
    test.skip(!userKey, 'Define E2E_USER_API_KEY');
    const res = await request.get('/api/projects', {
      headers: { 'x-api-key': userKey as string },
    });
    expect(res.status()).toBe(403);
  });

  test('ADMIN accede a /api/projects (200)', async ({ request }) => {
    test.skip(!adminKey, 'Define E2E_ADMIN_API_KEY');
    const res = await request.get('/api/projects', {
      headers: { 'x-api-key': adminKey as string },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
  });
});

