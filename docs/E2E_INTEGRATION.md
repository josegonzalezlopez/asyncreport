# Integración E2E (Playwright + Vitest)

Objetivo: correr **toda** la batería (unit + e2e) con el mínimo de fricción: variables en `.env.e2e` (no hace falta `source` manual).

## Carga automática de variables

Si existe `.env.e2e` en la raíz del repo:

- **Playwright** lo carga al leer `playwright.config.ts` (cualquier `npm run test:e2e*`).
- **Preflight full** (`tests/e2e/utils/preflight.ts`) y **preflight API** (`tests/e2e/utils/preflight-api.ts`) cargan el mismo `.env.e2e` y validan variables antes de `test:e2e:full` y `test:e2e:api` respectivamente.
- **Playwright** (`playwright.config.ts`): `chromium` excluye `dashboard-smoke` y `auth.clerk.setup.ts`. `chromium-clerk` solo corre `web/dashboard-smoke.spec.ts` (sesión vía `E2E_CLERK_TEST_EMAIL` + [`@clerk/testing`](https://clerk.com/docs/testing/playwright): `clerkSetup`, `setupClerkTestingToken`, `clerk.signIn`). Cargar `.env.local` aporta `CLERK_SECRET_KEY` y `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (mapeo a `CLERK_PUBLISHABLE_KEY`). **No** se usa `E2E_STORAGE_STATE` en `test:e2e:full` (headless + `next start` + cookies exportadas no es soportable de forma fiable). Ver sección `E2E_CLERK_TEST_EMAIL`.

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
npm run test:e2e:quick            # Misma suite que :api, sin preflight (iteración local rápida)
npm run test:e2e:api              # Preflight (solo API/CLI) + API + web público
npm run test:e2e:full             # Preflight (API + E2E_CLERK_TEST_EMAIL) + toda la suite
npm run test:integration          # Vitest + test:e2e:full
```

### Banda de tests (qué exige el entorno)

| Banda | Script | Validación | Qué se ejecuta |
|-------|--------|------------|----------------|
| **Rápido** | `test:e2e:quick` | Ninguna en npm | `tests/e2e/api` + `tests/e2e/web/public-routes.spec.ts` (falla al vuelo si faltan vars) |
| **API / CI local** | `test:e2e:api` | 8 variables + `npm run e2e:check-env` (storage opcional) | Lo mismo que quick |
| **Completo** | `test:e2e:full` | API + `E2E_CLERK_TEST_EMAIL` (web) | Toda `tests/e2e/**` respetada por `playwright.config` |
| **Integración** | `test:integration` | Igual que full | Vitest + e2e full |

Para e2e **sin** web autenticado, usa `test:e2e:api`. `test:e2e:full` exige `E2E_CLERK_TEST_EMAIL` para el smoke del dashboard.

## Variables: `test:e2e:api` y `test:e2e:full`

Plantilla: `.env.e2e.example`.

| Variable | Uso |
|----------|-----|
| `E2E_BASE_URL` / `E2E_PORT` | Base del servidor bajo prueba. `http://127.0.0.1` o `http://localhost` hace que Playwright levante `next start` en ese puerto; un host remoto (staging) asume servicio ya levantado. |
| `E2E_API_KEY` | Usuario “principal” de smoke API/CLI (membresías conocidas). |
| `E2E_ADMIN_API_KEY` | Rol ADMIN para RBAC y rutas admin. |
| `E2E_USER_API_KEY` | Rol USER. |
| `E2E_TECHLEAD_API_KEY` | Rol TECH_LEAD (p. ej. AI sobre proyecto). |
| `E2E_DAILY_PROJECT_ID` | Proyecto donde el usuario de `E2E_API_KEY` puede crear/listar dailies. |
| `E2E_NON_MEMBER_PROJECT_ID` | Proyecto donde **no** es miembro el actor de `E2E_API_KEY` (403/404 según contrato). |
| `E2E_AI_PROJECT_ID` | Proyecto donde el tech lead puede disparar resumen AI. |
| `E2E_AS_USER_EMAIL` | Email de **otro** usuario en BD (tests de suplantación / filtrado). |
| `E2E_CLERK_TEST_EMAIL` | **Obligatoria** para `test:e2e:full` (smoke web). Email de un usuario de tu instancia Clerk **dev**; `clerk.signIn` con ticket. |
| `E2E_STORAGE_STATE` | Opcional; solo para pruebas manuales o flujo `e2e:export-storage` — **no** alimenta `test:e2e:full`. |

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

## Web dashboard: `E2E_CLERK_TEST_EMAIL` (obligatoria en full)

1. En `.env.e2e`, define `E2E_CLERK_TEST_EMAIL` con un correo de usuario que exista en el **Dashboard** de tu instancia de desarrollo de Clerk (mismo `NEXT_PUBLIC_CLERK` / `CLERK` que en `.env.local` del app).
2. Asegúrate de que `playwright` pueda leer claves: `.env.local` con `CLERK_SECRET_KEY` (sk_test) y public key.
3. El proyecto de Playwright ejecuta `tests/e2e/auth.clerk.setup.ts` antes de `chromium-clerk` (dependencia `clerk-setup`).
4. `npm run test:e2e:full` — el spec llama a `clerk.signIn({ emailAddress })` (ticket).

## Generar `E2E_STORAGE_STATE` (opcional, no usada en el full)

Ruta por defecto en el repo: `.auth/manual-storage-state.json` (el spec de export la usa si no pasas `E2E_STORAGE_STATE_OUT`). Crea la carpeta si hace falta: `mkdir -p .auth`.

Flujo (requiere **login humano** en Clerk en el navegador que abre Playwright):

1. Arranca la app con el mismo host/puerto que `E2E_BASE_URL` en `.env.e2e` (p. ej. `E2E_PORT=3005 npm run dev`). `reuseExistingServer` en Playwright reutiliza un `next` ya en marcha en ese puerto.
2. En el mismo directorio del repo:

   ```bash
   npm run e2e:export-storage
   ```

   Equivale a `E2E_RECORD_STORAGE=1 PW_RUN_WEB_E2E=1` y escribe en `E2E_STORAGE_STATE_OUT` (por defecto del script: `.auth/manual-storage-state.json`). Para otra ruta, exporta con `E2E_STORAGE_STATE_OUT=...` delante de `playwright test`.
3. En el **Playwright Inspector**, inicia sesión (usuario con el rol que necesiten los tests de dashboard) y pulsa **Resume** para que se guarde el `storageState`.
4. Puedes guardar la ruta en `.env.e2e` a efectos documentales; **no** sustituye `E2E_CLERK_TEST_EMAIL` para el comando `test:e2e:full`.

## Automatización con un agente LLM

Un agente puede: correr `npm run e2e:check-env`, ejecutar en modo seco el preflight API vs full, proponer valores faltantes desde BD de staging (solo lectura) o un checklist previo a `test:integration`. No escriba secretos en el chat ni en commits: keys en `.env.e2e` local o GitHub Environments/Secrets.

## Referencia rápida de scripts

| Script | Descripción |
|--------|-------------|
| `npm test` | Vitest |
| `npm run e2e:check-env` | Comprueba `.env.e2e` (API; avisa si falta `E2E_CLERK_TEST_EMAIL` para full) |
| `npm run test:e2e:quick` | API + public web, sin preflight en npm |
| `npm run test:e2e:api` | Preflight API + misma suite que `quick` |
| `npm run test:e2e:full` | Preflight (API + `E2E_CLERK_TEST_EMAIL`) + suite completa Playwright |
| `npm run e2e:export-storage` | Genera `E2E_STORAGE_STATE` (navegador con login Clerk; requiere app en marcha) |
| `npm run test:integration` | Vitest + e2e full |

Más contexto general: `docs/TESTING_SETUP.md` y catálogo de escenarios: `docs/TEST_SCENARIOS.md`.
