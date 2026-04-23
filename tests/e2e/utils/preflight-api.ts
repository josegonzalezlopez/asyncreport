import { getPreflightApiError } from './preflight-lib';

/**
 * Solo variables para tests que no requieren sesión web Clerk (API + public web + CLI con key).
 * Usado por `npm run test:e2e:api`.
 */
function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const err = getPreflightApiError();
if (err) fail(err);

console.log('✅ Preflight e2e API/CLI OK (sin E2E_STORAGE_STATE)');
