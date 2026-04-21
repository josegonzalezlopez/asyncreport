import { test, expect } from '@playwright/test';

test.describe('Navegación pública y guard de auth', () => {
  test.skip(
    process.env.PW_RUN_WEB_E2E !== '1',
    'Web e2e deshabilitado por defecto en local. Activa con PW_RUN_WEB_E2E=1.',
  );

  test('landing renderiza CTA principal', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /otra reunión/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /iniciar sesión/i }).first()).toBeVisible();
  });

  test('dashboard redirige a sign-in sin sesión', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('api protegida sin credenciales no retorna 200 JSON', async ({ request }) => {
    const res = await request.get('/api/users/me');
    // Según entorno/Clerk: puede ser 401/403 JSON o 200 HTML tras redirect a sign-in.
    const ct = res.headers()['content-type'] ?? '';
    const isJson = ct.includes('application/json');
    const redirectedToSignIn = /\/sign-in/.test(res.url());

    if (isJson) {
      expect([401, 403]).toContain(res.status());
    } else {
      expect(redirectedToSignIn || ct.includes('text/html')).toBeTruthy();
    }
  });
});
