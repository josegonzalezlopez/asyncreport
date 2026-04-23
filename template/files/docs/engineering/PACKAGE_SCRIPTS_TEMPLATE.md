# Package Scripts Template

Agregar o adaptar en `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:e2e:ci": "tsx tests/e2e/utils/preflight-api.ts && PW_RUN_WEB_E2E=1 playwright test tests/e2e/api tests/e2e/web/public-routes.spec.ts tests/e2e/cli",
    "local:hooks:install": "bash scripts/local-quality/install-git-hooks.sh",
    "local:prepush": "bash scripts/local-quality/run-prepush-gates.sh",
    "local:triage": "node scripts/local-quality/triage-local-failure.mjs"
  }
}
```
