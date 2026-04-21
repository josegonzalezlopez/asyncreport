# AsyncReport — Análisis Integral del Proyecto

> **Versión:** 1.3 | **Fecha:** 21 Abril 2026 | **Generado por:** Cursor AI

---

## Índice

1. [Visión Global de la App](#1-visión-global-de-la-app)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estado actual del código](#3-estado-actual-del-código)
4. [Coherencia: Definición vs Plan](#4-coherencia-definición-vs-plan)
5. [Gaps críticos identificados y resueltos](#5-gaps-críticos-identificados-y-resueltos)
6. [Viabilidad del plan](#6-viabilidad-del-plan)
7. [Arquitectura del sistema](#7-arquitectura-del-sistema)
8. [Roadmap completo](#8-roadmap-completo)

---

## 1. Visión Global de la App

**AsyncReport** es un SaaS de dailies asíncronas para equipos de software distribuidos en distintas zonas horarias. Su objetivo es eliminar las standups síncronas reemplazándolas con un portal centralizado de reportes diarios, análisis ejecutivo con IA (Gemini / Ollama) y un sistema de notificaciones internas y por email.

### Roles

| Rol | Responsabilidades principales |
|-----|-------------------------------|
| **Usuario (Reportador)** | Carga su daily (Ayer / Hoy / Bloqueadores / Mood 1-5), ve el feed del equipo, puede usar CLI para reportar desde la terminal |
| **Tech Lead** | Recibe alertas de bloqueadores (notificación interna + email), genera AI Summary bajo demanda con polling, consulta historial |
| **Administrador** | CRUD de proyectos, asignación de miembros y TLs, dashboard macro con métricas cacheadas |

### Flujos principales

**Usuario:**
1. Registro con Google (OAuth via Clerk)
2. Onboarding: seleccionar especialización
3. Ver proyectos asignados
4. Cargar daily (web o CLI)
5. Ver feed del equipo

**Tech Lead:**
1. Ver progreso de reportes del día
2. Recibir alertas de bloqueadores (notificación interna + email)
3. Generar AI Summary → 202 Accepted → polling de status cada 2s
4. Consultar historial de resúmenes

**Admin:**
1. CRUD de proyectos con estados (ACTIVE / PAUSED / FINISHED / ARCHIVED)
2. Asignación de Tech Leads y miembros (con notificación + email automático)
3. Dashboard macro con métricas cacheadas (unstable_cache, revalidación 5 min)

### Integraciones externas

| Servicio | Rol |
|----------|-----|
| Supabase | PostgreSQL hosted + Pgbouncer pooler |
| Clerk | Auth, OAuth Google, sesiones, webhooks |
| Gemini 2.0 Flash | Resúmenes ejecutivos (patrón async 202) |
| Ollama | Alternativa local sin cuota (qwen2.5:7b, llama3.2, etc.) |
| Resend | Emails transaccionales (asignación + bloqueador) |
| Vercel | Deploy serverless (Hobby plan con patrón 202) |
| Svix | Verificación de firma de webhooks Clerk |

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Estado |
|------|------------|---------|--------|
| Framework | Next.js App Router | **16.1.6** | ✅ Activo |
| UI Runtime | React | 19.2.4 | ✅ Activo |
| Lenguaje | TypeScript | 5.9.3 | ✅ Activo — `strict: true` |
| ORM | Prisma | 7.4.0 | ✅ Schema migrado, adapter-pg |
| Auth | Clerk Next.js | 6.x | ✅ Implementado + JIT provisioning |
| Validación | Zod | 4.x | ✅ v4 API (campo `error`) |
| IA | @google/generative-ai | latest | ✅ Con abstracción multi-proveedor |
| Email | Resend | latest | ✅ Templates HTML dark-mode |
| Testing | Vitest | 4.x | ✅ 48/48 tests pasando |
| Estilos | Tailwind CSS + shadcn/ui | — | ✅ Activo |
| Fechas | date-fns + date-fns-tz | latest | ✅ Timezone-aware |
| Forms | react-hook-form + @hookform/resolvers | latest | ✅ Activo |

---

## 3. Estado actual del código

### Fases completadas

#### ✅ Fase 1A — Infraestructura base
- `app/page.tsx` — Landing como RSC puro, links reales a `/sign-in` y `/sign-up`
- `lib/helpers/api-response.ts` — `successResponse` / `errorResponse` estandarizados
- `lib/helpers/logger.ts` — logs JSON estructurados
- `lib/helpers/handle-error.ts` — mapeo Zod/Prisma/negocio a códigos HTTP
- `lib/helpers/dates.ts` — `toUTCDayStart`, `isSameLocalDay`, `formatLocalDate` (date-fns-tz)
- `vitest.config.ts` + `vitest.setup.ts` — mock global de Prisma
- `prisma/schema.prisma` — modelos completos con enums `AISummaryStatus`, `NotificationType`
- `lib/db.ts` — singleton con `@prisma/adapter-pg` (Prisma 7)
- `prisma.config.ts` — carga `.env.local` explícita para CLI de Prisma
- Tests: `dates.test.ts`, `api-response.test.ts`

#### ✅ Fase 1B — Autenticación
- `proxy.ts` — `clerkMiddleware` con `auth.protect()`, matcher oficial
- `app/layout.tsx` — `ClerkProvider` con tema dark personalizado
- `lib/helpers/auth.ts` — `getAuthContext`, `requireRole`
- `lib/services/user.service.ts` — `syncFromClerk`, soft-delete, CRUD
- `app/api/webhooks/clerk/route.ts` — Svix signature verification
- `app/(auth)/` — sign-in, sign-up, onboarding (especialización)
- `app/(dashboard)/layout.tsx` — JIT provisioning si el usuario no está en DB
- `components/layout/sidebar.tsx` — navegación por rol
- Tests: `auth.test.ts` (8 tests)

#### ✅ Fase 2 — Gestión de Proyectos (Admin)
- `lib/validators/project.schema.ts` — Zod v4 (createProject, updateProject, assignMember)
- `lib/services/project.service.ts` — CRUD, soft-delete, assignMember con transacción atómica + notificación + email
- `lib/services/dashboard.service.ts` — `getDashboardMetrics` con `unstable_cache` (5 min)
- API routes: `GET|POST /api/projects`, `GET|PATCH|DELETE /api/projects/[id]`, `POST|DELETE /api/projects/[id]/members`, `GET /api/users`
- Páginas: `/dashboard/admin`, `/dashboard/admin/projects`, `/dashboard/admin/projects/[id]`
- Componentes: `ProjectTable`, `CreateProjectDialog`, `EditProjectSheet`, `ProjectStatusBadge`, `ManageMembersPanel`
- Tests: `project.service.test.ts` (6 tests)

#### ✅ Fase 3 — Dailies Core
- `lib/validators/daily.schema.ts` — Zod v4 con `userTimezone`
- `lib/services/daily.service.ts` — `create` (transacción atómica para bloqueadores + notificación al TL + email), `canUserReport` (timezone-aware), `findByProject` (cursor-based pagination), `findByUser`, `findById`
- API routes: `POST|GET /api/daily-reports`, `GET /api/projects/[id]/daily-reports`
- Páginas: `/dashboard/dailies`, `/dashboard/team`
- Componentes: `CreateDailyForm`, `MoodSelector`, `DailyCard`
- Tests: `daily.service.test.ts` (7 tests)

#### ✅ Fase 4 — Inteligencia Artificial
- `lib/helpers/sanitize.ts` — `sanitizeForAI()`: JWT, API keys, connection strings, emails
- `lib/helpers/prompts.ts` — `buildDailySummaryPrompt()` con 6 elementos estructurales, salida en markdown
- `lib/helpers/constants.ts` — `MAX_DAILY_SUMMARIES=5`, intervalos de polling
- `lib/helpers/ai-provider.ts` — **abstracción multi-proveedor**: Gemini (producción) y Ollama (desarrollo local sin cuota)
  - Retry automático con backoff para rate-limit por minuto de Gemini
  - Detección de cuota diaria agotada (no reintenta en ese caso)
- `lib/services/ai.service.ts` — `initiateSummary` + `processInBackground` (patrón 202 Accepted)
- API routes: `POST /api/ai-summary` (202), `GET /api/ai-summary`, `GET /api/ai-summary/status/[id]`
- Componentes: `GenerateSummaryButton` (polling + skeleton animado), `AISummaryCard` (markdown renderer propio)
- Página `/dashboard/ai-summary` con tabs por proyecto e historial
- Tests: `sanitize.test.ts` (8 tests)

#### ✅ Fase 5 — Notificaciones, Emails y Perfil
- `lib/services/notification.service.ts` — `create`, `findByUser` (cursor-based), `markAsRead` (ownership check), `markAllAsRead`, `countUnread`, `notifyBlockerInTx`, `notifyAISummaryInTx`
- Integración atómica en 3 servicios:
  - `project.service.assignMember` → `ProjectUser + Notification` en transacción → `sendProjectAssignmentEmail` fuera
  - `daily.service.create` → `DailyReport + Notification al TL` en transacción → `sendBlockerAlertEmail` fuera
  - `ai.service.processInBackground` → `AISummary COMPLETED + Notification` en transacción
- API routes: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/[id]/read`
- `lib/services/email.service.ts` — `sendProjectAssignmentEmail`, `sendBlockerAlertEmail`, templates HTML dark-mode, `RESEND_DEV_OVERRIDE_TO` para desarrollo
- Componentes: `NotificationBell` (polling 30s + Page Visibility API, badge), `NotificationList` (iconos por tipo, tiempo relativo en español, navegación contextual)
- `app/api/users/me/route.ts` — `GET` (perfil + proyectos), `PATCH` (nombre + especialización, role protegido)
- `app/(dashboard)/dashboard/profile/page.tsx` — avatar (Next.js Image), proyectos, `EditProfileForm`
- `next.config.mjs` — dominios `img.clerk.com` y `lh3.googleusercontent.com` habilitados

### Cobertura de tests

| Archivo | Tests | Estado |
|---------|-------|--------|
| `dates.test.ts` | 8 | ✅ |
| `api-response.test.ts` | 6 | ✅ |
| `auth.test.ts` | 8 | ✅ |
| `sanitize.test.ts` | 8 | ✅ |
| `project.service.test.ts` | 6 | ✅ |
| `daily.service.test.ts` | 7 | ✅ |
| `ai.service.test.ts` (pendiente) | — | ⏳ |
| **Total** | **48/48** | **✅ 0 fallos** |

---

## 4. Coherencia: Definición vs Plan

**Resultado: Alta coherencia global.** Divergencias detectadas en versión 1.0 todas resueltas.

| Divergencia | Resolución |
|-------------|------------|
| Next.js 15 vs 16 | Ambos documentos actualizados a **16+** |
| Sección 5 incompleta ("Seguridad y:") | Completada con 4 estándares |
| CLI sin especificación técnica | Especificado en Fase 6 con auth por API Key |
| RLS mencionado sin decisión | Documentado como descartado: Prisma como superusuario omite RLS |

---

## 5. Gaps críticos identificados y resueltos

### Gap 1 — Sin tests ✅ Resuelto
Vitest + mock global de Prisma + 48 tests cubriendo servicios críticos.

### Gap 2 — CLI ausente del plan ✅ En plan (Fase 6)
`SETUP-06` (API Keys SHA-256) + `BACK-09` (Commander.js + Inquirer). Pendiente de implementar.

### Gap 3 — Zonas horarias ✅ Resuelto
`date-fns-tz` + `toUTCDayStart` + `userTimezone` en DTO. `canUserReport` es timezone-aware.

### Gap 4 — Timeout Vercel Hobby vs Gemini ✅ Resuelto
Patrón 202 Accepted + `after()` de Next.js 16 + polling del cliente cada 2s.

### Gap 5 — Cuota gratuita de Gemini ✅ Resuelto
Abstracción multi-proveedor: `AI_PROVIDER=ollama` para desarrollo local sin cuota. Retry con backoff para errores por minuto. Detección de cuota diaria agotada con mensaje descriptivo.

---

## 6. Viabilidad del plan

### Estado de implementación por fase

| Fase | Estado | Observaciones |
|------|--------|---------------|
| Fase 1 — Cimientos | ✅ **Completa** | Auth, Prisma, helpers, tests, onboarding |
| Fase 2 — Admin | ✅ **Completa** | CRUD proyectos, gestión de miembros, dashboard con cache |
| Fase 3 — Dailies Core | ✅ **Completa** | Feed, formulario, bloqueadores, paginación cursor |
| Fase 4 — IA | ✅ **Completa** | Gemini + Ollama, 202 Accepted, rate limiting, retry |
| Fase 5 — Notificaciones | ✅ **Completa** | Campana, emails, perfil, atomicidad en todas las integraciones |
| Fase 6 — CLI | ⏳ **Pendiente** | API Keys SHA-256 + Commander.js + Inquirer |
| PERF-02 — Deploy Vercel | ⏳ **Pendiente** | Configuración de variables en Vercel, dominio de Clerk |

### Riesgos residuales

| Riesgo | Estado |
|--------|--------|
| Timeout Vercel Hobby vs Gemini | ✅ Resuelto — patrón 202 Accepted |
| Sin tests | ✅ Resuelto — 48/48 pasando |
| CLI sin planificación | ✅ En plan — Fase 6 |
| Zonas horarias inconsistentes | ✅ Resuelto — date-fns-tz |
| Cuota gratuita Gemini | ✅ Resuelto — Ollama como fallback local |
| Dominio de email no verificado | ⚠️ Mitigado — `onboarding@resend.dev` + `RESEND_DEV_OVERRIDE_TO` |

---

## 7. Arquitectura del sistema

### Capas del sistema

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| Edge / Seguridad | `proxy.ts` | Verificar sesión Clerk + rol JWT antes de cualquier handler |
| Auth dual | `lib/helpers/auth.ts` | `getAuthContext` — Clerk web + Bearer API Key (CLI, Fase 6) |
| Transporte HTTP | `app/api/**/route.ts` | Extraer params, auth, Zod, orquestar service, respuesta estandarizada |
| Lógica de negocio | `lib/services/*.service.ts` | Queries Prisma, transacciones, reglas de dominio |
| Validación | `lib/validators/*.schema.ts` | Schemas Zod v4 por dominio |
| AI Provider | `lib/helpers/ai-provider.ts` | Abstracción Gemini/Ollama, retry con backoff |
| Utilidades | `lib/helpers/` | api-response, auth, logger, handle-error, prompts, sanitize, dates, constants |
| Tests | `__tests__/` | Vitest con mock de Prisma, 48 tests |
| UI | `components/` + `app/dashboard/` | RSC para data-fetching, Client Components solo con estado |
| CLI | `cli/` (Fase 6) | Commander.js + Inquirer, auth por API Key |

### Patrón de escritura (mutación con atomicidad)

```
Client Component
  → fetch POST /api/daily-reports
  → route.ts: getAuthContext() → Zod.parse(body)
  → daily.service.create(userId, data)
    → verifica pertenencia al proyecto
    → calcula isBlocker
    → if isBlocker:
        prisma.$transaction([DailyReport + Notification al TL])  ← atómico
        sendBlockerAlertEmail(techLead)                          ← fuera de tx
  → successResponse(result, 201)
```

### Patrón de lectura (Server Components)

```
Server Component (page.tsx)
  → import { dailyService } from '@/lib/services/daily.service'
  → await dailyService.findByProject(projectId)  ← SIN pasar por API Route
  → Renderiza en servidor → zero waterfall de red
```

> **Regla crítica:** Un Server Component NUNCA hace `fetch('/api/...')` a su propia API.

### Patrón AI Summary (202 Accepted + polling)

```
POST /api/ai-summary
  → Verifica auth + rate limit (max 5/día/proyecto)
  → Crea AISummary { status: PENDING }
  → after(() => processInBackground(summaryId))   ← Next.js 16
  → Retorna 202 Accepted + summaryId              ← inmediato

processInBackground():
  → PENDING → PROCESSING
  → sanitizeForAI(reportContent)
  → generateAIContent(prompt)   ← Gemini o Ollama según AI_PROVIDER
  → prisma.$transaction([AISummary COMPLETED + Notification])

Cliente:
  → polling GET /api/ai-summary/status/:id cada 2s
  → Al recibir COMPLETED → renderiza markdown
```

### Decisiones técnicas destacadas

| Decisión | Justificación |
|----------|---------------|
| 202 Accepted para AI Summary | Evita timeout de 10s de Vercel Hobby |
| Abstracción AI_PROVIDER | Ollama en desarrollo (sin cuota), Gemini en producción, sin cambiar código |
| Retry con backoff en Gemini | Distinción cuota/minuto (recuperable) vs cuota/día (no reintentar) |
| API Keys con SHA-256 (Fase 6) | Patrón GitHub PAT: token visible solo al crear |
| `date-fns-tz` para zonas horarias | Ligera, tree-shakeable, ESM nativo |
| Vitest sobre Jest | Compatibilidad nativa ESM/TypeScript, 2-5x más rápido |
| `cuid()` como cursor de paginación | k-sortable, único, sin pagination drift |
| Soft-delete para User/Project | Preserva historial de reportes |
| Email fuera de `prisma.$transaction` | HTTP externo dentro de tx bloquea el pool de Pgbouncer |
| RLS descartado | Prisma conecta como superusuario que omite RLS. Seguridad en middleware + filtros de servicio |

---

## 8. Roadmap completo

| Fase | Tareas clave | Estado |
|------|-------------|--------|
| **Fase 1** — Cimientos + Auth | SETUP-01-06, BACK-01-03, TEST-01-02, AUTH-01-03, FRONT-01-02 | ✅ Completa |
| **Fase 2** — Admin | BACK-04-05, FRONT-03-04 | ✅ Completa |
| **Fase 3** — Dailies Core | BACK-06-08, FRONT-05-06 | ✅ Completa |
| **Fase 4** — IA | AI-01-05 | ✅ Completa |
| **Fase 5** — Notificaciones + Perfil | NOTIF-01-03, PERF-01, FRONT-07 | ✅ Completa |
| **Fase 6** — CLI | SETUP-06 (API Keys), BACK-09 (Commander.js) | ⏳ Pendiente |
| **PERF-02** — Deploy Vercel | Config variables, dominio Clerk, verify build | ⏳ Pendiente |

### Variables de entorno configuradas

| Variable | Servicio | Estado |
|----------|----------|--------|
| `DATABASE_URL` | Supabase (puerto 5432, migraciones) | ✅ |
| `DIRECT_URL` | Supabase Pgbouncer (puerto 6543, runtime) | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | ✅ |
| `CLERK_SECRET_KEY` | Clerk | ✅ |
| `CLERK_WEBHOOK_SECRET` | Clerk | ✅ |
| `AI_PROVIDER` | `ollama` (dev) / `gemini` (prod) | ✅ |
| `GEMINI_API_KEY` | Google AI Studio | ✅ |
| `GEMINI_MODEL` | `gemini-2.0-flash` | ✅ |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | ✅ |
| `OLLAMA_MODEL` | `qwen2.5:7b` | ✅ |
| `RESEND_API_KEY` | Resend | ✅ |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (dev) | ✅ |
| `RESEND_DEV_OVERRIDE_TO` | Email propio para testing | ✅ |
| `ASYNCREPORT_API_URL` | CLI (Fase 6) | ⏳ |

---

*Documento generado por análisis de IA a partir del codebase y los documentos de definición del proyecto.*
*Versión 1.3 — Fases 1-5 completadas. Pendiente: Fase 6 (CLI) y PERF-02 (Deploy Vercel).*
