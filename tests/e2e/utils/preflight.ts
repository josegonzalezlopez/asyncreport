import { getPreflightFullError } from './preflight-lib';

/**
 * Validación estricta para `test:e2e:full` y `test:integration` (capa completa + web auth).
 * Para solo API + rutas públicas use `preflight-api.ts` vía `npm run test:e2e:api`.
 */
function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const err = getPreflightFullError();
if (err) fail(err);

console.log('✅ Preflight e2e completo OK');
