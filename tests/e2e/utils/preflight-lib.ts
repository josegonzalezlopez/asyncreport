import { config as loadDotenv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const e2eEnvPath = path.resolve(process.cwd(), '.env.e2e');
if (fs.existsSync(e2eEnvPath)) {
  loadDotenv({ path: e2eEnvPath });
}

/** API + flujos CLI sin dashboard web: keys, project IDs, email as-user. Sin sesión Clerk. */
export const REQUIRED_ENV_API = [
  'E2E_API_KEY',
  'E2E_ADMIN_API_KEY',
  'E2E_USER_API_KEY',
  'E2E_TECHLEAD_API_KEY',
  'E2E_DAILY_PROJECT_ID',
  'E2E_NON_MEMBER_PROJECT_ID',
  'E2E_AI_PROJECT_ID',
  'E2E_AS_USER_EMAIL',
] as const;

function readMissing(names: readonly string[]): string[] {
  return names.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });
}

/**
 * @returns null si ok; string con mensaje de error si no.
 */
export function getPreflightApiError(): string | null {
  const missing = readMissing([...REQUIRED_ENV_API]);
  if (missing.length) {
    return `Faltan variables para e2e API/CLI:\n- ${missing.join(
      '\n- ',
    )}\n\nCopia .env.e2e.example a .env.e2e o usa npm run e2e:seed-db. Ver docs/E2E_INTEGRATION.md.`;
  }
  return null;
}

/**
 * Full = API + web dashboard: sesión vía @clerk/testing (`E2E_CLERK_TEST_EMAIL`).
 * El export a JSON (E2E_STORAGE_STATE) no es soportado en test:e2e:full con next start + headless.
 */
export function getPreflightFullError(): string | null {
  const apiErr = getPreflightApiError();
  if (apiErr) return apiErr;
  if (!process.env.E2E_CLERK_TEST_EMAIL?.trim()) {
    return `Falta E2E_CLERK_TEST_EMAIL: email de un usuario que exista en tu instancia Clerk (dev) para tests web en test:e2e:full. Añádelo en .env.e2e. Ver docs/E2E_INTEGRATION.md.`;
  }
  return null;
}
