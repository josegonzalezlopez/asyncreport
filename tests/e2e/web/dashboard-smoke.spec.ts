import { test, expect } from '@playwright/test';

const storageStatePath = process.env.E2E_STORAGE_STATE;

test.describe('Web UX dashboard (autenticado)', () => {
  test.skip(
    process.env.PW_RUN_WEB_E2E !== '1',
    'Web e2e deshabilitado por defecto en local. Activa con PW_RUN_WEB_E2E=1.',
  );
  test.skip(!storageStatePath, 'Define E2E_STORAGE_STATE con sesión Clerk autenticada.');

  test.use({ storageState: storageStatePath as string });

  test('render de layout dashboard + navegación básica', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('AsyncReport')).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /proyectos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /mis dailies/i })).toBeVisible();
  });

  test('ruta profile carga sin errores', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible();
  });
});

