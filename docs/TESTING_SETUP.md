# Testing Setup (Completo)

Este proyecto ahora tiene una estrategia por capas:

1. **Unit/Service tests (Vitest)**
   - Ubicación: `__tests__/services`, `__tests__/helpers`, `__tests__/cli`
   - Objetivo: lógica pura, validaciones, contratos internos.

2. **E2E Web/API/CLI (Playwright)**
   - Config: `playwright.config.ts`
   - Tests: `tests/e2e/**`
   - Objetivo: regresiones reales cross-layer (proxy + auth + API + UI + CLI).

## Scripts

```bash
npm test                # unit/integration vitest
npm run test:cli        # subset unit del CLI
npm run test:e2e:install # instalar browser chromium
npm run test:e2e        # e2e headless
npm run test:e2e:quick  # misma batería que :api, sin preflight en npm
npm run test:e2e:api    # preflight (solo API) + api + rutas web públicas
npm run test:e2e:full   # preflight (API + storage) + toda la suite
npm run e2e:export-storage  # genera E2E_STORAGE_STATE (Clerk, navegador; app en marcha)
npm run test:integration # vitest + e2e full (entorno completo)
npm run test:e2e:headed # e2e con browser visible
npm run test:e2e:ui     # UI runner de Playwright
```

Si existe `.env.e2e` en la raíz, **Playwright y el preflight lo cargan solos** (no hace falta `export` manual). Guía detallada de variables y flujos: [E2E_INTEGRATION.md](./E2E_INTEGRATION.md).

## Variables opcionales para e2e

- `E2E_PORT` (default `3005`)
- `E2E_BASE_URL` (default `http://127.0.0.1:<E2E_PORT>`)
- `E2E_API_KEY` (si quieres correr e2e del CLI contra backend real)
- `ASYNCREPORT_API_KEY` y `ASYNCREPORT_BASE_URL` (override del CLI en CI/e2e)
- `E2E_ADMIN_API_KEY`, `E2E_USER_API_KEY`, `E2E_TECHLEAD_API_KEY`
- `E2E_DAILY_PROJECT_ID`, `E2E_NON_MEMBER_PROJECT_ID`, `E2E_AI_PROJECT_ID`
- `E2E_AS_USER_EMAIL`
- `E2E_STORAGE_STATE` (archivo JSON con sesión Clerk para dashboard web autenticado)

Usa `.env.e2e.example` como plantilla de referencia.

## Primer arranque recomendado

```bash
npm install
npm run test:e2e:install
npm run test
npm run test:e2e
```

## Notas de diseño

- `proxy.ts` permite pasar requests con `X-API-Key`; esto se protege con tests e2e.
- El CLI soporta configuración por archivo `~/.asyncreport/config.json` y ahora también por env (ideal para CI).
- Los tests e2e están diseñados con smoke coverage inicial y extensión incremental por feature.
