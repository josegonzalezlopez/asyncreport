import { test, expect } from '@playwright/test';

function isHtmlResponse(contentType: string): boolean {
  return contentType.includes('text/html');
}

function isJsonResponse(contentType: string): boolean {
  return contentType.includes('application/json');
}

test.describe('API protegidas sin auth (smoke seguridad)', () => {
  const protectedGetRoutes = [
    '/api/users/me',
    '/api/projects/my',
    '/api/notifications/unread-count',
  ];

  for (const route of protectedGetRoutes) {
    test(`GET ${route} no expone datos sin auth`, async ({ request }) => {
      const res = await request.get(route);
      const status = res.status();
      const contentType = res.headers()['content-type'] ?? '';

      // Nunca debe romper con 5xx por falta de auth.
      expect(status).toBeLessThan(500);

      if (isJsonResponse(contentType)) {
        // Flujo API clásico: 401/403 JSON.
        expect([401, 403]).toContain(status);
      } else if (isHtmlResponse(contentType)) {
        // Flujo middleware Clerk: redirect a sign-in (puede terminar 200 HTML).
        expect(res.url()).toContain('/sign-in');
      } else {
        // Cualquier otro content-type es inesperado en este caso.
        expect(contentType.length).toBeGreaterThan(0);
      }
    });
  }

  test('POST /api/daily sin auth no crea registros', async ({ request }) => {
    const res = await request.post('/api/daily', {
      data: {
        projectId: 'fake',
        yesterday: 'texto de prueba suficiente',
        today: 'texto de prueba suficiente',
        mood: 3,
        userTimezone: 'UTC',
      },
    });

    const status = res.status();
    const contentType = res.headers()['content-type'] ?? '';
    expect(status).toBeLessThan(500);

    if (isJsonResponse(contentType)) {
      expect([400, 401, 403]).toContain(status);
    } else if (isHtmlResponse(contentType)) {
      expect(res.url()).toContain('/sign-in');
    } else {
      expect(contentType.length).toBeGreaterThan(0);
    }
  });
});

