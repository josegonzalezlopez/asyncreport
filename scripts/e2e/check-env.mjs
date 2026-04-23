import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

const root = process.cwd();
const envPath = path.resolve(root, '.env.e2e');

if (fs.existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

const API_VARS = [
  'E2E_API_KEY',
  'E2E_ADMIN_API_KEY',
  'E2E_USER_API_KEY',
  'E2E_TECHLEAD_API_KEY',
  'E2E_DAILY_PROJECT_ID',
  'E2E_NON_MEMBER_PROJECT_ID',
  'E2E_AI_PROJECT_ID',
  'E2E_AS_USER_EMAIL',
];

const GROUPS = [
  {
    name: 'API keys por rol',
    vars: ['E2E_API_KEY', 'E2E_ADMIN_API_KEY', 'E2E_USER_API_KEY', 'E2E_TECHLEAD_API_KEY'],
  },
  {
    name: 'Proyectos de prueba',
    vars: ['E2E_DAILY_PROJECT_ID', 'E2E_NON_MEMBER_PROJECT_ID', 'E2E_AI_PROJECT_ID'],
  },
  {
    name: 'Datos de negocio',
    vars: ['E2E_AS_USER_EMAIL'],
  },
  {
    name: 'test:e2e:full — web (Clerk) — obligatoria',
    vars: ['E2E_CLERK_TEST_EMAIL'],
  },
  {
    name: 'Legacy (no usado en preflight full) — storage manual',
    vars: ['E2E_STORAGE_STATE'],
  },
];

function hasValue(name) {
  const value = process.env[name];
  return Boolean(value && value.trim());
}

function maskValue(value, keep = 4) {
  if (!value) return '';
  if (value.length <= keep * 2) return '*'.repeat(value.length);
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

function validateStorageStateOptional() {
  const relative = process.env.E2E_STORAGE_STATE;
  if (!relative || !relative.trim()) {
    return { ok: false, message: 'no definida' };
  }
  const fullPath = path.resolve(root, relative);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, message: `archivo inexistente: ${fullPath}` };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (!Array.isArray(parsed.cookies) || !Array.isArray(parsed.origins)) {
      return { ok: false, message: 'JSON invalido' };
    }
  } catch {
    return { ok: false, message: 'no es JSON valido' };
  }
  return { ok: true, message: fullPath };
}

const missingApi = API_VARS.filter((n) => !hasValue(n));
const hasTicketEmail = hasValue('E2E_CLERK_TEST_EMAIL');
const storageInfo = validateStorageStateOptional();

console.log('\nChecklist .env.e2e\n');
console.log(`Archivo: ${envPath}`);
console.log(fs.existsSync(envPath) ? 'Estado: encontrado\n' : 'Estado: NO encontrado\n');

for (const group of GROUPS) {
  console.log(`## ${group.name}`);
  for (const name of group.vars) {
    const value = process.env[name] ?? '';
    const ok = hasValue(name);
    const detail = ok ? `(${maskValue(value)})` : '(faltante)';
    console.log(`- ${ok ? 'OK ' : 'ERR'} ${name} ${detail}`);
  }
  console.log('');
}

console.log('## Nota: E2E_STORAGE_STATE (export manual) — ignorado en test:e2e:full; solo referencia / herramientas');
console.log(
  `- E2E_STORAGE_STATE: ${storageInfo.ok ? `OK ${storageInfo.message}` : storageInfo.message}\n`,
);

if (missingApi.length) {
  console.error('Resultado: INCOMPLETO (faltan variables requeridas para e2e API).');
  console.error(`Faltan: ${missingApi.join(', ')}`);
  console.error('Rellena .env.e2e. Ver docs/E2E_INTEGRATION.md o npm run e2e:seed-db.');
  process.exit(1);
}

if (!hasTicketEmail) {
  console.log(
    'Aviso: E2E_CLERK_TEST_EMAIL faltante — preflight de `test:e2e:full` y tests web fallarán.',
  );
  console.log(
    '  Añade en .env.e2e: E2E_CLERK_TEST_EMAIL (email de un usuario de tu instancia Clerk dev).',
  );
  console.log('\nResultado: OK para test:e2e:api. NO listo para test:e2e:full (web).');
  process.exit(0);
}

console.log('Resultado: OK — listo para test:e2e:api y test:e2e:full (web con Clerk).');
process.exit(0);
