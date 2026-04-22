import { test, expect } from '@playwright/test';

const adminKey = process.env.E2E_ADMIN_API_KEY;
const userKey = process.env.E2E_USER_API_KEY;
const techLeadKey = process.env.E2E_TECHLEAD_API_KEY;

test.describe('Auth + RBAC (API)', () => {
  test('GET /api/projects requiere ADMIN', async ({ request }) => {
    const resNoAuth = await request.get('/api/projects');
    // Clerk puede responder redirect a sign-in (307->HTML 200) o JSON 401/403.
    const contentType = resNoAuth.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      expect([401, 403]).toContain(resNoAuth.status());
    } else {
      expect(resNoAuth.url()).toContain('/sign-in');
    }
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

  test('TECH_LEAD no accede a /api/projects (403)', async ({ request }) => {
    test.skip(!techLeadKey, 'Define E2E_TECHLEAD_API_KEY');
    const res = await request.get('/api/projects', {
      headers: { 'x-api-key': techLeadKey as string },
    });
    expect(res.status()).toBe(403);
  });

  test('TECH_LEAD accede a /api/ai-summary (requiere rol correcto)', async ({ request }) => {
    test.skip(!techLeadKey, 'Define E2E_TECHLEAD_API_KEY');
    const res = await request.get('/api/ai-summary', {
      headers: { 'x-api-key': techLeadKey as string },
    });
    // Si pasa RBAC, puede devolver 400 por faltar projectId.
    expect([200, 400]).toContain(res.status());
  });
});

