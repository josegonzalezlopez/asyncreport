import path from 'node:path';
import { test } from '@playwright/test';

/**
 * Flujo manual para generar `E2E_STORAGE_STATE` (cookies + origins de Clerk).
 *
 * 1. Arranca la app en la misma base URL que en `.env.e2e` (p. ej. `E2E_PORT=3005 npm run dev`).
 * 2. `npm run e2e:export-storage` (o el comando largo con E2E_RECORD_STORAGE + PW_RUN_WEB_E2E + --headed).
 * 3. En el inspector, login en Clerk y "Resume"; el JSON se escribe en E2E_STORAGE_STATE_OUT.
 * 4. Comprueba `E2E_STORAGE_STATE` en `.env.e2e` y `npm run e2e:check-env`.
 */
test.describe('Manual: exportar storage state', () => {
  test.skip(
    process.env.PW_RUN_WEB_E2E !== '1',
    'Activa PW_RUN_WEB_E2E=1 (mismo guard que el resto de web e2e).',
  );

  test.skip(
    process.env.E2E_RECORD_STORAGE !== '1',
    'Solo con E2E_RECORD_STORAGE=1 para no ejecutar en suites normales.',
  );

  test('pause → login → guardar storageState', async ({ page, context }) => {
    test.setTimeout(5 * 60_000);
    const out = path.resolve(
      process.cwd(),
      process.env.E2E_STORAGE_STATE_OUT ?? '.auth/manual-storage-state.json',
    );

    await page.goto('/');
    await page.pause();
    await context.storageState({ path: out });
    process.stdout.write(`\n✅ Storage guardado en: ${out}\n\n`);
  });
});
