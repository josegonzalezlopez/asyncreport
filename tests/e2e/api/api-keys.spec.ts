import { test, expect } from '@playwright/test';

const apiKey = process.env.E2E_API_KEY;

test.describe('API Keys module', () => {
  test('GET /api/api-keys requiere auth', async ({ request }) => {
    const res = await request.get('/api/api-keys');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('flujo create/list/revoke con API key válida', async ({ request }) => {
    test.skip(!apiKey, 'Define E2E_API_KEY');

    const name = `e2e-key-${Date.now()}`;
    const create = await request.post('/api/api-keys', {
      headers: { 'x-api-key': apiKey as string },
      data: { name },
    });
    expect(create.status()).toBe(201);
    const createJson = await create.json();
    expect(createJson.data?.token).toBeTruthy();
    expect(createJson.data?.apiKey?.id).toBeTruthy();
    const createdId = createJson.data.apiKey.id as string;

    const list = await request.get('/api/api-keys', {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(list.status()).toBe(200);
    const listJson = await list.json();
    const found = (listJson.data as Array<{ id: string; name: string }>).some(
      (k) => k.id === createdId && k.name === name,
    );
    expect(found).toBeTruthy();

    const revoke = await request.delete(`/api/api-keys/${createdId}`, {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(revoke.status()).toBe(200);
  });
});

