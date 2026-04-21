# Integración E2E (Playwright + Vitest)

Objetivo: correr **toda** la batería (unit + e2e) con el mínimo de fricción: variables en `.env.e2e` (no hace falta `source` manual).

## Carga automática de variables

Si existe `.env.e2e` en la raíz del repo:

- **Playwright** lo carga al leer `playwright.config.ts` (cualquier `npm run test:e2e*`).
- **Preflight** (`tsx tests/e2e/utils/preflight.ts`) lo carga antes de validar el entorno para `test:e2e:full`.

`.env.e2e` está en `.gitignore`: no lo subas al control de versiones.

## Primer arranque

```bash
npm install
npm run test:e2e:install
cp .env.e2e.example .env.e2e
```

Edita `.env.e2e` según las secciones siguientes. Luego:

```bash
npm test                          # Vitest
npm run test:e2e:quick            # API + web público (sin preflight estricto)
npm run test:e2e:full             # Preflight + todo (web con auth, CLI, API…)
npm run test:integration          # Vitest + test:e2e:full
```

## Variables obligatorias para `test:e2e:full`

Plantilla: `.env.e2e.example`.

| Variable | Uso |
|----------|-----|
| `E2E_BASE_URL` / `E2E_PORT` | Base del servidor bajo prueba (Playwright y CLI si no defines `ASYNCREPORT_BASE_URL`). |
| `E2E_API_KEY` | Usuario “principal” de smoke API/CLI (membresías conocidas). |
| `E2E_ADMIN_API_KEY` | Rol ADMIN para RBAC y rutas admin. |
| `E2E_USER_API_KEY` | Rol USER. |
| `E2E_TECHLEAD_API_KEY` | Rol TECH_LEAD (p. ej. AI sobre proyecto). |
| `E2E_DAILY_PROJECT_ID` | Proyecto donde el usuario de `E2E_API_KEY` puede crear/listar dailies. |
| `E2E_NON_MEMBER_PROJECT_ID` | Proyecto donde **no** es miembro el actor de `E2E_API_KEY` (403/404 según contrato). |
| `E2E_AI_PROJECT_ID` | Proyecto donde el tech lead puede disparar resumen AI. |
| `E2E_AS_USER_EMAIL` | Email de **otro** usuario en BD (tests de suplantación / filtrado). |
| `E2E_STORAGE_STATE` | Ruta a JSON de `storageState` (sesión Clerk) para dashboard autenticado. |

Opcional explícito para el CLI en CI:

- `ASYNCREPORT_BASE_URL` — si no está, los tests del CLI usan `E2E_BASE_URL` o `http://127.0.0.1:<E2E_PORT>`.

## Cómo obtener API keys y IDs

1. **API keys**  
   Inicia sesión con cada rol (ADMIN, USER, TECH_LEAD y el usuario “principal” de smoke) en `/dashboard/profile`, sección API Keys, y crea una clave por entorno QA. Copia cada valor a la variable correspondiente en `.env.e2e`.

2. **IDs de proyecto**  
   Con cada API key puedes usar el CLI (ya respeta `ASYNCREPORT_API_KEY` / `ASYNCREPORT_BASE_URL`):

   ```bash
   ASYNCREPORT_BASE_URL=http://127.0.0.1:3005 ASYNCREPORT_API_KEY="<key>" npm run cli -- projects
   ```

   O revisa tablas `Project` / `ProjectMember` en Prisma Studio (`npm run prisma:studio`).

3. **`E2E_NON_MEMBER_PROJECT_ID`**  
   Elige un `projectId` del que el usuario de `E2E_API_KEY` **no** sea miembro (misma comprobación en BD o intentando operaciones hasta ver el error esperado).

4. **`E2E_AI_PROJECT_ID`**  
   Proyecto donde el usuario de `E2E_TECHLEAD_API_KEY` tenga permisos para ejecutar el flujo de resumen AI que cubren los tests.

5. **`E2E_AS_USER_EMAIL`**  
   Email exacto de un usuario existente (distinto del “principal” si el test lo exige).

## Generar `E2E_STORAGE_STATE` (sesión web)

Ruta típica en ejemplo: `.auth/qa-admin-storage-state.json` (crea la carpeta `.auth` si no existe).

Flujo recomendado con el test manual incluido:

1. Arranca la app en la misma URL que `E2E_BASE_URL` (p. ej. `E2E_PORT=3005 npm run dev`).
2. Ejecuta:

   ```bash
   E2E_RECORD_STORAGE=1 PW_RUN_WEB_E2E=1 npx playwright test tests/e2e/web/export-storage-state.spec.ts --headed
   ```

   Opcional: `E2E_STORAGE_STATE_OUT=.auth/qa-admin-storage-state.json` para fijar la ruta de salida.

3. Cuando se abra el inspector, completa el login en el navegador y continúa con **Resume**.
4. En `.env.e2e`, asigna `E2E_STORAGE_STATE` a la ruta absoluta o relativa del JSON generado.

## Automatización con un agente LLM

Un agente puede: validar que `.env.e2e` cumple el preflight, proponer valores faltantes consultando tu BD de staging (solo lectura), o generar un checklist antes de `npm run test:integration`. No debe escribir secretos en el chat ni en commits: mantén keys solo en `.env.e2e` local o secretos de CI.

## Referencia rápida de scripts

| Script | Descripción |
|--------|-------------|
| `npm test` | Vitest |
| `npm run test:e2e:quick` | Smoke API + rutas públicas web |
| `npm run test:e2e:full` | Preflight + suite completa Playwright |
| `npm run test:integration` | Vitest + e2e full |

Más contexto general: `docs/TESTING_SETUP.md` y catálogo de escenarios: `docs/TEST_SCENARIOS.md`.
