import { test, expect } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';

const ticketEmail = process.env.E2E_CLERK_TEST_EMAIL?.trim();

/**
 * Sesión solo vía `E2E_CLERK_TEST_EMAIL` + `clerk.signIn` (@clerk/testing).
 * Requiere proyecto `clerk-setup` y claves Clerk en `.env.local` (ver playwright.config).
 */
test.describe('Web UX dashboard (autenticado)', () => {
  test.describe.configure({ mode: 'serial' });

  test.skip(
    process.env.PW_RUN_WEB_E2E !== '1',
    'Web e2e deshabilitado por defecto en local. Activa con PW_RUN_WEB_E2E=1.',
  );
  test.skip(
    !ticketEmail,
    'Define E2E_CLERK_TEST_EMAIL en .env.e2e (usuario de tu instancia Clerk dev).',
  );

  test.beforeEach(async ({ page, context }) => {
    await setupClerkTestingToken({ context });
    await page.goto('/', { waitUntil: 'load' });
    await clerk.signIn({ page, emailAddress: ticketEmail! });
  });

  async function gotoProtectedWithSkewRetry(page: { goto: (url: string, opts?: { waitUntil?: 'load' }) => Promise<unknown>; url: () => string; waitForTimeout: (ms: number) => Promise<void> }, path: string) {
    await page.goto(path, { waitUntil: 'load' });
    if (page.url().includes('/sign-in')) {
      // Clerk en dev puede rechazar JWT recién emitido si hay desfase de reloj de ~10-15s.
      await page.waitForTimeout(15_000);
      await page.goto(path, { waitUntil: 'load' });
    }
  }

  test('render de layout dashboard + navegación básica', async ({ page }) => {
    await gotoProtectedWithSkewRetry(page, '/dashboard');
    await expect(
      page,
      'Sesión inválida: sign-in o usuario inexistente en Clerk. Revisa E2E_CLERK_TEST_EMAIL y claves en .env.local.',
    ).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-projects')).toBeVisible();
    await expect(page.getByTestId('nav-dailies')).toBeVisible();
  });

  test('ruta profile carga sin errores', async ({ page }) => {
    await gotoProtectedWithSkewRetry(page, '/dashboard/profile');
    await expect(
      page,
      'Sesión inválida: redirigió a sign-in.',
    ).toHaveURL(/\/dashboard\/profile/);
    await expect(
      page.getByRole('heading', { name: 'Mi Perfil', level: 1 }),
    ).toBeVisible();
  });
});
