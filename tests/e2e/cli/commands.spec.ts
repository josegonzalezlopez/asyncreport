import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

const hasApiKey = Boolean(process.env.E2E_API_KEY);

function resolveCliBaseUrl(): string {
  const fromEnv =
    process.env.ASYNCREPORT_BASE_URL?.trim() || process.env.E2E_BASE_URL?.trim();
  if (fromEnv) return fromEnv;
  const port = process.env.E2E_PORT ?? '3005';
  return `http://127.0.0.1:${port}`;
}

test.describe('CLI smoke', () => {
  test('help muestra comandos clave y guía de npm --', async () => {
    const out = execSync('npm run cli -- --help', {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    });

    expect(out).toContain('AsyncReport CLI');
    expect(out).toContain('report');
    expect(out).toContain('use-project');
    expect(out).toContain('npm run cli --');
  });

  test('projects lista membresías usando X-API-Key', async () => {
    test.skip(!hasApiKey, 'Requiere E2E_API_KEY para integración real CLI/API');

    const out = execSync('npm run cli -- projects', {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        // El login interactivo no se usa en CI; se inyecta config por env.
        ASYNCREPORT_API_KEY: process.env.E2E_API_KEY,
        ASYNCREPORT_BASE_URL: resolveCliBaseUrl(),
      },
    });

    expect(out).toContain('Tus proyectos');
  });
});
