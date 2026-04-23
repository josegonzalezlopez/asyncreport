## AsyncReport (Next.js 15 + Prisma + PostgreSQL)

Plataforma SaaS para gestionar **dailies asíncronas** con **RBAC**, **notificaciones internas** e histórico de **resúmenes con IA**.

### Arquitectura (reglas del proyecto)

- **API Routes only**: todo backend en `app/api/**/route.ts` (no Server Actions).
- **Service Pattern**: lógica/DB en `lib/services/`**; las routes solo validan/orquestan.
- **Seguridad**: validar input con **Zod** y autenticar con **Clerk** en cada endpoint sensible.

### Estructura inicial

- `**app/`**: App Router (RSC por defecto)
  - `page.tsx`: landing mínima
  - `layout.tsx`: layout raíz
  - `app/api/health/route.ts`: endpoint ejemplo (público) usando un service
- `**lib/**`
  - `db.ts`: PrismaClient singleton
  - `services/health.service.ts`: ejemplo de service
- `**prisma/schema.prisma**`: modelos `User`, `Project`, `ProjectUser` (M-M), `DailyReport`, `Notification`, `AISummary`

---

### Cómo correr localmente en Kubuntu

#### 1) Requisitos

- Node.js recomendado **20+ LTS**
- PostgreSQL local o un proyecto en Supabase

#### 2) Instalar Node.js (recomendado: nvm)

```bash
sudo apt update
sudo apt install -y curl ca-certificates
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source "$HOME/.bashrc"
nvm install --lts
nvm use --lts
node -v
```

#### 3) Instalar dependencias

Con npm:

```bash
npm install
```

Opcional (recomendado) con pnpm:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

#### 4) Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` y configura al menos:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
- `GEMINI_API_KEY` (cuando actives `AI Summary`)
- `RESEND_API_KEY` (cuando actives emails)

> Seguridad: no comitees `.env.local`.

#### 5) Prisma: generar cliente y migrar

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Opcional: Prisma Studio

```bash
npx prisma studio
```

#### 6) Levantar el servidor de desarrollo

```bash
npm run dev
```

Luego abre `http://localhost:3000` y prueba `GET /api/health`.

### Testing automatizado

```bash
npm test                # Vitest (unit/integration)
npm run test:cli        # subset CLI
npm run test:e2e:install
npm run test:e2e        # Playwright (web/api/cli smoke)
```

Escenarios completos y guía detallada:
- `docs/TESTING_SETUP.md`
- `docs/TEST_SCENARIOS.md`

### Quality gates locales (pre-push, costo cero)

Para bloquear pushes con regresiones sin consumir GitHub Actions:

```bash
npm run local:hooks:install
```

Desde ahi, cada `git push` ejecuta en local:
- `npm run lint`
- `npm test`
- `npm run test:e2e:full`

Configuracion opcional:
- `LOCAL_GATES_SKIP_E2E=1 git push` -> omite E2E en equipos lentos.
- `SKIP_LOCAL_GATES=1 git push` -> bypass puntual de emergencia.
- `LOCAL_QA_OLLAMA_MODEL=<modelo> npm run local:triage reports/local-quality/prepush-latest.log` -> triage manual opcional con Ollama local (no se ejecuta automaticamente en pre-push).

Artefactos locales:
- `reports/local-quality/prepush-latest.log`
- `reports/local-quality/prepush-summary.md`
- `reports/local-quality/prepush-triage.md`

### Seguridad Supabase (RLS + grants)

- Ejecutar auditoria local/remota:

```bash
npm run security:supabase
```

- Documentacion de remediacion:
  - `docs/SUPABASE_RLS_REMEDIATION.md`
  - `docs/SUPABASE_SCHEMA_SECURITY_CHECKLIST.md`

### CI — calidad (lint / test / build)

- Workflow: `.github/workflows/ci.yml` (jobs `lint`, `test`, `build` en cada PR a `main` / `release/**`).
- Detalle y protección de rama: `docs/engineering/CI_QUALITY_GATES.md`.

### Seguridad de dependencias (supply chain)

- Generar salida de auditoria (`npm audit` en JSON):

```bash
npm audit --omit=dev --json > audit-output.json || true
```

- Generar reporte normalizado para CI/agente:

```bash
npm run security:deps:report
```

- Workflow en CI:
  - `.github/workflows/dependency-security.yml`
  - politica:
    - PR a `main`: warning-only
    - PR a `release/*`: fail en `high/critical` runtime
  - agente:
    - comenta resumen en PR
    - sube artifact de remediacion

---

### IA-augmented (recomendación práctica)

Para acelerar el desarrollo con consistencia (Zod + RBAC + Service Pattern), un agente de IA puede:

- **Generar scaffolding** de endpoints (`app/api/`**) + services (`lib/services/**`) a partir del modelo Prisma.
- **Autogenerar** esquemas Zod (request/response) y pruebas contractuales.
- **Detectar regresiones de seguridad** (falta de auth/RBAC/validación) en PRs mediante un job de CI.

