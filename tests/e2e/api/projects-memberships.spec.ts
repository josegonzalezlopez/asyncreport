import { test, expect } from '@playwright/test';

const apiKey = process.env.E2E_API_KEY;
const adminKey = process.env.E2E_ADMIN_API_KEY;

test.describe('Projects + Memberships module', () => {
  test('GET /api/projects/my devuelve solo membresías del usuario', async ({ request }) => {
    test.skip(!apiKey, 'Define E2E_API_KEY');
    const res = await request.get('/api/projects/my', {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBeTruthy();
  });

  test('POST /api/projects valida payload', async ({ request }) => {
    test.skip(!adminKey, 'Define E2E_ADMIN_API_KEY');
    const res = await request.post('/api/projects', {
      headers: { 'x-api-key': adminKey as string },
      data: { bad: true },
    });
    expect(res.status()).toBe(400);
  });
});

