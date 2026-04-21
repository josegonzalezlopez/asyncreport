import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

const e2eEnvPath = path.resolve(process.cwd(), '.env.e2e');
if (fs.existsSync(e2eEnvPath)) {
  loadDotenv({ path: e2eEnvPath });
}

const REQUIRED_ENV = [
  'E2E_API_KEY',
  'E2E_ADMIN_API_KEY',
  'E2E_USER_API_KEY',
  'E2E_TECHLEAD_API_KEY',
  'E2E_DAILY_PROJECT_ID',
  'E2E_NON_MEMBER_PROJECT_ID',
  'E2E_AI_PROJECT_ID',
  'E2E_AS_USER_EMAIL',
  'E2E_STORAGE_STATE',
] as const;

function readMissingVars(): string[] {
  return REQUIRED_ENV.filter((name) => {
    const value = process.env[name];
    return !value || !value.trim();
  });
}

function validateStorageState(filePath: string): string | null {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return `E2E_STORAGE_STATE no existe: ${resolved}`;
  }
  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = JSON.parse(raw) as { cookies?: unknown[]; origins?: unknown[] };
    if (!Array.isArray(parsed.cookies) || !Array.isArray(parsed.origins)) {
      return `E2E_STORAGE_STATE inválido: faltan claves cookies/origins en ${resolved}`;
    }
  } catch {
    return `E2E_STORAGE_STATE inválido: no es JSON parseable (${resolved})`;
  }
  return null;
}

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const missing = readMissingVars();
if (missing.length) {
  fail(
    `Faltan variables para ejecutar e2e completo:\n- ${missing.join(
      '\n- ',
    )}\n\nCopia .env.e2e.example a .env.e2e y rellena los valores (se cargan automáticamente al ejecutar preflight / Playwright). Ver docs/E2E_INTEGRATION.md.`,
  );
}

const storageError = validateStorageState(process.env.E2E_STORAGE_STATE as string);
if (storageError) fail(storageError);

console.log('✅ Preflight e2e completo OK');
