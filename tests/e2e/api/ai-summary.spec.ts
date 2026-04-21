import { test, expect } from '@playwright/test';

const userKey = process.env.E2E_USER_API_KEY;
const techLeadKey = process.env.E2E_TECHLEAD_API_KEY;
const aiProjectId = process.env.E2E_AI_PROJECT_ID;

test.describe('AI Summary module', () => {
  test('POST /api/ai-summary requiere rol TECH_LEAD o ADMIN', async ({ request }) => {
    test.skip(!userKey, 'Define E2E_USER_API_KEY');
    const res = await request.post('/api/ai-summary', {
      headers: { 'x-api-key': userKey as string },
      data: { projectId: aiProjectId ?? 'x' },
    });
    expect(res.status()).toBe(403);
  });

  test('POST /api/ai-summary valida projectId', async ({ request }) => {
    test.skip(!techLeadKey, 'Define E2E_TECHLEAD_API_KEY');
    const res = await request.post('/api/ai-summary', {
      headers: { 'x-api-key': techLeadKey as string },
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/ai-summary requiere projectId', async ({ request }) => {
    test.skip(!techLeadKey, 'Define E2E_TECHLEAD_API_KEY');
    const res = await request.get('/api/ai-summary', {
      headers: { 'x-api-key': techLeadKey as string },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/ai-summary inicia (202) o responde estado de negocio', async ({ request }) => {
    test.skip(!techLeadKey || !aiProjectId, 'Define E2E_TECHLEAD_API_KEY y E2E_AI_PROJECT_ID');
    const res = await request.post('/api/ai-summary', {
      headers: { 'x-api-key': techLeadKey as string },
      data: { projectId: aiProjectId },
    });
    expect([202, 422, 429]).toContain(res.status());

    if (res.status() === 202) {
      const json = await res.json();
      expect(json.data?.summaryId).toBeTruthy();
    }
  });
});

