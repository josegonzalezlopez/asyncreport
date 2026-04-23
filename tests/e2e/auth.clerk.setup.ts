import { test as setup } from '@playwright/test';
import { clerkSetup } from '@clerk/testing/playwright';

/**
 * Obtiene CLERK_TESTING_TOKEN y CLERK_FAPI; debe ir antes de tests con Clerk
 * (project `clerk-setup` y `dependencies` en playwright.config).
 */
setup.describe.configure({ mode: 'serial' });

setup('clerk global setup', async () => {
  await clerkSetup();
});
