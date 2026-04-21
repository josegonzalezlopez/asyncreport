import { test, expect } from '@playwright/test';

test.describe('API pública /api/health', () => {
  test('retorna status ok y timestamp ISO', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json).toMatchObject({ status: 'ok' });
    expect(typeof json.now).toBe('string');
    expect(Number.isNaN(Date.parse(json.now))).toBeFalsy();
  });
});
