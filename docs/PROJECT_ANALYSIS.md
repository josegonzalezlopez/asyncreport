# AsyncReport — Análisis Integral del Proyecto

> **Versión:** 1.1 | **Fecha:** 16 Abril 2026 | **Generado por:** Cursor AI

---

## Índice

1. [Visión Global de la App](#1-visión-global-de-la-app)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estado actual del código](#3-estado-actual-del-código)
4. [Coherencia: Definición vs Plan](#4-coherencia-definición-vs-plan)
5. [Gaps críticos identificados y resueltos](#5-gaps-críticos-identificados-y-resueltos)
6. [Viabilidad del plan](#6-viabilidad-del-plan)
7. [Arquitectura del sistema](#7-arquitectura-del-sistema)
8. [Roadmap completo post-correcciones](#8-roadmap-completo-post-correcciones)

---

## 1. Visión Global de la App

**AsyncReport** es un SaaS de dailies asíncronas para equipos de software distribuidos en distintas zonas horarias. Su objetivo es eliminar las standups síncronas reemplazándolas con un portal centralizado de reportes diarios, análisis ejecutivo con IA (Gemini) y un sistema de notificaciones internas y por email.

### Roles

| Rol | Responsabilidades principales |
|-----|-------------------------------|
| **Usuario (Reportador)** | Carga su daily (Ayer / Hoy / Bloqueadores / Mood 1-5), ve el feed del equipo, puede usar CLI para reportar desde la terminal |
| **Tech Lead** | Recibe alertas de bloqueadores, genera AI Summary bajo demanda, ve MoodChart de los últimos 7 días |
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
3. Generar AI Summary → 202 Accepted → polling de status
4. Consultar historial de resúmenes

**Admin:**
1. CRUD de proyectos con estados (ACTIVE / PAUSED / FINISHED / ARCHIVED)
2. Asignación de Tech Leads y miembros
3. Dashboard macro con métricas cacheadas (unstable_cache, revalidación 5 min)

### Integraciones externas

| Servicio | Rol |
|----------|-----|
| Supabase | PostgreSQL hosted + Pgbouncer pooler |
| Clerk | Auth, OAuth Google, sesiones, webhooks |
| Gemini 2.0 Flash | Resúmenes ejecutivos (patrón async) |
| Resend | Emails transaccionales (asignación + bloqueador) |
| Vercel | Deploy serverless (Hobby plan con patrón 202) |
| Svix | Verificación de firma de webhooks Clerk |

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión (lockfile) | Estado |
|------|------------|-------------------|--------|
| Framework | Next.js App Router | **16.1.6** | Activo |
| UI Runtime | React | 19.2.4 | Activo |
| Lenguaje | TypeScript | 5.9.3 | Activo — `strict: true` |
| ORM | Prisma | 7.4.0 | Schema listo, sin uso en rutas |
| Auth | Clerk Next.js | 6.37.4 | Instalado, sin implementar |
| Validación | Zod | 4.3.6 | Instalado, sin implementar |
| IA | @google/generative-ai | latest | Instalado, sin implementar |
| Email | Resend | latest | Instalado, sin implementar |
| Estilos | Tailwind CSS + shadcn/ui | — | Activo |
| Animaciones | Framer Motion | latest | Instalado, **sin uso** |

> **Nota:** Varias dependencias están declaradas como `"latest"` en `package.json`. La reproducibilidad depende del lockfile. Fijar versiones semánticas (ej: `"^16.x"`) es una mejora de mantenibilidad pendiente.

---

## 3. Estado actual del código

### Lo implementado

| Archivo | Estado | Nota |
|---------|--------|------|
| `app/api/health/route.ts` | ✅ Correcto | Único endpoint. Ruta delgada → `getHealth()` en service |
| `lib/services/health.service.ts` | ✅ Correcto | Service pattern establecido |
| `lib/db.ts` | ✅ Correcto | Singleton Prisma con `globalThis` (HMR-safe) |
| `prisma/schema.prisma` | ✅ Completo | Modelos: User, Project, ProjectUser, DailyReport, Notification, AISummary |
| `components/ui/` | ✅ Instalados | shadcn/ui con Radix + CVA |
| `app/page.tsx` | ⚠️ Mejorable | `"use client"` innecesario (sin hooks). Formulario sin lógica real. Links a `#` |

### Deuda técnica detectada

- `"use client"` en `app/page.tsx` sin necesidad — toda la landing puede ser RSC
- Formulario de registro con `type="button"` sin `action` ni `fetch`
- Links de "Iniciar Sesión" apuntando a `#`
- Inputs nativos en la landing en lugar de los componentes `Input`/`Button` de shadcn
- `framer-motion` y otras librerías instaladas sin uso en ningún `.ts`/`.tsx`

---

## 4. Coherencia: Definición vs Plan

**Resultado: Alta coherencia global.** 9 puntos perfectamente alineados y 4 divergencias detectadas, todas resueltas.

### Puntos alineados

| Definición (sección) | Plan (tarea) |
|---------------------|--------------|
| Schema Prisma (sec. 6) | BACK-01 |
| RBAC + Middleware (sec. 8.A) | AUTH-01, AUTH-03 |
| Webhook Clerk sync (sec. 8.A) | AUTH-02 |
| Service Pattern (sec. 5) | BACK-03 |
| Zod en cada API Route (sec. 8.B) | BACK-07 |
| `unstable_cache` dashboard Admin (sec. 9.C) | BACK-05 |
| Sanitización para IA (sec. 8.B) | AI-04 |
| Emails Resend (sec. 4.B) | NOTIF-03 |
| Error handling estandarizado (sec. 9.B) | BACK-07 |

### Divergencias resueltas

| Divergencia | Problema | Resolución |
|-------------|---------|------------|
| Versión Next.js | Docs decían "15", lockfile tenía 16 | Ambos documentos actualizados a **Next.js 16+** |
| Sección 5 incompleta | `"Seguridad y:"` sin terminar | Completada con 4 estándares (SC/API Route, TS strict, testing, UTC) |
| CLI sin especificación | Frase ambigua sin flujo técnico | Especificado con auth por API Key, comandos y plataformas |
| RLS descartado | Definición lo menciona como recomendación | Divergencia **justificada y documentada** en PERF-01: Prisma conecta como superusuario postgres que omite RLS |

---

## 5. Gaps críticos identificados y resueltos

### Gap 1 — Sin tests en el plan original

**Riesgo:** Los servicios de dominio tienen lógica crítica (atomicidad, RBAC, detección de bloqueadores). Sin tests, cada refactor es un riesgo ciego.

**Solución implementada:**
- `[TEST-01]` — Vitest + mock global de Prisma + scripts `test/watch/coverage`
- `[TEST-02]` — Tests obligatorios paralelos a cada tarea BACK-XX

Tests mínimos obligatorios por módulo:

| Archivo de test | Casos críticos |
|----------------|----------------|
| `sanitize.test.ts` | JWT, API keys, connection strings, idempotencia — **100% cobertura** |
| `daily.service.test.ts` | `canUserReport`, `isBlocker`, pertenencia al proyecto |
| `auth.test.ts` | `getAuthContext` con Clerk y con API Key, `requireRole` |
| `project.service.test.ts` | Soft-delete (archive), upsert de assignMember |
| `api-response.test.ts` | Formato `{ data, message }` y `{ error, code, details }` |

---

### Gap 2 — CLI tool ausente del plan

**Riesgo:** Feature documentada en la definición funcional (sec. 4.A) sin ninguna tarea planificada.

**Solución implementada:**
- `[SETUP-06]` — Sistema de API Keys con hash SHA-256 (patrón GitHub PAT: token en claro solo al crear, nunca almacenado)
- `[BACK-09]` — CLI con Commander.js + Inquirer. Comandos: `report` (flujo interactivo), `login` (guarda API Key en `~/.asyncreport/config.json`), `status`
- `getAuthContext` ampliado para soportar autenticación dual: sesión Clerk (web) + Bearer token (CLI)

---

### Gap 3 — Zonas horarias no manejadas

**Riesgo:** Para equipos en distintas zonas horarias, `canUserReport` podría bloquear a un usuario de UTC+9 que reporta a las 23:00 porque en UTC ya es el día siguiente.

**Solución implementada:**
- `[SETUP-05]` — `date-fns-tz` + `lib/helpers/dates.ts`
  - `toUTCDayStart(localDateISO, timezone)` — convierte fecha local a 00:00:00 UTC
  - `isSameLocalDay(utcDate, localDateISO, timezone)` — comparación timezone-aware para `canUserReport`
- `userTimezone` agregado como campo en `createDailySchema` (el cliente envía `Intl.DateTimeFormat().resolvedOptions().timeZone`)
- Tests con casos límite: UTC+9 (antes de medianoche UTC), UTC-5 (después de medianoche UTC), UTC+0

---

### Gap 4 — Timeout de Vercel Hobby (10s) vs Gemini (5-15s)

**Riesgo:** El AI Summary, diferenciador principal del producto, fallaría sistemáticamente en producción en el plan Hobby.

**Solución implementada:**
- `[AI-05]` — Patrón **202 Accepted + polling de status**
  - `POST /api/ai-summary` → crea `AISummary` con `status: PENDING` → retorna 202 + summaryId inmediatamente
  - `waitUntil()` lanza la generación en background sin bloquear el slot HTTP
  - `GET /api/ai-summary/status/:id` retorna el estado (PENDING / PROCESSING / COMPLETED / FAILED)
  - El componente `GenerateSummaryButton` hace polling cada 2s hasta `COMPLETED`
- **Rate limiting**: máximo 5 resúmenes por proyecto por día → `429 Too Many Requests` con mensaje descriptivo
- Schema de Prisma actualizado: enum `AISummaryStatus` + campo `errorMessage?`

---

## 6. Viabilidad del plan

### Estimación de esfuerzo

| Fase | Tareas | Dev con perfil descrito | Dev senior Next.js |
|------|--------|------------------------|-------------------|
| Fase 1 — Cimientos + Tests | 16 | 4-5 semanas | 1.5-2 semanas |
| Fase 2 — Admin | 4 | 2-3 semanas | 1 semana |
| Fase 3 — Dailies Core | 5 | 2-3 semanas | 1-1.5 semanas |
| Fase 4 — IA + Async | 5 | 2 semanas | 1 semana |
| Fase 5 — Notif + Deploy | 5 | 2-3 semanas | 1 semana |
| Fase 6 — CLI | 2 | 1-1.5 semanas | 0.5 semanas |
| **TOTAL** | **~28** | **13-17 semanas** | **6-7 semanas** |

### Fortalezas del plan

- Nivel de detalle excepcional con criterios de aceptación verificables por tarea
- Regla arquitectónica SC vs API Route documentada con tabla de escenarios
- Analogía Angular → Next.js reduce la curva de aprendizaje
- Patrón `prisma.$transaction` con emails fuera de la transacción (correcto y bien justificado)
- Cursor-based pagination con `cuid` k-sortable (evita pagination drift)
- Decisiones técnicas documentadas con justificación (RLS, soft-delete, rol en JWT)

### Riesgos residuales

| Riesgo | Estado |
|--------|--------|
| Timeout Vercel Hobby vs Gemini | ✅ Resuelto — patrón 202 Accepted |
| Sin tests en el plan | ✅ Resuelto — TEST-01 y TEST-02 |
| CLI sin planificación | ✅ Resuelto — Fase 6 completa |
| Zonas horarias inconsistentes | ✅ Resuelto — SETUP-05 con date-fns-tz |
| Fase 1 sobrecargada | ⚠️ Mitigado — recomendación: dividir en 1A (infra) y 1B (auth + base) |
| Curva de aprendizaje App Router | ℹ️ El propio plan lo mitiga con analogías y reglas explícitas |

---

## 7. Arquitectura del sistema

### Capas del sistema

| Capa | Ubicación | Responsabilidad | Analogía Angular |
|------|-----------|-----------------|------------------|
| Edge / Seguridad | `middleware.ts` | Verificar sesión Clerk + rol del JWT antes de cualquier handler | AuthGuard + RoleGuard |
| Auth dual | `lib/helpers/auth.ts` | `getAuthContext` soporta Clerk (web) y Bearer API Key (CLI) | AuthService con estrategias |
| Transporte HTTP | `app/api/**/route.ts` | Extraer params, auth, Zod, orquestar service, respuesta estandarizada | Controlador NestJS |
| Lógica de negocio | `lib/services/*.service.ts` | Queries Prisma, transacciones, reglas de dominio | Injectable Service |
| Validación de contratos | `lib/validators/*.schema.ts` | Schemas Zod por dominio (incluye `userTimezone`) | DTO con class-validator |
| Utilidades | `lib/helpers/` | api-response, auth, logger, handle-error, prompts, sanitize, dates, constants | Pipes / Interceptors |
| Tests | `__tests__/` | Vitest con mock de Prisma. Cobertura en services y helpers críticos | TestBed + Jasmine |
| Acceso a datos | `lib/prisma.ts` | Singleton con `globalThis` (HMR-safe) | Repository / ORM |
| UI | `components/` + `app/dashboard/` | RSC para data-fetching, Client Components solo donde hay estado | Componentes standalone |
| CLI | `cli/` | Commander.js + Inquirer, auth por API Key, detecta timezone del sistema | Angular CLI |

### Patrón de escritura (mutación)

```
Client Component (formulario)
  → fetch POST /api/daily-reports
  → route.ts: getAuthContext() → Zod.parse(body)
  → daily.service.create(userId, projectId, data)
    → verifica pertenencia al proyecto
    → calcula isBlocker
    → if isBlocker: prisma.$transaction([DailyReport, Notification])
    → emailService.sendBlockerAlertEmail() ← FUERA de la transacción
  → successResponse(result, 201)
```

### Patrón de lectura (query en RSC)

```
Server Component (page.tsx)
  → import { dailyService } from '@/lib/services/daily.service'
  → await dailyService.findByProject(projectId)  ← SIN pasar por API Route
  → Renderiza datos en el servidor → zero waterfall de red
```

> **Regla crítica:** Un Server Component NUNCA hace `fetch('/api/...')` a su propia API. Importa el service directamente. Las API Routes son exclusivamente para mutaciones desde Client Components y webhooks externos.

### Patrón AI Summary (202 Accepted)

```
POST /api/ai-summary
  → Verifica auth + rate limit (max 5/día/proyecto)
  → Crea AISummary { status: PENDING }
  → Retorna 202 Accepted + summaryId  ← inmediato, sin esperar Gemini

waitUntil() en background:
  → PENDING → PROCESSING
  → sanitizeForAI(reportContent)
  → Gemini API → resumen en markdown
  → COMPLETED con contenido

Cliente:
  → polling GET /api/ai-summary/status/:id cada 2s
  → Al recibir COMPLETED → renderiza el markdown
```

### Decisiones técnicas destacadas

| Decisión | Justificación |
|----------|---------------|
| 202 Accepted para AI Summary | Evita el timeout de 10s de Vercel Hobby sin upgrade a Pro |
| API Keys con SHA-256 | Patrón GitHub PAT: token solo visible al crear. Hash en DB no permite autenticarse si la DB se compromete |
| `date-fns-tz` para zonas horarias | Ligera, tree-shakeable, compatible con ESM. Alternativa a moment-timezone (10x más pesada) |
| Vitest sobre Jest | Compatibilidad nativa con ESM y TypeScript, 2-5x más rápido en cold start |
| `cuid()` como cursor de paginación | k-sortable y único. Evita pagination drift y colisiones de timestamp |
| Soft-delete para User y Project | Preserva historial de reportes con valor auditorio |
| Rol en JWT de Clerk | El middleware lee el rol sin tocar la DB en cada request — crítico para no saturar el pool de Pgbouncer |
| Email fuera de `prisma.$transaction` | HTTP externo dentro de una transacción bloquea la conexión DB durante el request |
| RLS descartado deliberadamente | Prisma conecta como superusuario postgres que omite RLS. Documentado en PERF-01 |

---

## 8. Roadmap completo post-correcciones

| Fase | Tareas clave | Prerequisito |
|------|-------------|--------------|
| **Fase 1** — Cimientos | SETUP-01/02/03/04/05, BACK-01/02/03, TEST-01/02, AUTH-01/02/03, FRONT-01/02 | — |
| **Fase 2** — Admin | BACK-04/05, FRONT-03/04 | Fase 1 completa |
| **Fase 3** — Dailies Core | BACK-06/07/08, FRONT-05/06 | Fase 2 |
| **Fase 4** — IA | AI-01/02/03/04/05 | Fase 3 |
| **Fase 5** — Notificaciones + Deploy | NOTIF-01/02/03, PERF-01/02, FRONT-07 | Fase 4 |
| **Fase 6** — CLI | SETUP-06, BACK-09 | Fase 3 + Fase 5 (auth dual) |

### Variables de entorno requeridas

| Variable | Servicio |
|----------|----------|
| `DATABASE_URL` | Supabase — conexión directa (puerto 5432, para Prisma CLI) |
| `DIRECT_URL` | Supabase — pooling Pgbouncer (puerto 6543, para runtime) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_SECRET_KEY` | Clerk |
| `CLERK_WEBHOOK_SECRET` | Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Clerk |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Clerk |
| `GEMINI_API_KEY` | Google AI |
| `RESEND_API_KEY` | Resend |
| `RESEND_FROM_EMAIL` | Resend |
| `ASYNCREPORT_API_URL` | CLI (solo en entorno local del desarrollador) |

---

*Documento generado por análisis de IA a partir del codebase y los documentos de definición del proyecto.*
*Para mantenerlo actualizado, regenerarlo al completar cada fase del plan.*
