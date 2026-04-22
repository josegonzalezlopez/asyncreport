import fs from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

const root = process.cwd();
const envPath = path.resolve(root, '.env.e2e');

if (fs.existsSync(envPath)) {
  loadDotenv({ path: envPath });
}

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
    name: 'Sesion web',
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

function validateStorageState() {
  const relative = process.env.E2E_STORAGE_STATE;
  if (!relative || !relative.trim()) {
    return { ok: false, message: 'E2E_STORAGE_STATE vacia' };
  }
  const fullPath = path.resolve(root, relative);
  if (!fs.existsSync(fullPath)) {
    return { ok: false, message: `No existe archivo: ${fullPath}` };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (!Array.isArray(parsed.cookies) || !Array.isArray(parsed.origins)) {
      return { ok: false, message: 'JSON sin cookies/origins validos' };
    }
  } catch {
    return { ok: false, message: 'JSON invalido o corrupto' };
  }
  return { ok: true, message: `OK (${fullPath})` };
}

const missing = [];

console.log('\nChecklist .env.e2e\n');
console.log(`Archivo: ${envPath}`);
console.log(fs.existsSync(envPath) ? 'Estado: encontrado\n' : 'Estado: NO encontrado\n');

for (const group of GROUPS) {
  console.log(`## ${group.name}`);
  for (const name of group.vars) {
    const value = process.env[name] ?? '';
    const ok = hasValue(name);
    if (!ok) missing.push(name);
    const detail = ok ? `(${maskValue(value)})` : '(faltante)';
    console.log(`- ${ok ? 'OK ' : 'ERR'} ${name} ${detail}`);
  }
  console.log('');
}

const storageCheck = validateStorageState();
console.log('## Validacion storage state');
console.log(`- ${storageCheck.ok ? 'OK ' : 'ERR'} ${storageCheck.message}\n`);

if (missing.length || !storageCheck.ok) {
  console.error('Resultado: INCOMPLETO');
  if (missing.length) {
    console.error(`Faltan ${missing.length} variables: ${missing.join(', ')}`);
  }
  console.error(
    'Siguiente paso: completa .env.e2e y vuelve a correr `npm run e2e:check-env`.',
  );
  process.exit(1);
}

console.log('Resultado: OK para ejecutar E2E completo.');
