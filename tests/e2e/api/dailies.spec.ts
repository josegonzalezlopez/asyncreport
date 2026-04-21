import { test, expect } from '@playwright/test';

const apiKey = process.env.E2E_API_KEY;
const adminKey = process.env.E2E_ADMIN_API_KEY;
const dailyProjectId = process.env.E2E_DAILY_PROJECT_ID;
const nonMemberProjectId = process.env.E2E_NON_MEMBER_PROJECT_ID;
const asUserEmail = process.env.E2E_AS_USER_EMAIL;

function buildDaily(projectId: string) {
  return {
    projectId,
    yesterday: `Ayer implementé módulo e2e ${Date.now()}`,
    today: `Hoy validaré regresiones e2e ${Date.now()}`,
    mood: 4,
    userTimezone: 'UTC',
  };
}

test.describe('Dailies module', () => {
  test('POST /api/daily requiere auth', async ({ request }) => {
    const res = await request.post('/api/daily', { data: buildDaily('fake') });
    const ct = res.headers()['content-type'] ?? '';
    if (ct.includes('application/json')) {
      expect([400, 401, 403]).toContain(res.status());
    } else {
      // Clerk puede redirigir a sign-in y resolver en 200 HTML.
      expect(res.url()).toContain('/sign-in');
    }
  });

  test('POST /api/daily crea o detecta duplicado (409)', async ({ request }) => {
    test.skip(!apiKey || !dailyProjectId, 'Define E2E_API_KEY y E2E_DAILY_PROJECT_ID');
    const first = await request.post('/api/daily', {
      headers: { 'x-api-key': apiKey as string },
      data: buildDaily(dailyProjectId as string),
    });
    expect([201, 409]).toContain(first.status());

    const second = await request.post('/api/daily', {
      headers: { 'x-api-key': apiKey as string },
      data: buildDaily(dailyProjectId as string),
    });
    expect(second.status()).toBe(409);
  });

  test('no miembro no puede reportar en proyecto ajeno', async ({ request }) => {
    test.skip(!apiKey || !nonMemberProjectId, 'Define E2E_API_KEY y E2E_NON_MEMBER_PROJECT_ID');
    const res = await request.post('/api/daily', {
      headers: { 'x-api-key': apiKey as string },
      data: buildDaily(nonMemberProjectId as string),
    });
    expect(res.status()).toBe(403);
  });

  test('as-user solo ADMIN', async ({ request }) => {
    test.skip(
      !apiKey || !dailyProjectId || !asUserEmail,
      'Define E2E_API_KEY, E2E_DAILY_PROJECT_ID y E2E_AS_USER_EMAIL',
    );
    const res = await request.post('/api/daily', {
      headers: { 'x-api-key': apiKey as string },
      data: { ...buildDaily(dailyProjectId as string), asUserEmail },
    });
    expect(res.status()).toBe(403);
  });

  test('ADMIN puede usar as-user (o 404 si email inexistente)', async ({ request }) => {
    test.skip(
      !adminKey || !dailyProjectId || !asUserEmail,
      'Define E2E_ADMIN_API_KEY, E2E_DAILY_PROJECT_ID y E2E_AS_USER_EMAIL',
    );
    const res = await request.post('/api/daily', {
      headers: { 'x-api-key': adminKey as string },
      data: { ...buildDaily(dailyProjectId as string), asUserEmail },
    });
    expect([201, 404, 409]).toContain(res.status());
  });
});

