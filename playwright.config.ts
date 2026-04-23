import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

const e2eEnvPath = path.resolve(process.cwd(), '.env.e2e');
if (fs.existsSync(e2eEnvPath)) {
  loadDotenv({ path: e2eEnvPath });
}
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) {
  loadDotenv({ path: localEnvPath, override: false });
}
// @clerk/testing lee CLERK_PUBLISHABLE_KEY; en Next la variable suele ser NEXT_PUBLIC_*
if (
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.CLERK_PUBLISHABLE_KEY
) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const PORT = Number(process.env.E2E_PORT ?? 3005);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/** Si `E2E_BASE_URL` apunta a staging/QA, no levantamos servidor. Localhost/127.0.0.1 = webServer automático. */
function isLoopbackBaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

const e2eBase = process.env.E2E_BASE_URL;
const useExternalBaseUrl =
  e2eBase != null && e2eBase.trim() !== '' && !isLoopbackBaseUrl(e2eBase);

const chrome = { ...devices['Desktop Chrome'] };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'clerk-setup',
      testMatch: '**/auth.clerk.setup.ts',
    },
    {
      name: 'chromium',
      testIgnore: [
        '**/web/dashboard-smoke.spec.ts',
        '**/auth.clerk.setup.ts',
      ],
      use: { ...chrome },
    },
    {
      name: 'chromium-clerk',
      testMatch: '**/web/dashboard-smoke.spec.ts',
      dependencies: ['clerk-setup'],
      use: { ...chrome },
    },
  ],
  webServer: useExternalBaseUrl
    ? undefined
    : {
        // Evita lock de `.next/dev` cuando el usuario ya tiene `next dev` corriendo.
        command: `npm run build && npm run start -- --port ${PORT}`,
        url: `${baseURL}/api/health`,
        timeout: 180_000,
        reuseExistingServer: true,
      },
});
