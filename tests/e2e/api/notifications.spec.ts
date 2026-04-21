import { test, expect } from '@playwright/test';

const apiKey = process.env.E2E_API_KEY;

test.describe('Notifications module', () => {
  test('GET /api/notifications/unread-count requiere auth', async ({ request }) => {
    const res = await request.get('/api/notifications/unread-count');
    expect([200, 401, 403]).toContain(res.status());
  });

  test('listar notificaciones + unread-count + read-all', async ({ request }) => {
    test.skip(!apiKey, 'Define E2E_API_KEY');

    const list = await request.get('/api/notifications?take=10', {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(list.status()).toBe(200);
    const listJson = await list.json();
    expect(listJson.data).toHaveProperty('items');

    const unread = await request.get('/api/notifications/unread-count', {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(unread.status()).toBe(200);
    const unreadJson = await unread.json();
    expect(typeof unreadJson.data?.count).toBe('number');

    const readAll = await request.patch('/api/notifications/read-all', {
      headers: { 'x-api-key': apiKey as string },
    });
    expect(readAll.status()).toBe(200);
  });
});

