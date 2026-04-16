# AsyncReport — Plan Maestro de Desarrollo

> **Version:** 1.1 | **Fecha:** Abril 2026 | **Stack:** Next.js 16, Supabase, Prisma, Clerk, Gemini AI, Resend

---

## Indice de Fases

| Fase | Nombre | Tareas | Estado |
|------|--------|--------|--------|
| [Fase 1](#fase-1) | Cimientos y Arquitectura | SETUP-01 a 05, BACK-01 a 03, AUTH-01 a 03, TEST-01 a 02, FRONT-01 a 02 | Pendiente |
| [Fase 2](#fase-2) | Gestion de Proyectos (Admin) | BACK-04 a 05, FRONT-03 a 04 | Pendiente |
| [Fase 3](#fase-3) | Core: Dailies y Reportes | BACK-06 a 08, FRONT-05 a 06 | Pendiente |
| [Fase 4](#fase-4) | Inteligencia Artificial (Tech Lead) | AI-01 a 05 | Pendiente |
| [Fase 5](#fase-5) | UI/UX, Dashboard y Notificaciones | NOTIF-01 a 03, PERF-01 a 02, FRONT-07 | Pendiente |
| [Fase 6](#fase-6) | CLI Tool | SETUP-06, BACK-09 | Pendiente |

---

## Convenciones del Plan

- **[SETUP-XX]** Configuracion de servicios externos e infraestructura
- **[BACK-XX]** Backend: Prisma, API Routes, Services
- **[AUTH-XX]** Autenticacion, autorizacion y RBAC
- **[FRONT-XX]** Componentes React y UI
- **[AI-XX]** Integracion con Gemini API
- **[NOTIF-XX]** Notificaciones internas y emails
- **[PERF-XX]** Optimizacion y performance

> **Analogia Angular a Next.js** (referencia para tu background):
> - El archivo route.ts en app/api es el Controlador: maneja HTTP, extrae params, llama al servicio.
> - Los archivos en lib/services son los Servicios de Angular: contienen logica de negocio y acceso a DB.
> - Los archivos en lib/validators son los DTOs con validacion (Zod en lugar de class-validator).
> - El archivo middleware.ts es el Guard de ruta: equivalente a AuthGuard y RoleGuard combinados.

---

## Regla Arquitectonica Critica — Server Components vs API Routes

Esta regla es la diferencia mas importante respecto a una SPA en Angular y debe respetarse en todo el proyecto sin excepciones.

**El antipatron (NO hacer):** Un Server Component que llama a su propia API Route mediante `fetch('/api/projects')`. Esto hace que el servidor salga por la red para llamarse a si mismo, anadiendo latencia de serializacion/deserializacion JSON y consumiendo slots del pool HTTP de Node innecesariamente. Es el equivalente a que un Servicio de Angular haga un `HttpClient.get()` llamando al mismo backend que lo contiene.

**La regla (hacer):** Los Server Components importan y llaman directamente a los metodos de `lib/services/` para obtener datos. Las API Routes en `app/api/` son exclusivamente para recibir mutaciones (POST, PATCH, DELETE) que vienen de Client Components, o para recibir webhooks de terceros (Clerk, Resend, etc.).

| Escenario | Mecanismo correcto |
|---|---|
| Server Component / page.tsx necesita datos para renderizar | Importar y llamar `await projectService.findAll()` directamente |
| Client Component (formulario) envia datos al servidor | `fetch('POST /api/daily-reports')` a una API Route |
| Webhook de Clerk, Resend u otro tercero | API Route (`app/api/webhooks/...`) |
| Herramienta CLI o integracion externa futura | API Route |

Esta regla tiene un beneficio adicional en el sistema de caching: cuando un Server Component llama al servicio directamente, se puede aplicar `unstable_cache` o la funcion `cache()` de React a nivel de funcion del servicio, lo que es mas granular y eficiente que el cache del `fetch`. Las paginas que renderizan listas de datos (dashboard, feed, historial) siempre deben seguir este patron.

---

<a name="fase-1"></a>
# FASE 1 — Cimientos y Arquitectura

> **Objetivo:** Establecer la base tecnica solida sobre la que se construira toda la aplicacion. Ninguna feature debe comenzarse sin completar esta fase al 100%.

---

### [SETUP-01] Configurar Proyecto en Supabase

**Descripcion:**
Crear y configurar el proyecto en Supabase que actuara como host de PostgreSQL. Supabase provee la base de datos, el pooler de conexiones via Pgbouncer y la posibilidad de activar RLS por tabla. Prisma se conectara directamente a Supabase. El cliente JS de Supabase se reserva para funcionalidades de realtime futuras.

**Implementacion Tecnica:**
1. Crear una cuenta en supabase.com e iniciar un nuevo proyecto llamado "async-report".
2. Seleccionar la region mas cercana geograficamente (ej: South America - Sao Paulo) para minimizar latencia.
3. Generar una contrasena segura para la base de datos y guardarla en un gestor de contrasenas externo, nunca en el repositorio.
4. Esperar el aprovisionamiento completo del proyecto (aprox. 2 minutos).
5. Navegar a Project Settings > Database > Connection String y obtener dos URIs: la de conexion directa en puerto 5432 (para migraciones con Prisma CLI) y la de connection pooling via Pgbouncer en puerto 6543 (para el runtime en Vercel, que es serverless y no soporta conexiones persistentes).
6. Desde Project Settings > API, copiar la Project URL y el anon key publico.
7. En Authentication > Providers, deshabilitar el proveedor Email/Password ya que la autenticacion sera manejada exclusivamente por Clerk.
8. En Database > Extensions, habilitar la extension pgcrypto necesaria para la generacion de UUIDs.
9. Registrar las cuatro variables de entorno resultantes en el archivo .env.local: DATABASE_URL (conexion directa), DIRECT_URL (pooling), NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.

**Importancia:**
Sin la base de datos operativa no es posible generar el schema de Prisma ni ejecutar migraciones. Es el prerequisito absoluto de todo el backend. La distincion entre conexion directa y pooling es critica para evitar errores de conexion en el entorno serverless de Vercel.

**Criterios de Aceptacion:**
- [ ] Proyecto creado en Supabase y en estado "Active".
- [ ] Las dos connection strings (directa y pooling) estan guardadas en .env.local con los nombres correctos.
- [ ] El archivo .env.local esta incluido en .gitignore y no aparece en git status.
- [ ] La extension pgcrypto esta activa (visible en Database > Extensions).
- [ ] La autenticacion nativa de Supabase esta deshabilitada.
- [ ] Ejecutar "npx prisma db pull" desde la terminal no devuelve errores de conexion.

---

### [SETUP-02] Configurar Proyecto en Clerk

**Descripcion:**
Clerk es el proveedor de identidad y autenticacion. Gestionara sesiones, el flujo OAuth con Google y provee un sistema de webhooks para sincronizar usuarios con nuestra base de datos. La sincronizacion es el punto critico: cuando un usuario se registra en Clerk por primera vez, debemos crear su registro en la tabla User de Prisma para poder asignarle roles, proyectos y dailies.

**Implementacion Tecnica:**
1. Crear una cuenta en clerk.com y agregar una nueva aplicacion llamada "AsyncReport".
2. En la pantalla de configuracion inicial, habilitar Google como proveedor OAuth y deshabilitar Email/Password.
3. Configurar Google OAuth: navegar a Google Cloud Console > APIs & Services > Credentials, crear un "OAuth 2.0 Client ID" de tipo Web Application. Agregar en "Authorized redirect URIs" la URI que proporciona el dashboard de Clerk (con formato accounts.[dominio-clerk].com/oauth/callback). Copiar el Client ID y Client Secret de Google al formulario de Clerk.
4. En la seccion API Keys del dashboard de Clerk, copiar NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY hacia .env.local.
5. Configurar las URLs de redireccion en Clerk: Sign-in URL a /sign-in, Sign-up URL a /sign-up, After sign-in URL a /dashboard, After sign-up URL a /onboarding (para el flujo de captura de especializacion del usuario nuevo).
6. En Webhooks > Add Endpoint, crear un endpoint apuntando a la ruta /api/webhooks/clerk del dominio de produccion en Vercel. Para desarrollo local, usar una herramienta de tunel como ngrok o Localtunnel para exponer localhost. Suscribir los eventos user.created, user.updated y user.deleted. Copiar el Signing Secret resultante como CLERK_WEBHOOK_SECRET.
7. En Sessions > Customize session token, agregar un claim personalizado que incluya el campo role del usuario (almacenado en los metadatos publicos de Clerk). Esto permite que el middleware de Next.js lea el rol directamente del JWT sin consultar la base de datos en cada request.
8. Registrar todas las variables en .env.local.

**Importancia:**
Clerk es la fuente de verdad de identidad. Sin el webhook correctamente configurado, los usuarios son "fantasmas": existen en Clerk pero no en la DB, por lo que el sistema RBAC no puede funcionar. La inclusion del rol en el JWT es la optimizacion que evita una query a la DB en cada request protegido.

**Criterios de Aceptacion:**
- [ ] Aplicacion creada en Clerk con Google OAuth activo y Email/Password desactivado.
- [ ] Google Cloud Console configurado con la redirect URI exacta que indica Clerk.
- [ ] Webhook creado con los 3 eventos suscritos (user.created, user.updated, user.deleted).
- [ ] Todas las variables de entorno de Clerk estan en .env.local.
- [ ] El flujo completo de login con Google funciona en localhost:3000 y muestra la pantalla de Clerk.
- [ ] El claim de "role" esta configurado en el session token de Clerk.

---

### [SETUP-03] Configurar Gemini API

**Descripcion:**
Obtener las credenciales de la API de Gemini de Google para la generacion de resumenes ejecutivos de los reportes diarios del equipo. Se usara el modelo gemini-2.0-flash como balance optimo entre capacidad y costo para el plan Hobby de Vercel.

**Implementacion Tecnica:**
1. Navegar a Google AI Studio (aistudio.google.com) e iniciar sesion con la cuenta de Google.
2. En la seccion "Get API key", crear una nueva API key asociada a un proyecto de Google Cloud existente o nuevo.
3. Revisar y documentar los limites del plan gratuito: requests por minuto y tokens por dia. Estos limites deben tenerse en cuenta al disenar el sistema de generacion de resumenes (no se debe llamar a Gemini en cada request, sino bajo demanda del Tech Lead).
4. En Google Cloud Console, verificar que la API "Generative Language API" esta habilitada para el proyecto asociado.
5. Guardar la API key en .env.local como GEMINI_API_KEY.
6. Instalar el paquete oficial: @google/generative-ai.

**Importancia:**
Sin esta configuracion la Fase 4 completa esta bloqueada. Ademas, conocer los limites del plan gratuito desde el inicio es fundamental para disenar la logica de rate limiting de la Fase 4.

**Criterios de Aceptacion:**
- [ ] API key generada y guardada en .env.local.
- [ ] Paquete @google/generative-ai instalado y visible en package.json.
- [ ] Verificacion de conexion exitosa: llamada simple a la API desde un script de prueba devuelve respuesta 200.
- [ ] La API key no esta hardcodeada en ningun archivo del repositorio.
- [ ] Limites del plan documentados en este mismo plan o en un archivo NOTES.md.

---

### [SETUP-04] Configurar Resend para Email

**Descripcion:**
Resend es el servicio de emails transaccionales. Se usara para notificar a los usuarios cuando son asignados a un proyecto y para alertar al Tech Lead sobre bloqueadores criticos.

**Implementacion Tecnica:**
1. Crear una cuenta en resend.com.
2. En la seccion Domains, agregar y verificar un dominio propio agregando los registros DNS necesarios (SPF, DKIM, DMARC) en el proveedor de DNS. Si no se cuenta con dominio propio, el plan gratuito de Resend permite usar el dominio onboarding@resend.dev pero solo para enviar al email verificado en la cuenta (util para desarrollo).
3. En API Keys > Create API Key, crear una key con nombre "async-report-dev" y permisos "Full Access".
4. Guardar la key en .env.local como RESEND_API_KEY.
5. Registrar el email remitente como RESEND_FROM_EMAIL.
6. Instalar el paquete oficial: resend.

**Importancia:**
Las notificaciones por email son un requerimiento funcional del rol de Tech Lead. Sin Resend operativo, la Fase 5 (notificaciones) esta bloqueada.

**Criterios de Aceptacion:**
- [ ] Cuenta creada y dominio verificado (o email de prueba activo para plan gratuito).
- [ ] API Key generada y en .env.local.
- [ ] Paquete resend instalado.
- [ ] Prueba de envio exitosa: email de prueba recibido en la bandeja de entrada.

---

### [SETUP-05] Decisión Arquitectónica de Zonas Horarias

**Descripcion:**
AsyncReport está diseñado para equipos distribuidos en distintas zonas horarias. El campo `reportDate` de `DailyReport` y la lógica de `canUserReport` (que verifica si un usuario ya reportó hoy) deben comportarse de forma predecible y consistente independientemente de la ubicación geográfica del usuario. Esta tarea documenta la decisión e implementa las utilidades necesarias.

**Decision arquitectonica:**
- **Almacenamiento:** Todos los campos de fecha/hora se guardan en UTC en PostgreSQL. Prisma los expone como objetos `Date` de JavaScript, que internamente siempre son UTC.
- **Campo `reportDate`:** Se almacena como `DateTime` en UTC correspondiente al inicio del día (00:00:00 UTC) del día en que el usuario reporta. No se usa la hora del servidor; se usa la fecha que el **cliente** envía como contexto (el usuario en Tokyo que reporta a las 23:00 UTC+9 está reportando el "día siguiente" en UTC, pero el "día actual" en su zona horaria — el cliente debe enviar la fecha local, no UTC).
- **Display en UI:** Los componentes React formatean las fechas usando `Intl.DateTimeFormat` con la zona horaria del navegador del usuario. Nunca se muestran fechas UTC sin convertir.
- **Regla `canUserReport`:** Compara `reportDate` por igualdad de año/mes/día **en la zona horaria del cliente**, recibida como parámetro `userTimezone` (string IANA, ej: `"America/Argentina/Buenos_Aires"`).

**Implementacion Tecnica:**
1. Instalar `date-fns-tz` (ligera, tree-shakeable, sin dependencias): `npm install date-fns-tz`.
2. Crear `lib/helpers/dates.ts` con las siguientes funciones:
   - `toUTCDayStart(localDateISO: string, timezone: string): Date` — convierte una fecha local (ej: "2026-04-16") a las 00:00:00 UTC correspondientes a ese día en la timezone dada. Se usa para calcular el `reportDate` antes de insertar en DB.
   - `isSameLocalDay(utcDate: Date, localDateISO: string, timezone: string): boolean` — verifica si una fecha UTC corresponde a un día local específico en una timezone. Se usa en `canUserReport`.
   - `formatLocalDate(utcDate: Date, timezone: string, formatStr: string): string` — wrapper de `date-fns-tz/format` para uso en Server Components que necesiten pre-formatear fechas antes de enviarlas al cliente.
3. Actualizar `daily.service.ts` (cuando se implemente en BACK-06):
   - El método `create()` recibe `userTimezone` en el DTO junto con los otros campos del reporte.
   - Usa `toUTCDayStart` para calcular el `reportDate` a persistir.
   - El método `canUserReport` usa `isSameLocalDay` en lugar de comparar timestamps directamente.
4. Actualizar `createDailySchema` (Zod) para incluir `userTimezone: z.string().min(1)` (el cliente lo envía automáticamente via `Intl.DateTimeFormat().resolvedOptions().timeZone`).
5. Agregar `userTimezone` al `DailyReport` en el schema de Prisma como campo opcional (`String?`) para preservar auditoría de en qué zona horaria se generó cada reporte.

**Importancia:**
Sin esta decisión, `canUserReport` puede retornar resultados incorrectos para usuarios fuera de UTC: un usuario en UTC-5 podría ser bloqueado de reportar a las 22:00 de su día porque en el servidor (UTC) ya es el día siguiente. O peor, podría reportar dos veces si la medianoche UTC cae en medio de su jornada.

**Criterios de Aceptacion:**
- [ ] `date-fns-tz` instalado y visible en `package.json`.
- [ ] `lib/helpers/dates.ts` creado con las tres funciones exportadas y tipadas.
- [ ] Tests unitarios en `dates.test.ts` cubren: usuario en UTC+9 que reporta antes de medianoche UTC, usuario en UTC-5 que reporta después de medianoche UTC, y caso de igualdad en UTC+0.
- [ ] La decisión arquitectónica está documentada en este plan (esta tarea cumple ese requisito).
- [ ] `createDailySchema` incluye el campo `userTimezone`.

---

### [BACK-01] Disenar e Implementar el Schema de Prisma

**Descripcion:**
Definir el modelo completo de la base de datos en prisma/schema.prisma. Este schema es el contrato de datos de toda la aplicacion y debe soportar RBAC, relaciones many-to-many entre usuarios y proyectos, y los modelos para dailies, notificaciones y resumenes de IA.

**Implementacion Tecnica:**
1. Configurar el datasource en schema.prisma apuntando a las variables DATABASE_URL y DIRECT_URL de Supabase, usando el provider postgresql.
2. Definir los siguientes Enums:
   - UserRole: ADMIN, TECH_LEAD, USER.
   - Specialization: DEVELOPER, DESIGNER, ANALYST, QA, DEVOPS, PRODUCT_MANAGER, OTHER.
   - ProjectStatus: ACTIVE, PAUSED, FINISHED, ARCHIVED.
   - ProjectUserRole: TECH_LEAD, MEMBER (rol del usuario dentro de un proyecto especifico, independiente del rol global).
   - NotificationType: ASSIGNMENT, BLOCKER_ALERT, SYSTEM, AI_SUMMARY_READY.
3. Definir los siguientes modelos con sus relaciones:
   - User: campos id (cuid), clerkId (unique, para el lookup por webhook), email (unique), name, avatarUrl, role (UserRole), specialization (Specialization), timestamps. Relaciones: projects (ProjectUser[]), dailyReports, notifications, aiSummaries. Indices en clerkId y email.
   - Project: campos id (cuid), name, description, status (ProjectStatus), timestamps. Relaciones: members (ProjectUser[]), dailyReports, aiSummaries.
   - ProjectUser: tabla pivot M-M entre User y Project. Campos: id, userId, projectId, role (ProjectUserRole), joinedAt. Constraint unique compuesto en (userId, projectId). Indices en projectId y userId.
   - DailyReport: campos id (cuid), userId, projectId, yesterday (Text), today (Text), blockers (Text, opcional), mood (Int 1-5), reportDate, isBlocker (Boolean, calculado segun si blockers tiene contenido), timestamps. Indices compuestos en (projectId, reportDate), (userId, reportDate) y en isBlocker.
   - Notification: campos id (cuid), userId, type (NotificationType), title, message (Text), isRead (Boolean default false), metadata (Json opcional), createdAt. Indice en (userId, isRead).
   - AISummary: campos id (cuid), projectId, generatedBy (userId del TL), summaryDate, content (Text), promptUsed (Text opcional, para auditoria), tokenCount (Int opcional), createdAt. Relaciones con Project y User.
4. Usar onDelete: Cascade en las relaciones hija para garantizar integridad referencial.
5. Ejecutar "npx prisma generate" para generar el cliente tipado.
6. Ejecutar "npx prisma migrate dev --name init" para crear y aplicar la migracion inicial en Supabase.

**Importancia:**
El schema es el cimiento de toda la aplicacion. Un diseno deficiente genera deuda tecnica masiva. Los indices definidos son criticos para la performance de las queries del dashboard y del historial de reportes, que seran las mas frecuentes del sistema.

**Criterios de Aceptacion:**
- [ ] prisma/schema.prisma creado con los 5 modelos, los 5 enums y todas las relaciones.
- [ ] "npx prisma generate" ejecuta sin errores.
- [ ] "npx prisma migrate dev --name init" crea la migracion y aplica los cambios en Supabase sin errores.
- [ ] Las 5 tablas son visibles en el Table Editor de Supabase.
- [ ] Los indices compuestos estan aplicados (verificable en Supabase > Database > Indexes).
- [ ] "npx prisma studio" levanta y muestra los 5 modelos correctamente en el navegador.

---

### [BACK-02] Configurar Cliente Prisma con Patron Singleton

**Descripcion:**
En Next.js con hot-reload en desarrollo, los modulos se re-instancian en cada cambio de archivo, lo que genera multiples instancias del PrismaClient y satura el pool de conexiones de Supabase. El patron Singleton previene este problema almacenando la instancia unica en el objeto global de Node.js.

**Implementacion Tecnica:**
1. Crear el archivo lib/prisma.ts.
2. Implementar el patron Singleton: verificar si ya existe una instancia de PrismaClient en el objeto global de Node.js (globalThis). Si existe, reutilizarla. Si no, crearla y asignarla al global solo en entornos de desarrollo.
3. Configurar el nivel de logging del cliente: en desarrollo activar los logs de query, error y warn para depuracion. En produccion, solo activar logs de error.
4. Exportar la instancia unica como "prisma" para ser importada desde todos los servicios.

**Importancia:**
Sin este Singleton, en desarrollo cada guardado de archivo crea una nueva conexion a la DB. Pgbouncer de Supabase tiene un limite de conexiones concurrentes; superarlo provoca errores intermitentes y dificiles de diagnosticar.

**Criterios de Aceptacion:**
- [ ] Archivo lib/prisma.ts creado.
- [ ] Todos los servicios importan el cliente desde lib/prisma.ts (no instancian PrismaClient directamente).
- [ ] Durante el desarrollo con hot-reload activo, los logs de Supabase no muestran una explosion de conexiones nuevas.

---

### [BACK-03] Establecer la Estructura de Carpetas y Helpers Base

**Descripcion:**
Establecer la arquitectura de carpetas que separa responsabilidades. Esta estructura replica el patron Modulo > Controlador > Servicio de Angular/NestJS, adaptado al App Router de Next.js. Ademas se crean los helpers transversales que todos los modulos usaran.

**Implementacion Tecnica:**

Crear la siguiente estructura de directorios:
- lib/services/ (logica de negocio, un archivo por entidad: user.service.ts, project.service.ts, etc.)
- lib/validators/ (schemas Zod, un archivo por entidad: project.schema.ts, daily.schema.ts, etc.)
- lib/helpers/ (utilidades transversales: api-response.ts, auth.ts, logger.ts)
- lib/types/ (interfaces y tipos compartidos entre frontend y backend: index.ts)
- app/api/users/ (route.ts y [id]/route.ts)
- app/api/projects/ (route.ts, [id]/route.ts, [id]/members/route.ts)
- app/api/daily-reports/ (route.ts, [id]/route.ts)
- app/api/ai-summary/ (route.ts)
- app/api/notifications/ (route.ts)
- app/api/webhooks/clerk/ (route.ts)

Crear lib/helpers/api-response.ts: helper que estandariza TODAS las respuestas HTTP del sistema. Debe exportar dos funciones: successResponse (recibe data, mensaje opcional y status code, devuelve NextResponse con formato { data, message }) y errorResponse (recibe mensaje de error, codigo y detalles opcionales, devuelve NextResponse con formato { error, code, details }).

Crear lib/helpers/logger.ts: servicio de logging estructurado. Debe exportar un objeto con tres metodos (info, warn, error) que impriman JSON estructurado con nivel, mensaje, metadata adicional y timestamp ISO. Esto facilita la observabilidad en los logs de Vercel.

Crear lib/helpers/auth.ts: helper de autorizacion reutilizable (ver tarea AUTH-03).

Crear lib/types/index.ts: re-exportar los tipos de enums generados por Prisma (UserRole, Specialization, ProjectStatus, ProjectUserRole, NotificationType) y definir interfaces compartidas como ApiUser (forma del usuario expuesta por la API, sin campos sensibles) y AuthContext (userId de Clerk, dbUserId interno y role).

Actualizar tsconfig.json para confirmar que "strict": true esta habilitado.

**Importancia:**
Analogia Angular: api-response.ts es el equivalente al HttpInterceptor que estandariza respuestas. logger.ts es el LoggingService. Sin esta base, cada archivo de ruta implementa su propia logica de respuesta, generando inconsistencias que complican el frontend y el debugging.

**Criterios de Aceptacion:**
- [ ] Todos los directorios listados existen en el proyecto.
- [ ] lib/helpers/api-response.ts exporta successResponse y errorResponse correctamente tipadas.
- [ ] lib/helpers/logger.ts exporta info, warn y error con salida JSON estructurada.
- [ ] lib/types/index.ts exporta todos los enums de Prisma y las interfaces ApiUser y AuthContext.
- [ ] tsconfig.json tiene "strict": true habilitado.
- [ ] El proyecto compila sin errores de TypeScript tras estos cambios.

---

### [TEST-01] Configurar Infraestructura de Testing con Vitest

**Descripcion:**
Establecer la infraestructura de testing unitario e integración antes de escribir lógica de negocio compleja. El testing se introduce en la Fase 1 como cimiento, no como tarea de cierre, porque los servicios de dominio, helpers de seguridad y validadores Zod que se construyen en las fases siguientes necesitan cobertura desde el primer commit.

**Analogia Angular:** Equivale a configurar `TestBed` y `jasmine`/`jest` en un proyecto Angular antes de escribir los primeros servicios. En Next.js el ecosistema recomendado es Vitest (compatible con módulos ESM nativos, más rápido que Jest para TypeScript).

**Implementacion Tecnica:**
1. Instalar dependencias de testing: `npm install -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/user-event`.
2. Crear `vitest.config.ts` en la raíz del proyecto:
   ```ts
   import { defineConfig } from 'vitest/config';
   import path from 'path';
   export default defineConfig({
     test: {
       environment: 'happy-dom',
       globals: true,
       setupFiles: ['./vitest.setup.ts'],
       alias: { '@': path.resolve(__dirname, './') },
     },
   });
   ```
3. Crear `vitest.setup.ts` con la configuración base de mocks globales (mock de `prisma` para aislar tests de la DB real).
4. Crear `__tests__/` como directorio raíz para tests de servicios y helpers. Los tests de componentes React viven junto al componente en archivos `*.test.tsx`.
5. Agregar scripts en `package.json`:
   - `"test": "vitest run"` — ejecuta todos los tests una vez (para CI).
   - `"test:watch": "vitest"` — modo watch para desarrollo.
   - `"test:ui": "vitest --ui"` — interfaz visual de Vitest.
   - `"test:coverage": "vitest run --coverage"` — reporte de cobertura.
6. Crear el mock del cliente Prisma en `__tests__/mocks/prisma.mock.ts` usando `vi.mock` de Vitest. Este mock reemplaza todas las operaciones de DB con funciones spy, permitiendo testear los servicios sin necesitar una DB real.
7. Crear `__tests__/helpers/dates.test.ts` como primer test del proyecto (verifica la utilidad de zonas horarias de SETUP-05). Este test actúa como validación de que la infraestructura de testing funciona correctamente.

**Importancia:**
Sin testing, cada cambio en un service es un riesgo ciego. Los servicios de dominio (`daily.service`, `notification.service`) tienen lógica de negocio crítica (atomicidad de transacciones, detección de bloqueadores, pertenencia a proyecto) que es imposible de verificar manualmente a escala. Configurar el entorno ahora, antes de escribir esa lógica, tiene coste mínimo y beneficio máximo.

**Criterios de Aceptacion:**
- [ ] `vitest.config.ts` creado y los scripts de test están en `package.json`.
- [ ] `npm test` ejecuta sin errores (aunque sea con 0 tests al inicio).
- [ ] El mock de Prisma en `__tests__/mocks/prisma.mock.ts` está funcional.
- [ ] `__tests__/helpers/dates.test.ts` pasa correctamente (mínimo 3 casos: UTC+9, UTC-5, UTC+0).
- [ ] `npm run test:coverage` genera el reporte de cobertura en `coverage/`.

---

### [TEST-02] Tests Unitarios de Servicios y Helpers Críticos de Seguridad

**Descripcion:**
Escribir los tests unitarios para los servicios y helpers más críticos del sistema. Esta tarea se ejecuta **en paralelo con cada tarea BACK-XX y AUTH-XX**: cada vez que se crea un servicio nuevo, sus tests se escriben en la misma sesión de trabajo, no al final del proyecto.

**Convención:** Para cada archivo `lib/services/X.service.ts` o `lib/helpers/X.ts` creado, debe existir un `__tests__/services/X.service.test.ts` o `__tests__/helpers/X.test.ts` con cobertura de los casos críticos.

**Tests obligatorios por módulo:**

`__tests__/helpers/auth.test.ts` (cubre AUTH-03):
- `getAuthContext` retorna `null` si no hay `userId` de Clerk.
- `getAuthContext` retorna `null` si el `clerkId` no existe en la DB.
- `requireRole` retorna `true` con rol exacto, `true` con múltiples roles válidos, `false` con rol incorrecto.

`__tests__/helpers/sanitize.test.ts` (cubre AI-04):
- JWT (`eyJh...`) es redactado correctamente.
- Patrón `password=secreto123` es redactado.
- `postgresql://user:pass@host/db` es redactado.
- Texto normal sin datos sensibles no es alterado.
- La función es idempotente (aplicar dos veces produce el mismo resultado).

`__tests__/services/daily.service.test.ts` (cubre BACK-06):
- `canUserReport` retorna `false` si ya existe un reporte para ese userId/projectId/fecha.
- `create` lanza error de autorización si el usuario no pertenece al proyecto.
- `create` calcula `isBlocker = true` cuando `blockers` tiene contenido.
- `create` calcula `isBlocker = false` cuando `blockers` es vacío o solo espacios.

`__tests__/services/project.service.test.ts` (cubre BACK-04):
- `archive` actualiza el status a `ARCHIVED` sin eliminar el registro.
- `assignMember` hace upsert correctamente (no duplica si el usuario ya pertenece).

`__tests__/helpers/api-response.test.ts` (cubre BACK-03):
- `successResponse` retorna el formato `{ data, message }` correcto con el status code indicado.
- `errorResponse` retorna el formato `{ error, code, details }` correcto.

**Importancia:**
Los tests de `sanitize.ts` son los de mayor criticidad ética y de seguridad: garantizan que datos sensibles del equipo no se filtren a la API de Gemini. Los tests de `daily.service` cubren la regla de atomicidad y la verificación de pertenencia al proyecto, que son los dos puntos de mayor riesgo de la feature core. Sin estos tests, un refactor inocente podría romper silenciosamente la seguridad.

**Criterios de Aceptacion:**
- [ ] Los 5 archivos de test existen y pasan con `npm test`.
- [ ] La cobertura de líneas en `lib/helpers/sanitize.ts` es del 100%.
- [ ] La cobertura de ramas en `lib/services/daily.service.ts` es mayor al 80%.
- [ ] Ningún test usa la conexión real a la DB (todos usan el mock de Prisma de TEST-01).
- [ ] Los tests se ejecutan en menos de 5 segundos en total.

---

### [AUTH-01] Implementar Middleware de Next.js con RBAC

**Descripcion:**
El middleware de Next.js es el equivalente al AuthGuard combinado con el RoleGuard de Angular. Se ejecuta en el Edge Runtime antes de que cualquier request llegue a una pagina o API Route. Su responsabilidad es: verificar que existe sesion activa de Clerk y, para rutas protegidas por rol, verificar que el usuario tiene el rol requerido leyendo el JWT.

**Implementacion Tecnica:**
1. Crear el archivo middleware.ts en la raiz del proyecto.
2. Importar clerkMiddleware y createRouteMatcher desde @clerk/nextjs/server.
3. Definir tres matchers de rutas:
   - Rutas publicas: landing (/), /sign-in, /sign-up y /api/webhooks/*. Estas pasan sin ninguna verificacion.
   - Rutas de Admin: /dashboard/admin/* y /api/projects/*. Solo accesibles con role ADMIN.
   - Rutas de Tech Lead: /dashboard/team/* y /api/ai-summary/*. Accesibles con role TECH_LEAD o ADMIN.
4. Dentro del handler de clerkMiddleware: si la ruta es publica, continuar. Si no hay userId en el contexto de Clerk, redirigir a /sign-in preservando la URL de retorno. Si la ruta es de Admin y el rol del JWT no es ADMIN, retornar 403. Si la ruta es de Tech Lead y el rol no es TECH_LEAD ni ADMIN, retornar 403.
5. Configurar el campo "config" con el matcher correcto para que el middleware se ejecute en todas las rutas excepto archivos estaticos y el directorio _next.
6. Nota de seguridad: en el dashboard de Clerk, en Sessions > Customize session token, asegurarse de incluir el campo publicMetadata (que contiene el role) dentro de los claims del JWT. Sin esto, sessionClaims.metadata.role sera undefined y todas las verificaciones de rol fallaran.

**Importancia:**
Es la primera linea de defensa de seguridad. Sin middleware, cualquier usuario autenticado podria acceder a endpoints de administracion. Es mas eficiente que verificar roles en cada API Route individualmente porque opera antes de que el request llegue al handler.

**Criterios de Aceptacion:**
- [ ] middleware.ts creado en la raiz del proyecto.
- [ ] Acceder a /dashboard sin sesion activa redirige a /sign-in.
- [ ] Las rutas /api/webhooks/clerk son accesibles sin autenticacion (verificable con curl).
- [ ] Un usuario con role USER recibe respuesta 403 al intentar acceder a /api/projects.
- [ ] Un usuario con role TECH_LEAD puede acceder a /api/ai-summary pero recibe 403 en /api/projects.
- [ ] El claim de rol esta correctamente configurado en el session token de Clerk.

---

### [AUTH-02] Implementar Webhook de Clerk para Sincronizacion de Usuarios

**Descripcion:**
El webhook de Clerk es el puente entre el sistema de identidad externo (Clerk) y nuestra base de datos. Cuando un usuario se registra o actualiza su perfil en Clerk, este webhook crea o actualiza el registro correspondiente en la tabla User de Prisma. Sin este mecanismo, los usuarios autenticados no tienen representacion en nuestra DB y el sistema no puede asignarles proyectos ni roles.

**Implementacion Tecnica:**
1. Instalar la libreria svix para verificar la firma de los webhooks de Clerk.
2. Crear el endpoint POST en app/api/webhooks/clerk/route.ts.
3. En el handler: extraer los headers de svix (svix-id, svix-timestamp, svix-signature). Si alguno falta, retornar 400. Instanciar el verificador Svix con el CLERK_WEBHOOK_SECRET del entorno. Llamar a wh.verify() con el body del request y los headers. Si la verificacion falla (firma invalida), retornar 400 y loguear el error.
4. Una vez verificado el evento, usar un switch por tipo de evento:
   - user.created: llamar a userService.syncFromClerk(data). Este metodo debe hacer un upsert en la tabla User usando el clerkId como clave, extrayendo el email primario de la lista de email_addresses, el nombre completo y el avatarUrl. El rol inicial es siempre USER y la especializacion DEVELOPER (el usuario la puede cambiar en onboarding).
   - user.updated: reutilizar la misma logica de syncFromClerk (el upsert actualiza los datos si el registro ya existe).
   - user.deleted: en lugar de borrar el registro (lo que cascadearia y eliminaria todos los reportes del usuario), marcar el clerkId con un prefijo DELETED_ para que no pueda autenticarse, pero conservar el historial.
5. Crear lib/services/user.service.ts con los metodos: syncFromClerk, updateFromClerk, softDeleteByClerkId, findByClerkId y findAll.

**Importancia:**
Sin este webhook los usuarios son "fantasmas". La estrategia de soft-delete (en lugar de eliminacion en cascada) es una decision deliberada de arquitectura para preservar el historial de reportes, que tiene valor auditorio.

**Criterios de Aceptacion:**
- [ ] Endpoint POST /api/webhooks/clerk implementado con verificacion de firma Svix.
- [ ] user.service.ts creado con todos los metodos requeridos.
- [ ] Al registrar un usuario nuevo con Google en desarrollo, se crea automaticamente el registro en la tabla User de Prisma (verificar en Prisma Studio).
- [ ] El evento user.deleted no borra fisicamente el registro sino que aplica el soft-delete.
- [ ] Los logs estructurados son visibles en consola para cada evento recibido.
- [ ] El endpoint devuelve 400 si los headers de Svix estan ausentes o la firma es invalida.

---

### [AUTH-03] Crear Helper Reutilizable de Autorizacion

**Descripcion:**
Necesitamos una funcion reutilizable que encapsule el patron de autorizacion comun en todas las API Routes: obtener el userId de Clerk, buscar el usuario en la DB, y retornar el contexto de autorizacion completo (incluyendo el role y el dbUserId). Esto es el equivalente a inyectar el AuthService en el constructor de un componente/servicio de Angular.

**Implementacion Tecnica:**
1. Crear lib/helpers/auth.ts.
2. Implementar la funcion asincrona getAuthContext(): llama a auth() de Clerk para obtener el userId. Si no hay userId, retorna null. Llama a userService.findByClerkId(userId). Si no encuentra al usuario en la DB, retorna null. Retorna un objeto AuthContext con { userId (clerkId), dbUserId (id interno), role }.
3. Implementar la funcion requireRole(context, ...roles): funcion pura que recibe el AuthContext y una lista de roles validos. Retorna true si el rol del contexto esta en la lista, false en caso contrario o si el contexto es null.
4. El patron de uso en cada API Route sera: obtener contexto con getAuthContext, retornar 401 si es null, llamar a requireRole y retornar 403 si falla. Solo entonces proceder con la logica del servicio.

**Importancia:**
Elimina codigo duplicado de autorizacion en cada API Route. Si en el futuro se cambia la logica de autorizacion (ej: agregar autenticacion por API Key para CLI), solo hay que modificar este archivo.

**Criterios de Aceptacion:**
- [ ] lib/helpers/auth.ts creado con las dos funciones exportadas.
- [ ] getAuthContext retorna null si no hay sesion activa de Clerk.
- [ ] getAuthContext retorna null si el clerkId no existe en la DB (usuario no sincronizado).
- [ ] requireRole funciona correctamente con multiples roles permitidos.
- [ ] El patron se aplica consistentemente en todas las API Routes del proyecto.

---

### [FRONT-01] Configurar shadcn/ui y Sistema de Diseno Base

**Descripcion:**
Establecer el sistema de componentes y el tema visual de AsyncReport. Al ser una herramienta para equipos de desarrollo, el diseno debe ser oscuro, moderno y profesional, con una paleta de azules/indigos sobre fondo casi negro. Definir el tema en esta fase evita refactors de UI costosos en fases posteriores.

**Implementacion Tecnica:**
1. Verificar que shadcn/ui esta inicializado (el archivo components.json ya existe en el proyecto).
2. Instalar los componentes base necesarios para toda la aplicacion usando el CLI de shadcn: Button, Card, Badge, Avatar, DropdownMenu, Dialog, Sheet, Form, Input, Label, Textarea, Select, Table, Pagination, Sonner (toasts), Separator, Skeleton y Chart.
3. Actualizar app/globals.css para definir la paleta de colores del tema oscuro usando variables CSS HSL de Tailwind. La paleta objetivo: fondo casi negro (224 71% 4%), foreground claro (213 31% 91%), primary en azul brillante (210 100% 66%), bordes sutiles en azul oscuro (216 34% 17%). Todos los componentes de shadcn heredaran este tema automaticamente.
4. Verificar que tailwind.config.ts incluye en su campo "content" los paths de app/, components/ y lib/ para que Tailwind procese todas las clases CSS.
5. Instalar lucide-react si no esta presente (iconos usados en toda la aplicacion).

**Importancia:**
Definir el sistema de diseno en la Fase 1 garantiza consistencia visual en toda la aplicacion. Es mas costoso cambiar el tema despues de haber construido 30 componentes que antes.

**Criterios de Aceptacion:**
- [ ] Todos los componentes de shadcn listados estan instalados y visibles en components/ui/.
- [ ] El tema oscuro se aplica correctamente en localhost:3000 (fondo negro, texto claro).
- [ ] globals.css tiene las variables CSS del tema definidas.
- [ ] tailwind.config.ts tiene los paths de contenido correctos.
- [ ] lucide-react esta en package.json.

---

### [FRONT-02] Crear Landing Page

**Descripcion:**
La landing page es la primera impresion del producto para usuarios no autenticados. Debe comunicar en segundos el valor de AsyncReport y convertir visitantes en registros. El diseno debe ser moderno, con animaciones sutiles y completamente responsive.

**Implementacion Tecnica:**
1. Crear o actualizar app/page.tsx con las siguientes secciones ordenadas:
   - Seccion Hero: headline principal impactante (ej: "Elimina las standups. Mantiene el contexto."), subheadline explicando el valor para equipos distribuidos, y un CTA primario que dirija a /sign-up. Usar un gradiente de fondo o patron de grid sutil como backdrop.
   - Seccion Features: 4 tarjetas con iconos de lucide-react describiendo: Dailies Asincronas, Resumen con IA, Gestion de Proyectos Multi-rol y Dashboard de Metricas.
   - Seccion How it Works: pasos numerados del flujo completo: 1. Registro y onboarding, 2. El Admin crea el proyecto, 3. El equipo carga sus dailies, 4. El Tech Lead obtiene el resumen de IA.
   - CTA Final: banner con fondo de acento y boton de registro.
   - Footer minimalista: nombre del producto, ano y links secundarios.
2. Todos los componentes deben ser Server Components (no necesitan estado del cliente).
3. Usar el componente Image de Next.js para cualquier imagen o avatar de ejemplo.

**Criterios de Aceptacion:**
- [ ] La landing page es visible en / sin autenticacion.
- [ ] Responsive correcto en 375px (mobile), 768px (tablet) y 1280px (desktop).
- [ ] El CTA redirige a /sign-up de Clerk.
- [ ] No hay errores en consola del navegador.
- [ ] El Lighthouse Performance Score en desktop es mayor a 90.
- [ ] No se usan Server Actions ni use client innecesarios en esta pagina.

---

<a name="fase-2"></a>
# FASE 2 — Gestion de Proyectos (Admin)

> **Objetivo:** Construir el modulo de gestion de proyectos exclusivo para el rol ADMIN. Incluye CRUD completo, asignacion de miembros y Tech Leads, y el dashboard macro de seguimiento con metricas cacheadas.

---

### [BACK-04] Servicio y API de Proyectos (CRUD Completo)

**Descripcion:**
Implementar la capa de servicio y los endpoints REST para la gestion de proyectos. Siguiendo el patron de servicios: el archivo route.ts solo extrae datos del request, valida con Zod y llama al servicio. El servicio contiene toda la logica de negocio y las queries de Prisma. Analogia Angular: route.ts es el Controlador, project.service.ts es el Servicio inyectable.

**Implementacion Tecnica:**

Crear lib/validators/project.schema.ts con los schemas Zod:
- createProjectSchema: name (string, min 3, max 100 chars), description (string, max 500, opcional).
- updateProjectSchema: todos los campos opcionales, incluyendo status (enum ProjectStatus).
- assignMemberSchema: userId (string), role (enum ProjectUserRole).
- Exportar los tipos inferidos como CreateProjectDto, UpdateProjectDto y AssignMemberDto.

Crear lib/services/project.service.ts con los siguientes metodos:
- create(data: CreateProjectDto): inserta un nuevo proyecto.
- findAll(): lista todos los proyectos incluyendo conteo de miembros y reportes del dia (usando _count de Prisma).
- findById(id): busca un proyecto por id incluyendo la lista de miembros con datos basicos del usuario (nombre, email, avatarUrl, specialization). Retorna null si no existe.
- update(id, data: UpdateProjectDto): actualiza los campos del proyecto.
- archive(id): en lugar de eliminar fisicamente, actualiza el status a ARCHIVED (soft delete).
- assignMember(projectId, userId, role): upsert en la tabla ProjectUser. Si el usuario ya pertenece al proyecto, actualiza su rol.
- removeMember(projectId, userId): elimina la relacion ProjectUser.
- findProjectsForUser(userId): lista los proyectos a los que pertenece un usuario especifico (para el dashboard del usuario).

Crear los endpoints API:
- app/api/projects/route.ts: GET (lista todos los proyectos, solo ADMIN) y POST (crea un proyecto, solo ADMIN). Validar el body del POST con createProjectSchema antes de llamar al servicio.
- app/api/projects/[id]/route.ts: GET (detalle del proyecto con miembros), PATCH (actualizar, solo ADMIN) y DELETE (archivar, solo ADMIN). Validar existencia del proyecto antes de operar (si findById retorna null, responder 404).
- app/api/projects/[id]/members/route.ts: POST (asignar miembro/TL) y DELETE (remover miembro). Ambos solo ADMIN.

En cada endpoint: usar getAuthContext, verificar rol con requireRole, validar el body con Zod (retornar 400 si falla), llamar al servicio, retornar con successResponse o errorResponse.

**Importancia:**
Los proyectos son la unidad organizativa central de AsyncReport. Sin este modulo, no hay contexto donde cargar dailies ni generar resumenes de IA. La decision de usar soft-delete (archivar en lugar de borrar) preserva el historial de reportes del equipo.

**Criterios de Aceptacion:**
- [ ] POST /api/projects crea un proyecto y retorna 201 (solo ADMIN).
- [ ] GET /api/projects retorna la lista con conteo de miembros y reportes.
- [ ] PATCH /api/projects/:id actualiza correctamente nombre, descripcion o status.
- [ ] DELETE /api/projects/:id archiva el proyecto (status = ARCHIVED, no elimina el registro).
- [ ] POST /api/projects/:id/members asigna un usuario con su rol al proyecto.
- [ ] DELETE /api/projects/:id/members desvincula al usuario del proyecto.
- [ ] Un usuario con role USER recibe 403 en todos estos endpoints.
- [ ] Body con campos invalidos retorna 400 con descripcion detallada del error de Zod.
- [ ] Intentar operar sobre un proyecto inexistente retorna 404.

---

### [BACK-05] Dashboard Macro con Metricas Cacheadas

**Descripcion:**
El dashboard del Admin muestra metricas agregadas de todos los proyectos. Estas metricas son costosas de calcular en tiempo real pero no requieren datos frescos en cada request. Usar unstable_cache de Next.js 15 con revalidacion periodica para evitar consultas pesadas en cada carga.

**Implementacion Tecnica:**
1. Crear lib/services/dashboard.service.ts.
2. Implementar la funcion getDashboardMetrics envuelta en unstable_cache con una revalidacion de 300 segundos (5 minutos). Usar la tag "dashboard-metrics" para poder invalidar el cache manualmente.
3. Dentro de la funcion cacheada, ejecutar un Promise.all con las siguientes consultas en paralelo:
   - Conteo total de proyectos.
   - Conteo de proyectos con status ACTIVE.
   - Conteo total de usuarios.
   - Conteo de dailyReports cuya reportDate sea hoy (entre las 00:00:00 y las 23:59:59 del dia actual).
   - Conteo de dailyReports con isBlocker = true del dia actual.
4. Al crear o archivar un proyecto (en project.service.ts), llamar a revalidateTag("dashboard-metrics") para invalidar el cache y que la proxima visita al dashboard muestre datos actualizados.

**Importancia:**
El dashboard macro es la primera pantalla que ve el Admin. Sin cache, cada carga ejecuta 5 queries agregadas sobre posiblemente miles de registros. El cache de 5 minutos es un balance adecuado entre frescura de datos y performance para este caso de uso.

**Criterios de Aceptacion:**
- [ ] getDashboardMetrics usa unstable_cache con revalidacion de 5 minutos y la tag correcta.
- [ ] Las 5 metricas se calculan en paralelo con Promise.all (no secuencialmente).
- [ ] Al crear un nuevo proyecto, el cache de dashboard se invalida (revalidateTag llamado).
- [ ] Las metricas aparecen correctamente en el dashboard del Admin.
- [ ] El tiempo de respuesta del endpoint de metricas es menor a 100ms cuando el cache esta activo.

---

### [FRONT-03] Panel Admin — Gestion de Proyectos

**Descripcion:**
Construir la interfaz de administracion de proyectos. El Admin necesita ver todos los proyectos en una tabla, crear nuevos, editar existentes, cambiar su estado y gestionar los miembros asignados a cada uno.

**Implementacion Tecnica:**

Estructura de rutas a crear en app/dashboard/admin/:
- layout.tsx: layout del panel de Admin con sidebar de navegacion y header.
- page.tsx: dashboard macro con las 5 KPI cards de metricas.
- projects/page.tsx: tabla de todos los proyectos.
- projects/[id]/page.tsx: detalle del proyecto con lista de miembros y reportes recientes.

Componentes a construir en components/projects/:
- ProjectTable: tabla usando el componente Table de shadcn. Columnas: Nombre del proyecto, Status (con badge de color semantico), cantidad de miembros, reportes hoy, fecha de creacion y columna de acciones. Las acciones incluyen: editar (abre dialog), cambiar estado y archivar.
- ProjectStatusBadge: badge con colores semanticos segun el status. ACTIVE en verde, PAUSED en amarillo, FINISHED en azul y ARCHIVED en gris apagado.
- CreateProjectDialog: dialogo modal con formulario de creacion. Usar react-hook-form integrado con el resolver de Zod (createProjectSchema) para validacion en cliente antes de enviar la peticion. Feedback con toast de Sonner al completar.
- EditProjectSheet: panel lateral (Sheet) para editar nombre, descripcion y status de un proyecto existente.
- AssignMemberSheet: panel lateral para buscar usuarios (via GET /api/users) y asignarlos al proyecto con un selector de rol (MEMBER o TECH_LEAD). Mostrar avatar y especializacion del usuario en los resultados de busqueda.

Instalar dependencias de formularios: react-hook-form y @hookform/resolvers.

**Criterios de Aceptacion:**
- [ ] La ruta /dashboard/admin/projects es accesible solo para usuarios con role ADMIN.
- [ ] La tabla carga datos reales desde GET /api/projects.
- [ ] El formulario de creacion valida en cliente con Zod antes de enviar la peticion.
- [ ] Los badges de status tienen los colores semanticos correctos.
- [ ] El modal de asignacion busca usuarios reales y permite asignarles rol.
- [ ] Todas las acciones (crear, editar, archivar, asignar) muestran feedback con toast.
- [ ] La tabla es responsive y usable en tablet.

---

### [FRONT-04] Flujo de Onboarding para Usuario Nuevo

**Descripcion:**
Cuando un usuario se registra por primera vez, Clerk lo redirige a /onboarding. En esta pantalla, el usuario debe seleccionar su especializacion (Developer, Designer, QA, etc.) antes de poder acceder al dashboard. Esto completa el perfil del usuario en nuestra DB.

**Implementacion Tecnica:**
1. Crear app/onboarding/page.tsx como un formulario simple y visualmente atractivo.
2. El formulario muestra un selector de especializacion con los valores del enum Specialization. Puede ser un grid de tarjetas clicables con iconos representativos de cada rol en lugar de un select tradicional.
3. Al enviar, llamar a PATCH /api/users/me con la especializacion seleccionada.
4. Crear el endpoint PATCH /api/users/me en app/api/users/me/route.ts. Este endpoint: obtiene el contexto de autorizacion, actualiza la especializacion del usuario en la DB usando userService.updateSpecialization(dbUserId, specialization), y redirige al usuario a /dashboard.
5. Crear el metodo updateSpecialization en user.service.ts.
6. Proteger /onboarding en el middleware: si el usuario ya tiene especializacion distinta a DEVELOPER (valor por defecto) o ya visito el dashboard antes, redirigir directamente a /dashboard.

**Criterios de Aceptacion:**
- [ ] La ruta /onboarding es accesible para usuarios autenticados recien registrados.
- [ ] El formulario muestra todas las especializaciones disponibles de forma visual.
- [ ] Al seleccionar y confirmar, la especializacion se actualiza en la DB.
- [ ] Tras completar el onboarding, el usuario es redirigido a /dashboard.
- [ ] Un usuario que ya completo el onboarding es redirigido al dashboard directamente.

---

<a name="fase-3"></a>
# FASE 3 — Core: Dailies y Reportes

> **Objetivo:** Construir el corazon del producto. Los usuarios pueden cargar sus reportes diarios, verlos en un muro de noticias del proyecto, y el sistema detecta automaticamente bloqueadores criticos. Esta es la feature de mayor uso diario de toda la aplicacion.

---

### [BACK-06] Servicio y API de Daily Reports

**Descripcion:**
Implementar la capa de servicio y los endpoints para la creacion y consulta de reportes diarios. Es el endpoint mas llamado del sistema (multiples veces al dia por cada usuario). Debe incluir validacion estricta, verificacion de pertenencia al proyecto y logica de deteccion de bloqueadores.

**Implementacion Tecnica:**

Crear lib/validators/daily.schema.ts con los schemas Zod:
- createDailySchema: yesterday (string, min 10 chars, max 1000), today (string, min 10, max 1000), blockers (string opcional, max 500), mood (number, min 1, max 5, integer). Incluir un mensaje de error descriptivo en cada campo para facilitar la UX del formulario.
- Exportar el tipo CreateDailyDto.

Crear lib/services/daily.service.ts con los siguientes metodos:
- create(userId, projectId, data: CreateDailyDto): antes de crear el reporte, verificar que el usuario pertenece al proyecto consultando la tabla ProjectUser. Si no pertenece, lanzar un error de autorizacion (no usar errorResponse dentro del servicio, sino lanzar un Error con un mensaje descriptivo). Calcular isBlocker: es true si el campo blockers tiene contenido despues de hacer trim().
  **Regla de atomicidad obligatoria:** cuando isBlocker es true, la creacion del DailyReport y la creacion de la Notification deben ejecutarse dentro de una unica transaccion interactiva de Prisma (`prisma.$transaction(async (tx) => { ... })`). Usar el callback interactivo (no el array de operaciones) porque la Notification necesita el `id` del DailyReport recien creado en su campo `metadata`. Si la creacion de la Notification falla, la transaccion hace rollback y el DailyReport NO queda huerfano en la base de datos. La llamada al servicio de email (emailService.sendBlockerAlertEmail) se ejecuta FUERA de la transaccion, despues de que esta se confirme exitosamente; un fallo de Resend no debe deshacer la escritura en DB.
  Cuando isBlocker es false, solo se inserta el DailyReport (sin transaccion, ya que es una unica operacion).
- findByProject(projectId, options): lista los reportes de un proyecto para el dia actual por defecto. Implementar cursor-based pagination nativa de Prisma: la firma debe aceptar `take` (numero de items por pagina, default 20) y `cursor` (el `id` del ultimo registro visto en la pagina anterior, opcional). Cuando `cursor` esta presente, la query usa `cursor: { id: cursor }` y `skip: 1` (para excluir el propio cursor). La respuesta debe incluir los registros y el campo `nextCursor` (el `id` del ultimo elemento retornado), o `null` si no hay mas paginas. **Por que `id` y no `reportDate` como cursor:** el campo `id` es un cuid, que es k-sortable (lexicograficamente ordenable por tiempo de creacion) y garantizado unico, lo que elimina el riesgo de colisiones que existiria si dos usuarios reportan en el mismo milisegundo. Esto garantiza que nuevos reportes insertados mientras el usuario hace scroll no generen duplicados ni saltos en la paginacion (pagination drift). Incluir datos del usuario (nombre, avatarUrl, specialization) en cada reporte. Ordenar por `id` descendente.
- findByUser(userId, projectId): historial de reportes de un usuario especifico en un proyecto.
- findById(id): reporte individual con datos del usuario.
- canUserReport(userId, projectId, date): verificar si el usuario ya cargo un reporte para ese proyecto en esa fecha. Un usuario no puede cargar mas de un reporte por proyecto por dia.

Crear los endpoints API:
- app/api/daily-reports/route.ts: POST para crear un nuevo reporte. Obtener projectId del body, no de la URL (el usuario elige para que proyecto reporta). Validar con createDailySchema. Verificar con canUserReport que no se duplica el reporte del dia.
- app/api/daily-reports/route.ts (GET): lista los reportes del usuario autenticado para ver su historial.
- app/api/projects/[id]/daily-reports/route.ts (GET): lista los reportes del proyecto del dia actual. Accesible para miembros del proyecto y Tech Lead. No accesible para usuarios que no pertenecen al proyecto.

**Importancia:**
La creacion del daily es la accion mas frecuente del sistema. La verificacion de pertenencia al proyecto es critica para la seguridad: un usuario no debe poder ver ni crear reportes de proyectos a los que no pertenece. La deteccion automatica de isBlocker permite al sistema notificar proactivamente al Tech Lead.

**Criterios de Aceptacion:**
- [ ] POST /api/daily-reports crea el reporte correctamente con todos los campos.
- [ ] El servicio verifica la pertenencia al proyecto antes de crear el reporte. Un usuario externo al proyecto recibe 403.
- [ ] isBlocker se calcula automaticamente segun si el campo blockers tiene contenido.
- [ ] Cuando isBlocker es true, DailyReport y Notification se crean dentro de una transaccion atomica: si la insercion de la Notification falla, el DailyReport tampoco se persiste (verificar con un test que fuerza el fallo de la segunda operacion).
- [ ] La llamada a emailService.sendBlockerAlertEmail se ejecuta fuera de la transaccion. Un fallo del email no causa rollback del DailyReport.
- [ ] Un usuario no puede enviar dos reportes para el mismo proyecto en el mismo dia (retorna 409 Conflict).
- [ ] Los campos invalidos (mood fuera de rango 1-5, textos demasiado cortos) retornan 400 con mensajes descriptivos.
- [ ] GET /api/projects/:id/daily-reports retorna los reportes paginados usando cursor-based pagination.
- [ ] Los datos del usuario (nombre, avatar) estan incluidos en la respuesta de listado.

---

### [BACK-07] Validacion Zod y Manejo de Errores Estandarizado

**Descripcion:**
Estandarizar el manejo de errores en todas las API Routes. Crear un patron consistente que garantice que los errores de Zod, los errores de Prisma y los errores de negocio se traduzcan siempre al mismo formato de respuesta.

**Implementacion Tecnica:**
1. Crear lib/helpers/handle-error.ts: funcion handleApiError(error, context?) que recibe el error capturado en el catch de una API Route y retorna la NextResponse apropiada:
   - Si el error es una instancia de ZodError: retornar 400 con los errores de validacion aplanados.
   - Si el error es un PrismaClientKnownRequestError con codigo P2002 (unique constraint): retornar 409 Conflict con un mensaje descriptivo.
   - Si el error es un PrismaClientKnownRequestError con codigo P2025 (record not found): retornar 404 Not Found.
   - Si el error tiene un mensaje que incluye palabras clave de autorizacion ("not a member", "forbidden"): retornar 403.
   - En cualquier otro caso: loguear el error completo con logger.error y retornar 500 con un mensaje generico (nunca exponer el stack trace en produccion).
2. Envolver el body de todos los handlers de API Routes en try/catch que llamen a handleApiError.
3. Actualizar todas las routes existentes para usar este patron.

**Importancia:**
Sin manejo de errores estandarizado, el frontend tiene que lidiar con multiples formatos de error. Esta funcion es el "traductor" que convierte cualquier error interno en una respuesta HTTP semanticamente correcta y consistente.

**Criterios de Aceptacion:**
- [ ] lib/helpers/handle-error.ts creado con los 5 casos de error mapeados.
- [ ] Todas las API Routes existentes usan try/catch con handleApiError.
- [ ] Un error de constraint unico de Prisma retorna 409 (no 500).
- [ ] Un record no encontrado retorna 404 (no 500).
- [ ] En produccion, el 500 no expone el stack trace (solo un mensaje generico).
- [ ] Los errores 500 siempre se loguean con logger.error para observabilidad.

---

### [FRONT-05] Formulario de Carga de Daily Report

**Descripcion:**
La interfaz principal para que los usuarios carguen su reporte diario. Debe ser rapida de usar, con validacion en tiempo real y un indicador visual del mood. El diseno debe motivar a completar el reporte diariamente.

**Implementacion Tecnica:**

Estructura de rutas a crear en app/dashboard/:
- page.tsx: dashboard principal del usuario con lista de sus proyectos activos y acceso rapido al formulario de daily.
- projects/[id]/daily/page.tsx: pagina dedicada para cargar el reporte de un proyecto especifico.
- projects/[id]/feed/page.tsx: muro de noticias del proyecto (ver todos los reportes del equipo).

Componentes a construir en components/daily/:
- DailyReportForm: formulario principal con los campos yesterday, today, blockers y mood. Usar react-hook-form con el resolver de Zod (createDailySchema). El campo blockers debe mostrar un indicador de advertencia (icono de alerta en amarillo) cuando tiene contenido, informando al usuario que esto notificara al Tech Lead.
- MoodSelector: componente visual para seleccionar el mood del 1 al 5. No usar un input numerico sino 5 botones o iconos clicables con estados visuales claros (colores: 1 rojo, 2 naranja, 3 amarillo, 4 verde claro, 5 verde).
- DailyStatusBanner: banner visible al inicio de la pagina que indica si el usuario ya cargo su reporte del dia para ese proyecto. Si ya lo cargo, mostrar el resumen y deshabilitar el formulario.
- CharacterCounter: indicador del conteo de caracteres para los campos de texto largo, con cambio de color al acercarse al limite.

Logica del formulario:
- Al cargar la pagina, consultar si el usuario ya cargo un reporte hoy para ese proyecto (usar el endpoint existente con filtro de fecha).
- Si ya reporto: mostrar el DailyStatusBanner en modo "completado" con el contenido del reporte y deshabilitar el formulario.
- Al enviar el formulario: llamar a POST /api/daily-reports, manejar loading state, mostrar toast de exito o error.

**Criterios de Aceptacion:**
- [ ] El formulario renderiza todos los campos con validacion en tiempo real (errores visibles al escribir).
- [ ] El MoodSelector permite seleccionar solo valores del 1 al 5 con feedback visual claro.
- [ ] El campo blockers muestra el indicador de alerta cuando tiene contenido.
- [ ] Si el usuario ya reporto hoy, el formulario muestra el banner y se deshabilita.
- [ ] El submit muestra loading state durante la peticion.
- [ ] Un error de validacion del servidor (400) muestra el mensaje en el campo correspondiente.
- [ ] Tras envio exitoso, se muestra toast de exito y se redirige al feed del proyecto.

---

### [FRONT-06] Muro de Noticias del Proyecto (Feed)

**Descripcion:**
El feed del proyecto es donde todos los miembros ven los reportes diarios del equipo. Debe ser visualmente claro, permitir filtrar por fecha y destacar los bloqueadores criticos.

**Implementacion Tecnica:**

Componentes a construir en components/feed/:
- DailyReportCard: tarjeta que muestra un reporte individual. Incluye: avatar y nombre del usuario con su especializacion (badge), hora del reporte, contenido de yesterday/today, campo de blockers destacado con fondo rojo/naranja si isBlocker es true, y el mood con el componente de visualizacion.
- BlockerAlert: componente especial que se muestra en la parte superior del feed si hay uno o mas bloqueadores en el dia actual. Muestra cuantos bloqueadores hay y quienes los reportaron, con colores de alerta.
- MoodDisplay: version de solo lectura del MoodSelector para visualizar el humor reportado.
- FeedDateFilter: selector de fecha para ver reportes de dias anteriores (no solo el dia actual).
- EmptyFeedState: estado vacio ilustrado cuando ningun miembro ha reportado aun en el dia seleccionado.

Estrategia de data fetching:
- La pagina app/dashboard/projects/[id]/feed/page.tsx es un Server Component que llama directamente a `dailyService.findByProject()` (siguiendo la Regla Arquitectonica Critica: Server Components no hacen fetch a sus propias API Routes). Esta llamada carga la primera pagina de reportes en el servidor, sin latencia adicional de red.
- Para la carga de paginas adicionales (scroll hacia el pasado o cargar mas reportes), el Client Component wrapper recibe el `nextCursor` inicial desde el Server Component y llama a `GET /api/projects/:id/daily-reports?cursor=...` para obtener la siguiente pagina. El cursor que se envia es el `id` del ultimo reporte visible.
- Para la actualizacion en tiempo real (nuevos reportes del equipo mientras el usuario tiene el feed abierto), usar polling simple con un intervalo de 60 segundos. El polling NO usa cursor: siempre solicita los reportes mas recientes del dia (sin cursor, para obtener los nuevos desde el inicio). Los reportes nuevos se insertan al principio de la lista en el estado local del Client Component, sin afectar la posicion de scroll del usuario. El polling se pausa cuando la pagina no esta visible (Page Visibility API) para no consumir recursos en tabs inactivas.

**Criterios de Aceptacion:**
- [ ] El feed muestra los reportes del dia actual del proyecto cargados directamente desde el servicio (sin fetch a API Route propia en el Server Component).
- [ ] Los reportes con bloqueadores se destacan visualmente (borde rojo, icono de alerta).
- [ ] El BlockerAlert aparece en la parte superior si hay bloqueadores en el dia.
- [ ] El filtro de fecha permite ver reportes de dias anteriores.
- [ ] El estado vacio se muestra de forma ilustrativa cuando no hay reportes.
- [ ] Solo los miembros del proyecto pueden ver el feed (verificado en el servidor).
- [ ] La paginacion usa cursor-based pagination: la respuesta incluye `nextCursor` (id del ultimo registro) o `null` si no hay mas paginas.
- [ ] Cargar la pagina 2 con el cursor correcto no retorna duplicados de la pagina 1, incluso si se insertaron nuevos reportes entre ambas peticiones (pagination drift verificado).
- [ ] El polling de actualizacion inserta nuevos reportes al inicio de la lista sin afectar la posicion de scroll ni duplicar registros existentes.
- [ ] El polling se pausa cuando la tab del navegador no esta activa (Page Visibility API).

---

### [BACK-08] Endpoint de Perfil de Usuario

**Descripcion:**
Implementar los endpoints para consultar y actualizar el perfil del usuario autenticado. Necesario para el onboarding y para que el usuario pueda cambiar su especializacion desde su perfil.

**Implementacion Tecnica:**
1. Crear app/api/users/me/route.ts con:
   - GET: retorna el perfil completo del usuario autenticado, incluyendo sus proyectos activos con su rol en cada uno.
   - PATCH: permite actualizar name y specialization. Validar con un updateUserSchema de Zod.
2. Agregar los metodos necesarios en user.service.ts: findByIdWithProjects (incluye la relacion projects con datos del proyecto) y updateProfile.

**Criterios de Aceptacion:**
- [ ] GET /api/users/me retorna el perfil con los proyectos del usuario.
- [ ] PATCH /api/users/me actualiza correctamente nombre y especializacion.
- [ ] No es posible modificar el role del usuario desde este endpoint (el campo role debe ser ignorado aunque se envie en el body).
- [ ] Retorna 401 si no hay sesion activa.

---

<a name="fase-4"></a>
# FASE 4 — Inteligencia Artificial (Tech Lead)

> **Objetivo:** Integrar Gemini para que el Tech Lead pueda generar resumenes ejecutivos inteligentes de los reportes del equipo. Incluye prompt engineering, sanitizacion de datos sensibles, manejo de limites de la API y almacenamiento del historial de resumenes.

---

### [AI-01] Servicio de Gemini y Generacion de Resumenes

**Descripcion:**
Implementar la capa de integracion con la API de Gemini. El servicio debe recibir los reportes del dia de un proyecto, construir el prompt, llamar a la API y retornar el resumen estructurado. El Tech Lead activa esta funcion manualmente; no se ejecuta automaticamente en cada daily.

**Implementacion Tecnica:**

Crear lib/services/ai.service.ts:
- Inicializar el cliente de Gemini usando el paquete @google/generative-ai con la GEMINI_API_KEY del entorno. Usar el modelo gemini-2.0-flash.
- Implementar el metodo generateProjectSummary(projectId, techLeadId):
  1. Obtener todos los reportes del dia actual para el proyecto llamando a daily.service.ts.
  2. Si no hay reportes, retornar un error descriptivo (no llamar a Gemini innecesariamente).
  3. Sanitizar el contenido de cada reporte antes de enviarlo a Gemini: eliminar patrones que parezcan credenciales (tokens, passwords, API keys), URLs de dashboards internos y cualquier dato que parezca sensible. Implementar esta sanitizacion en una funcion separada sanitizeReportContent(text).
  4. Construir el prompt estructurado (ver tarea AI-02).
  5. Llamar a model.generateContent(prompt) con un timeout configurado.
  6. Parsear la respuesta de Gemini y extraer el texto del resumen.
  7. Persistir el resumen en la tabla AISummary de Prisma, guardando el contenido, el prompt usado (para auditoria y mejora iterativa), el conteo de tokens y la referencia al Tech Lead que lo genero.
  8. Retornar el objeto AISummary creado.
- Implementar el metodo getProjectSummaryHistory(projectId): retorna el historial de resumenes de un proyecto ordenados por fecha descendente.

Crear app/api/ai-summary/route.ts:
- POST: recibe projectId en el body. Verifica que el usuario autenticado es TECH_LEAD o ADMIN. Verifica que el Tech Lead pertenece al proyecto (no puede generar resumenes de proyectos ajenos). Llama a ai.service.generateProjectSummary. Maneja los errores especificos de la API de Gemini (rate limit, quota exceeded) con mensajes de error descriptivos para el usuario.
- GET: recibe projectId como query param. Retorna el historial de resumenes del proyecto.

**Importancia:**
El resumen de IA es el diferenciador principal de AsyncReport frente a herramientas de dailies tradicionales. La sanitizacion de datos sensibles es obligatoria antes de enviar texto a un servicio externo. Guardar el prompt usado permite mejorar iterativamente la calidad de los resumenes.

**Criterios de Aceptacion:**
- [ ] POST /api/ai-summary genera un resumen real usando la API de Gemini.
- [ ] El resumen se persiste en la tabla AISummary con todos los campos (contenido, prompt, tokens, generatedBy).
- [ ] La sanitizacion de contenido elimina patrones de credenciales antes de enviar a Gemini.
- [ ] Si no hay reportes del dia, el endpoint retorna 422 Unprocessable Entity con mensaje claro.
- [ ] Un error de rate limit de Gemini retorna 429 con mensaje amigable (no 500 generico).
- [ ] Un usuario que no es TECH_LEAD ni ADMIN recibe 403.
- [ ] Un Tech Lead que no pertenece al proyecto recibe 403.
- [ ] GET /api/ai-summary retorna el historial de resumenes del proyecto con paginacion.

---

### [AI-02] Prompt Engineering para Resumenes Ejecutivos

**Descripcion:**
El prompt es el factor determinante en la calidad del resumen generado. Debe ser lo suficientemente especifico para producir resumenes estructurados y accionables, no respuestas genericas. Se debe disenar con tecnicas de prompt engineering probadas: rol del modelo, contexto, formato de salida y restricciones.

**Implementacion Tecnica:**

Crear lib/helpers/prompts.ts con la funcion buildDailySummaryPrompt(reports, projectName):

El prompt debe incluir los siguientes elementos estructurales:
1. Asignacion de rol: definir al modelo como "Eres un Tech Lead experto analizando el progreso de un equipo de desarrollo de software".
2. Contexto: indicar el nombre del proyecto, la fecha y la cantidad de miembros que reportaron vs. los que no reportaron (esto requiere conocer el total de miembros del proyecto).
3. Datos formateados: listar cada reporte con el nombre del miembro, su especializacion, lo que hizo ayer, lo que hara hoy y sus bloqueadores (si los tiene).
4. Instrucciones de analisis: pedir que identifique patrones de riesgo, dependencias entre tareas que podrian crear cuellos de botella, el estado general del equipo segun el mood promedio y los bloqueadores criticos que requieren atencion inmediata.
5. Formato de salida: especificar que el resumen debe tener secciones claramente definidas (Resumen Ejecutivo, Progreso del Dia, Bloqueadores Criticos, Riesgos Identificados y Recomendaciones para el Tech Lead). Pedir formato markdown para facilitar el renderizado en la UI.
6. Restricciones: indicar que no debe inventar informacion que no este en los reportes y que debe ser conciso (maximo 400 palabras).

Documentar el prompt base en este archivo del plan para facilitar iteraciones futuras.

**Importancia:**
Un mal prompt produce resumenes vagos e inutiles. La inversion en prompt engineering en esta tarea determina directamente el valor percibido de la feature de IA por parte del Tech Lead.

**Criterios de Aceptacion:**
- [ ] lib/helpers/prompts.ts creado con la funcion buildDailySummaryPrompt.
- [ ] El prompt generado incluye los 6 elementos estructurales definidos.
- [ ] El resumen producido por Gemini tiene las secciones de markdown esperadas (verificado manualmente con 3-5 pruebas con datos reales).
- [ ] El resumen tiene coherencia y no inventa informacion que no esta en los reportes.
- [ ] La funcion es pura (mismos inputs producen el mismo prompt, sin efectos secundarios).

---

### [AI-03] Interfaz del Tech Lead para Resumenes de IA

**Descripcion:**
Construir la seccion del dashboard dedicada al Tech Lead para generar y consultar los resumenes de IA. Debe ser la pantalla mas impactante visualmente del producto: el momento en que el TL hace click en "Generar Resumen" y ve el analisis inteligente es el "aha moment" de AsyncReport.

**Implementacion Tecnica:**

Estructura de rutas en app/dashboard/team/:
- page.tsx: dashboard del Tech Lead con lista de sus proyectos y estado de reportes del dia (cuantos miembros reportaron vs cuantos no).
- projects/[id]/summary/page.tsx: pagina de resumenes de IA del proyecto.

Componentes a construir en components/ai/:
- GenerateSummaryButton: boton primario con estado de loading animado. Mientras Gemini procesa la respuesta (puede tardar 5-10 segundos), mostrar un skeleton de carga con mensaje motivacional (ej: "Analizando el progreso del equipo..."). Al completar, mostrar el resumen con una animacion de aparicion.
- AISummaryCard: componente para mostrar un resumen generado. El contenido markdown debe renderizarse correctamente (usar la libreria react-markdown). Mostrar metadata: fecha de generacion, quien lo genero y tokens utilizados.
- AISummaryHistory: lista paginada de resumenes anteriores del proyecto, colapsables para no ocupar demasiado espacio.
- TeamProgressBar: barra de progreso visual que indica cuantos miembros del proyecto ya reportaron hoy (ej: "5 de 8 miembros han reportado"). Muestra el porcentaje y los avatares de quienes aun no reportaron.
- MoodAverageChart: visualizacion del mood promedio del equipo usando el componente Chart de shadcn (recharts). Mostrar la evolucion del mood en los ultimos 7 dias.

Instalar react-markdown para renderizar el contenido del resumen.

**Criterios de Aceptacion:**
- [ ] La ruta /dashboard/team es accesible solo para TECH_LEAD y ADMIN.
- [ ] El boton de generar resumen muestra el skeleton de carga durante el procesamiento.
- [ ] El resumen se renderiza con el formato markdown correcto (headings, bold, listas).
- [ ] El historial de resumenes anteriores es consultable y paginado.
- [ ] El TeamProgressBar muestra el estado correcto de reportes del dia.
- [ ] El MoodAverageChart muestra datos de los ultimos 7 dias correctamente.
- [ ] Si Gemini tarda mas de 15 segundos, se muestra un mensaje de timeout amigable.

---

### [AI-04] Sanitizacion de Datos Sensibles

**Descripcion:**
Antes de enviar cualquier texto de usuario a la API de Gemini (un servicio externo de Google), se deben eliminar patrones que puedan contener datos sensibles que accidentalmente un usuario haya pegado en su daily report.

**Implementacion Tecnica:**
1. Crear lib/helpers/sanitize.ts con la funcion sanitizeForAI(text).
2. La funcion debe aplicar los siguientes reemplazos usando expresiones regulares:
   - Tokens de autenticacion (Bearer tokens, JWT): detectar patrones eyJh... (inicio de JWT) y reemplazar con [TOKEN_REDACTED].
   - API Keys comunes: detectar patrones de claves largas alfanumericas precedidas por "key", "secret", "token", "password" o "api". Reemplazar el valor con [REDACTED].
   - Cadenas de conexion de base de datos: detectar patrones postgresql://, mysql://, mongodb:// seguidos de credenciales.
   - Correos electronicos: reemplazar con [EMAIL_REDACTED] si se considera sensible para el contexto.
3. La funcion debe ser idempotente (aplicarla dos veces produce el mismo resultado).
4. Agregar tests unitarios basicos para esta funcion (es la funcion de seguridad mas critica del modulo de IA).

**Importancia:**
Es una obligacion etica y de seguridad no enviar datos sensibles del equipo a APIs de terceros. Los usuarios a veces pegan accidentalmente connection strings, tokens o passwords en sus reportes. Esta capa de sanitizacion es la ultima linea de defensa antes de la llamada a Gemini.

**Criterios de Aceptacion:**
- [ ] lib/helpers/sanitize.ts creado con la funcion sanitizeForAI.
- [ ] Los 4 tipos de patrones sensibles son correctamente redactados.
- [ ] La sanitizacion se aplica en ai.service.ts antes de construir el prompt.
- [ ] Tests unitarios cubren los casos de JWT, API keys y connection strings.
- [ ] La funcion no altera el texto normal que no contiene datos sensibles.

---

### [AI-05] Rate Limiting para Generacion de Resumenes y Solucion al Timeout de Vercel

**Descripcion:**
Esta tarea aborda dos problemas críticos identificados en la Fase 4: (1) la ausencia de protección contra el agotamiento del quota de Gemini y (2) el conflicto entre el tiempo de procesamiento de Gemini (5-15 segundos) y el límite de timeout de funciones serverless de Vercel (10 segundos en el plan Hobby, 60 segundos en Pro).

**Problema 1 — Rate Limiting:**
Sin protección, un Tech Lead (o un atacante que comprometió una sesión) puede llamar a `POST /api/ai-summary` de forma repetida, agotando el quota diario de la API de Gemini y generando costos inesperados. El sistema debe limitar cuántas veces se puede generar un resumen por proyecto por día.

**Implementacion del Rate Limiting:**
1. Agregar un campo `summaryCount` en `AISummary` o usar una query de conteo directamente en `ai.service.ts`.
2. En `ai.service.generateProjectSummary`, antes de llamar a Gemini, contar cuántos `AISummary` existen para ese `projectId` en el día actual (comparando `summaryDate` con `toUTCDayStart` de la tarea SETUP-05).
3. Si el conteo es igual o mayor a `MAX_DAILY_SUMMARIES` (configurado en `5` como constante en `lib/helpers/constants.ts`), lanzar un error con código `RATE_LIMIT_EXCEEDED`.
4. El handler en `app/api/ai-summary/route.ts` mapea `RATE_LIMIT_EXCEEDED` a una respuesta `429 Too Many Requests` con mensaje: `"Límite de 5 resúmenes diarios alcanzado para este proyecto. Se reinicia a las 00:00 UTC."`.

**Problema 2 — Timeout de Vercel:**

**Decision arquitectonica — Patron de respuesta asíncrona (202 Accepted):**

En lugar de que `POST /api/ai-summary` espere síncronamente la respuesta de Gemini (bloqueando la conexión hasta 15 segundos), se implementa un patrón de job asíncrono:

1. `POST /api/ai-summary` recibe `projectId`, valida auth y rate limit, crea un registro `AISummary` con `status: "PENDING"` en la DB y retorna **inmediatamente** `202 Accepted` con el `summaryId`.
2. La generación real con Gemini se delega a una **Vercel Function en background** usando el patrón `waitUntil` de la API de Next.js 15+: `NextResponse` con `connection.signal.aborted` como guardia, más `EdgeRuntime.waitUntil(generateInBackground(summaryId))`.
3. `GET /api/ai-summary/status/:id` retorna el estado actual (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) y el contenido cuando esté listo.
4. El componente `GenerateSummaryButton` en el frontend hace polling a `GET /api/ai-summary/status/:id` cada 2 segundos hasta que el estado sea `COMPLETED` o `FAILED`.

**Actualizar el schema de Prisma** para soportar este patrón:
- Agregar `status` a `AISummary` como enum: `AISummaryStatus { PENDING PROCESSING COMPLETED FAILED }`.
- Agregar campo `errorMessage String?` para registrar el error en caso de `FAILED`.

**Nota sobre plan de Vercel:** Si se decide no implementar el patrón async, la única alternativa es hacer upgrade a **Vercel Pro** ($20/mes) que eleva el timeout a 60 segundos. Esta alternativa es más simple de implementar pero tiene costo. Documentar la decisión antes de iniciar la Fase 4.

**Criterios de Aceptacion:**
- [ ] `POST /api/ai-summary` retorna `429` con mensaje descriptivo si se superan 5 resúmenes diarios para el proyecto.
- [ ] La constante `MAX_DAILY_SUMMARIES` está centralizada en `lib/helpers/constants.ts`.
- [ ] `POST /api/ai-summary` retorna `202 Accepted` con el `summaryId` sin esperar la respuesta de Gemini.
- [ ] `GET /api/ai-summary/status/:id` retorna el estado (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) correctamente.
- [ ] El componente `GenerateSummaryButton` hace polling cada 2 segundos y muestra el skeleton hasta recibir `COMPLETED`.
- [ ] Si Gemini falla, el `AISummary` queda en estado `FAILED` con `errorMessage` visible en la UI.
- [ ] El enum `AISummaryStatus` está en el schema de Prisma y la migración está aplicada.
- [ ] La decisión (patrón async vs upgrade Pro) está documentada en el plan con la elección final.

---

<a name="fase-5"></a>
# FASE 5 — UI/UX, Dashboard Visual y Notificaciones

> **Objetivo:** Pulir la experiencia completa del producto. Construir el sistema de notificaciones internas (campana), integrar emails transaccionales con Resend, implementar los graficos del dashboard y garantizar que la aplicacion es robusta, accesible y lista para produccion en Vercel.

---

### [NOTIF-01] Sistema de Notificaciones Internas

**Descripcion:**
Implementar el centro de notificaciones en la barra de navegacion (icono de campana). Las notificaciones son alertas internas del sistema que se generan automaticamente ante eventos relevantes: asignacion a un proyecto, nuevo resumen de IA disponible o bloqueador critico reportado.

**Implementacion Tecnica:**

Crear lib/services/notification.service.ts con los siguientes metodos:
- create(userId, type, title, message, metadata?): inserta una notificacion en la tabla Notification.
- findByUser(userId, options): lista las notificaciones del usuario con soporte de paginacion. Separar en leidas y no leidas.
- markAsRead(notificationId, userId): actualiza isRead a true. Verificar que el notificationId pertenece al userId (no permitir que un usuario marque notificaciones de otro).
- markAllAsRead(userId): marca todas las notificaciones no leidas del usuario como leidas.
- countUnread(userId): retorna el conteo de notificaciones no leidas (usado para el badge de la campana).
- notifyAssignment(userId, projectName): crea una notificacion de tipo ASSIGNMENT cuando un Admin asigna al usuario a un proyecto.
- notifyBlocker(projectId, blockerContent, reporterName): busca al Tech Lead del proyecto y crea una notificacion de tipo BLOCKER_ALERT con el contenido del bloqueador.
- notifyAISummaryReady(techLeadId, projectName): crea una notificacion de tipo AI_SUMMARY_READY cuando se genera un nuevo resumen.

Integrar las notificaciones en los flujos existentes siguiendo la regla de atomicidad:

**Regla de atomicidad para todas las integraciones:** Las escrituras en base de datos que deben ser atomicas se agrupan en `prisma.$transaction`. Las llamadas a servicios externos (Resend) se ejecutan siempre despues de confirmar la transaccion, nunca dentro de ella. El motivo es que incluir una llamada HTTP externa dentro de una transaccion de Prisma bloquea la conexion de base de datos durante toda la duracion del request externo, lo que puede causar timeouts y degradar el pool de Pgbouncer.

- En project.service.assignMember: la operacion UPSERT de ProjectUser y la creacion de la Notification deben ir en una misma transaccion interactiva (el Notification necesita datos del ProjectUser recien creado). El email de asignacion se llama fuera de la transaccion.
- En daily.service.create: cuando isBlocker es true, DailyReport y Notification van en una transaccion interactiva (descrito en BACK-06). El email de alerta se llama fuera de la transaccion.
- En ai.service.generateProjectSummary: la insercion de AISummary y la Notification van en una misma transaccion. La logica de notificacion no involucra email en este caso.

Crear los endpoints API en app/api/notifications/route.ts:
- GET: lista notificaciones del usuario autenticado con query param para filtrar por isRead.
- PATCH (ruta /api/notifications/read-all): marca todas como leidas.
- PATCH (ruta /api/notifications/[id]/read): marca una notificacion especifica como leida.
- GET /api/notifications/unread-count: retorna solo el conteo de no leidas (llamado frecuentemente por el badge).

**Importancia:**
El sistema de notificaciones cierra el ciclo de comunicacion del producto. Sin el, el Tech Lead no se entera en tiempo real de un bloqueador critico, que es uno de los casos de uso principales de la herramienta.

**Criterios de Aceptacion:**
- [ ] Al asignar un usuario a un proyecto, se crea una notificacion de tipo ASSIGNMENT para ese usuario.
- [ ] Si la creacion de la Notification falla durante una asignacion, el UPSERT de ProjectUser tambien se revierte (atomicidad verificada).
- [ ] Al crear un daily con bloqueador, se crea una notificacion de tipo BLOCKER_ALERT para el Tech Lead del proyecto.
- [ ] Al generar un resumen de IA, se crea una notificacion de tipo AI_SUMMARY_READY para el Tech Lead dentro de la misma transaccion que persiste el AISummary.
- [ ] Las llamadas a Resend estan fuera de todas las transacciones de Prisma (verificable por revision de codigo: ninguna llamada a emailService esta dentro de un bloque prisma.$transaction).
- [ ] GET /api/notifications retorna las notificaciones del usuario autenticado con paginacion.
- [ ] PATCH para marcar como leida solo funciona para notificaciones del usuario autenticado (403 si intenta marcar la de otro).
- [ ] El conteo de no leidas se actualiza correctamente al marcar como leidas.

---

### [NOTIF-02] Componente de Campana de Notificaciones (UI)

**Descripcion:**
Construir el componente visual de la campana de notificaciones en el header de la aplicacion. Debe mostrar el conteo de no leidas, permitir ver la lista en un panel desplegable y marcar como leidas.

**Implementacion Tecnica:**

Crear components/notifications/NotificationBell.tsx:
- Este es un Client Component ya que necesita estado y efectos.
- Consultar el conteo de notificaciones no leidas via GET /api/notifications/unread-count al montar el componente. Refrescar cada 30 segundos con polling (o usar el Page Visibility API para pausar cuando la tab no esta activa).
- Si el conteo es mayor a 0, mostrar un badge rojo con el numero sobre el icono de la campana.
- Al hacer click en la campana, abrir un Popover o Sheet con la lista de notificaciones recientes.

Crear components/notifications/NotificationList.tsx:
- Lista paginada de notificaciones del usuario.
- Cada notificacion muestra: icono segun tipo (diferente color e icono para ASSIGNMENT, BLOCKER_ALERT, AI_SUMMARY_READY, SYSTEM), titulo en negrita, mensaje truncado, tiempo relativo (ej: "hace 5 minutos") y estado de leida/no leida (fondo diferente para no leidas).
- Al hacer click en una notificacion, marcarla como leida y navegar a la seccion relevante si aplica (ej: notificacion de bloqueador navega al feed del proyecto).
- Boton "Marcar todas como leidas" en el header del panel.

**Criterios de Aceptacion:**
- [ ] El badge de la campana muestra el conteo correcto de no leidas.
- [ ] El polling actualiza el conteo cada 30 segundos sin causar parpadeos.
- [ ] Cada tipo de notificacion tiene un icono y color distintivo.
- [ ] Hacer click en una notificacion la marca como leida y el badge se actualiza.
- [ ] "Marcar todas como leidas" funciona correctamente.
- [ ] El panel de notificaciones es responsive y usable en mobile.

---

### [NOTIF-03] Emails Transaccionales con Resend

**Descripcion:**
Implementar el envio de emails usando Resend para los dos eventos mas importantes: cuando un usuario es asignado a un proyecto y cuando el Tech Lead recibe un reporte con bloqueador critico.

**Implementacion Tecnica:**

Crear lib/services/email.service.ts:
- Inicializar el cliente de Resend con RESEND_API_KEY.
- Implementar sendProjectAssignmentEmail(userEmail, userName, projectName, role): envia un email informando al usuario que fue asignado a un proyecto con su rol. Incluir un CTA con link al dashboard.
- Implementar sendBlockerAlertEmail(techLeadEmail, techLeadName, projectName, reporterName, blockerContent): envia un email urgente al Tech Lead con el contenido del bloqueador. Usar un asunto de alta prioridad y formato visual que destaque la urgencia.
- Ambos metodos deben estar envueltos en try/catch. Si el envio falla, loguear el error con logger.error pero NO lanzar el error hacia arriba (el fallo de envio de email no debe bloquear la operacion principal).

Crear las plantillas de email:
- No usar HTML inline complicado. Usar el sistema de templates de Resend o construir plantillas simples con HTML y estilos inline responsivos.
- Las plantillas deben ser consistentes con la identidad visual de AsyncReport: fondo oscuro, primario azul, tipografia limpia.
- Incluir en el footer: nombre de la aplicacion, enlace para desuscribirse de notificaciones (si aplica) y link al dashboard.

Integrar el servicio de email en los flujos existentes:
- En notification.service.notifyAssignment: despues de crear la notificacion interna, llamar a emailService.sendProjectAssignmentEmail.
- En notification.service.notifyBlocker: despues de crear la notificacion interna, llamar a emailService.sendBlockerAlertEmail.

**Importancia:**
El email es el canal de comunicacion de mayor alcance porque no requiere que el usuario este activo en la aplicacion. Un bloqueador critico puede paralizar el equipo; el email garantiza que el Tech Lead sea notificado incluso si no esta revisando la app en ese momento.

**Criterios de Aceptacion:**
- [ ] Al asignar un usuario a un proyecto, ese usuario recibe un email de bienvenida al proyecto.
- [ ] Al crear un daily con bloqueador, el Tech Lead del proyecto recibe un email de alerta.
- [ ] Si el envio de email falla (ej: Resend no disponible), la operacion principal (asignacion o creacion de daily) NO falla. Solo se loguea el error.
- [ ] Los emails tienen formato visual correcto (no plain text) y son responsivos en mobile.
- [ ] El email incluye el nombre del usuario, el nombre del proyecto y un CTA al dashboard.
- [ ] En entorno de desarrollo, los emails se envian solo al email verificado de la cuenta de Resend (no a los usuarios reales).

---

### [PERF-01] Optimizaciones de Performance y Preparacion para Produccion

**Descripcion:**
Antes del despliegue en Vercel, realizar las optimizaciones criticas de performance y revisar la configuracion de seguridad para el entorno de produccion.

**Implementacion Tecnica:**

Optimizaciones de imagenes:
- Reemplazar todas las etiquetas img nativas por el componente Image de Next.js en toda la aplicacion. Esto activa optimizacion automatica de formatos (WebP/AVIF), lazy loading y prevencion de Cumulative Layout Shift.
- Configurar en next.config.mjs los dominios de imagenes permitidos: img.clerk.com (avatares de Google via Clerk) y cualquier dominio usado para imagenes de proyectos.

Caching estrategico:
- Revisar todos los Server Components y aplicar la estrategia de caching adecuada. Las paginas del feed de dailies deben ser dinamicas (no cachear). Las paginas del dashboard de Admin con metricas deben usar el cache de getDashboardMetrics ya implementado.
- Configurar los headers de Cache-Control correctos en los endpoints que retornan datos estaticos o semi-estaticos.

Variables de entorno en Vercel:
- En el dashboard de Vercel, ir a Settings > Environment Variables y agregar todas las variables de .env.local para el entorno de Production. Revisar que DATABASE_URL apunte a la connection string de pooling (no la directa) para el runtime de produccion.
- Configurar las variables separadas para Preview (entorno de staging) si se necesita.

Configuracion de Clerk para produccion:
- En el dashboard de Clerk, agregar el dominio de produccion de Vercel (ej: async-report.vercel.app) en la lista de dominios permitidos.
- Actualizar la URL del webhook de Clerk para apuntar al dominio de produccion.
- Verificar que las redirect URLs de Clerk apuntan al dominio de produccion.

Revision de seguridad final:
- Verificar que ninguna variable de entorno esta hardcodeada en el codigo (busqueda de patrones como "pk_test" o "sk_test" en el repositorio).
- Revisar que el .gitignore incluye .env.local, .env*.local, y cualquier archivo de secretos.
- **Decision arquitectonica — RLS descartado deliberadamente:** No se activa Row Level Security en Supabase. El motivo es tecnico: Prisma se conecta mediante el rol `postgres` a traves de Pgbouncer. Este rol es superusuario y omite las politicas RLS por defecto. Para que RLS funcione con Prisma, seria necesario inyectar el JWT de Clerk en cada sesion de PostgreSQL usando Prisma Client Extensions, lo cual introduce complejidad no justificada para este stack. La seguridad de acceso a datos descansa en dos capas ya implementadas y auditadas: (1) el Middleware de Clerk que bloquea usuarios no autenticados y sin el rol requerido antes de que el request llegue a la API Route, y (2) los metodos de cada servicio en lib/services/ que reciben el `dbUserId` del `AuthContext` y lo usan como filtro obligatorio en todas las queries (ninguna query de lectura o escritura de datos sensibles puede ejecutarse sin que el `userId` del solicitante sea validado explicitamente). Esta decision debe revisarse si en el futuro se migra a Supabase Auth o se requieren auditorias de acceso a nivel de base de datos.
- Auditoria de los servicios: recorrer todos los metodos de lib/services/ que accedan a DailyReport, Notification y ProjectUser, y verificar que cada uno filtra por el `userId` o `projectId` del contexto autenticado. Ninguna query debe retornar registros de otro usuario por una omision de filtro.

**Criterios de Aceptacion:**
- [ ] No hay etiquetas img nativas en el proyecto, solo el componente Image de Next.js.
- [ ] next.config.mjs tiene los dominios de imagenes externos configurados.
- [ ] Todas las variables de entorno estan configuradas en Vercel para Production.
- [ ] DATABASE_URL en Vercel apunta a la conexion pooling de Supabase (puerto 6543, pgbouncer=true).
- [ ] El dominio de produccion esta en la lista blanca de Clerk.
- [ ] El webhook de Clerk apunta al dominio de produccion.
- [ ] Auditoria de servicios completada: todos los metodos que leen DailyReport, Notification o ProjectUser filtran por el userId del contexto autenticado.
- [ ] Busqueda de secretos hardcodeados en el repo no retorna resultados.
- [ ] Ninguna API Route de lectura de datos sensibles omite la llamada a getAuthContext (verificado por revision de codigo).

---

### [PERF-02] Despliegue en Vercel y Verificacion Final

**Descripcion:**
Desplegar la aplicacion en Vercel y verificar el funcionamiento completo del sistema end-to-end en el entorno de produccion.

**Implementacion Tecnica:**

Pasos de despliegue:
1. Conectar el repositorio de GitHub al proyecto de Vercel.
2. Configurar el framework preset como "Next.js".
3. Verificar que el build command es "npx prisma generate && next build" para que el cliente de Prisma se genere antes del build de Next.js.
4. Ejecutar el primer despliegue y verificar que el build completa sin errores.
5. Una vez desplegado, ejecutar "npx prisma migrate deploy" contra la base de datos de produccion (no migrate dev) usando el script de Prisma o el CLI de Vercel.

Verificacion end-to-end en produccion:
- Flujo de registro: un nuevo usuario se registra con Google, el webhook de Clerk crea el registro en la DB, el usuario completa el onboarding.
- Flujo de Admin: el Admin crea un proyecto y asigna al usuario. El usuario recibe el email de asignacion.
- Flujo de Daily: el usuario carga su daily con un bloqueador. El Tech Lead recibe la notificacion interna y el email de alerta.
- Flujo de IA: el Tech Lead genera el resumen de IA del dia. El resumen se muestra correctamente con formato markdown.

**Criterios de Aceptacion:**
- [ ] El build de Vercel completa sin errores ni warnings criticos.
- [ ] La migracion de base de datos se ejecuta correctamente en produccion.
- [ ] Los 4 flujos de verificacion end-to-end funcionan en el dominio de produccion.
- [ ] Los logs de Vercel no muestran errores 500 durante la verificacion.
- [ ] El tiempo de respuesta de las paginas principales es menor a 2 segundos en condiciones normales.
- [ ] El Lighthouse score de la landing page en produccion es mayor a 90.

---

### [FRONT-07] Perfil de Usuario y Configuracion

**Descripcion:**
Pantalla de perfil donde el usuario puede ver y editar su informacion: nombre, especializacion y preferencias de notificaciones. El avatar se obtiene automaticamente de su cuenta de Google via Clerk y no es editable desde la app.

**Implementacion Tecnica:**

Crear app/dashboard/profile/page.tsx con:
- Seccion de informacion personal: mostrar avatar (Image de Next.js con la URL de Clerk), nombre editable, email (solo lectura, viene de Clerk) y especializacion (selector editable).
- Seccion de proyectos: lista de todos los proyectos en los que participa el usuario con su rol en cada uno.
- Seccion de historial de dailies: los ultimos 7 dias de reportes del usuario en todos sus proyectos (resumen compacto).

El formulario de edicion usa el mismo patron react-hook-form + Zod que el resto de la aplicacion. Al guardar, llamar a PATCH /api/users/me.

**Criterios de Aceptacion:**
- [ ] La pagina de perfil muestra el avatar, nombre y especializacion actuales.
- [ ] El nombre y la especializacion son editables y se persisten correctamente.
- [ ] El email se muestra pero no es editable (campo disabled).
- [ ] La lista de proyectos muestra el rol del usuario en cada uno.
- [ ] Los cambios se reflejan inmediatamente en el header de la aplicacion tras guardar.

---

---

## Resumen de Dependencias entre Tareas

| Tarea | Depende de |
|-------|-----------|
| SETUP-05 (Zonas horarias) | — (puede ejecutarse en paralelo con SETUP-01 a 04) |
| BACK-01 (Schema Prisma) | SETUP-01 (Supabase) |
| BACK-02 (Singleton Prisma) | BACK-01 |
| BACK-03 (Estructura de carpetas) | BACK-02 |
| TEST-01 (Infraestructura Vitest) | BACK-03 (necesita alias @/* configurados) |
| TEST-02 (Tests unitarios criticos) | TEST-01 — **se ejecuta en paralelo con cada BACK-XX** |
| AUTH-01 (Middleware) | SETUP-02 (Clerk) |
| AUTH-02 (Webhook Clerk) | BACK-01, SETUP-02 |
| AUTH-03 (Helper de auth) | AUTH-02 |
| BACK-04 (Proyectos API) | BACK-03, AUTH-03 |
| BACK-05 (Dashboard cache) | BACK-04 |
| FRONT-03 (Panel Admin UI) | BACK-04, FRONT-01 |
| BACK-06 (Dailies API) | BACK-04, AUTH-03, SETUP-05 |
| BACK-07 (Manejo de errores) | BACK-06 |
| FRONT-05 (Formulario Daily) | BACK-06, FRONT-01 |
| FRONT-06 (Feed) | BACK-06 |
| AI-01 (Servicio Gemini) | SETUP-03, BACK-06 |
| AI-02 (Prompt Engineering) | AI-01 |
| AI-03 (UI Tech Lead) | AI-01, AI-02, AI-05 |
| AI-04 (Sanitizacion) | AI-01 |
| AI-05 (Rate limiting + async timeout) | AI-01, BACK-01 (requiere migracion de AISummaryStatus) |
| NOTIF-01 (Notificaciones) | BACK-04, BACK-06, AI-01 |
| NOTIF-02 (Campana UI) | NOTIF-01 |
| NOTIF-03 (Emails Resend) | SETUP-04, NOTIF-01 |
| PERF-01 (Optimizaciones) | Todas las fases anteriores |
| PERF-02 (Deploy Vercel) | PERF-01 |
| SETUP-06 (API Keys) | AUTH-03, BACK-03 |
| BACK-09 (CLI Tool) | SETUP-06, BACK-06, BACK-08 |

---

## Registro de Variables de Entorno

Todas las siguientes variables deben estar definidas en .env.local para desarrollo y en Vercel > Settings > Environment Variables para produccion.

| Variable | Servicio | Descripcion |
|----------|----------|-------------|
| DATABASE_URL | Supabase | Conexion directa (puerto 5432) - usar en Prisma CLI |
| DIRECT_URL | Supabase | Conexion pooling Pgbouncer (puerto 6543) - usar en runtime |
| NEXT_PUBLIC_SUPABASE_URL | Supabase | URL publica del proyecto |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase | Clave anonima publica |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | Clave publica del frontend |
| CLERK_SECRET_KEY | Clerk | Clave secreta del servidor |
| CLERK_WEBHOOK_SECRET | Clerk | Secret para verificar firma de webhooks |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | Clerk | Ruta de login (/sign-in) |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | Clerk | Ruta de registro (/sign-up) |
| NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL | Clerk | Redireccion post-login (/dashboard) |
| NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL | Clerk | Redireccion post-registro (/onboarding) |
| GEMINI_API_KEY | Google AI | Clave de la API de Gemini |
| RESEND_API_KEY | Resend | Clave del servicio de email |
| RESEND_FROM_EMAIL | Resend | Email remitente (noreply@tudominio.com) |
| ASYNCREPORT_API_URL | CLI | URL base de la API (ej: https://async-report.vercel.app). Solo usada por el CLI. |

---

## Estructura de Archivos Final Esperada

Al completar todas las fases, el proyecto debe tener la siguiente estructura de archivos clave:

**app/** (Next.js App Router)
- api/projects/route.ts y [id]/route.ts y [id]/members/route.ts
- api/daily-reports/route.ts y [id]/route.ts
- api/ai-summary/route.ts
- api/notifications/route.ts y [id]/read/route.ts y read-all/route.ts
- api/users/me/route.ts
- api/webhooks/clerk/route.ts
- dashboard/admin/layout.tsx, page.tsx y projects/page.tsx y projects/[id]/page.tsx
- dashboard/team/page.tsx y projects/[id]/summary/page.tsx
- dashboard/projects/[id]/daily/page.tsx y [id]/feed/page.tsx
- dashboard/profile/page.tsx
- onboarding/page.tsx
- sign-in/[[...sign-in]]/page.tsx
- sign-up/[[...sign-up]]/page.tsx
- page.tsx (landing)
- layout.tsx (root layout con ClerkProvider)
- globals.css

**lib/**
- prisma.ts
- services/user.service.ts
- services/project.service.ts
- services/daily.service.ts
- services/ai.service.ts
- services/notification.service.ts
- services/email.service.ts
- services/dashboard.service.ts
- validators/project.schema.ts
- validators/daily.schema.ts
- validators/user.schema.ts
- helpers/api-response.ts
- helpers/auth.ts
- helpers/logger.ts
- helpers/handle-error.ts
- helpers/prompts.ts
- helpers/sanitize.ts
- types/index.ts

**components/**
- ui/ (componentes de shadcn)
- projects/ (ProjectTable, ProjectStatusBadge, CreateProjectDialog, EditProjectSheet, AssignMemberSheet)
- daily/ (DailyReportForm, MoodSelector, MoodDisplay, DailyStatusBanner, CharacterCounter)
- feed/ (DailyReportCard, BlockerAlert, FeedDateFilter, EmptyFeedState)
- ai/ (GenerateSummaryButton, AISummaryCard, AISummaryHistory, TeamProgressBar, MoodAverageChart)
- notifications/ (NotificationBell, NotificationList)

**prisma/**
- schema.prisma
- migrations/ (directorio generado por Prisma)

**cli/**
- index.ts (entry point)
- commands/report.ts, login.ts, status.ts
- utils/config.ts, http.ts

**__tests__/**
- mocks/prisma.mock.ts
- helpers/auth.test.ts, sanitize.test.ts, api-response.test.ts, dates.test.ts
- services/daily.service.test.ts, project.service.test.ts

**vitest.config.ts / vitest.setup.ts** (raíz del proyecto)

---

<a name="fase-6"></a>
# FASE 6 — CLI Tool para Carga de Dailies

> **Objetivo:** Implementar la herramienta de línea de comandos descrita en la definición funcional (sec. 4.A): permitir a los usuarios cargar su reporte diario desde la terminal sin abrir el navegador. Orientada a desarrolladores que prefieren un flujo 100% en consola.

---

### [SETUP-06] Sistema de API Keys para Autenticacion CLI

**Descripcion:**
El flujo CLI no puede usar el OAuth de Clerk (requiere navegador). Se necesita un mecanismo de autenticación sin browser: API Keys propias de la aplicación, vinculadas al usuario en la DB, con capacidad de revocación.

**Implementacion Tecnica:**
1. Agregar el modelo `ApiKey` en `prisma/schema.prisma`:
   ```prisma
   model ApiKey {
     id        String   @id @default(cuid())
     userId    String
     user      User     @relation(fields: [userId], references: [id])
     keyHash   String   @unique  // SHA-256 del token, nunca el token en claro
     name      String            // Descripcion del dispositivo ("MacBook Jose")
     lastUsedAt DateTime?
     createdAt DateTime @default(now())
     expiresAt DateTime?         // null = no expira
     @@index([userId])
   }
   ```
2. La clave en claro solo se muestra **una vez** al usuario al momento de creación (patrón GitHub Personal Access Tokens). Se almacena solo el hash SHA-256.
3. Crear `lib/services/apikey.service.ts` con: `create(userId, name)`, `verify(rawKey): User | null`, `revoke(keyId, userId)`, `listByUser(userId)`.
4. Crear los endpoints en `app/api/api-keys/route.ts`:
   - `POST`: genera una nueva API Key para el usuario autenticado (via Clerk en web). Retorna el token en claro una sola vez.
   - `GET`: lista las API Keys del usuario (solo metadata: id, name, lastUsedAt — nunca el hash).
   - `DELETE /api/keys/:id`: revoca una API Key.
5. Agregar sección "API Keys" en `app/dashboard/profile/page.tsx` donde el usuario puede ver y revocar sus claves.
6. En `lib/helpers/auth.ts`, ampliar `getAuthContext` para soportar autenticación por API Key: si el header `Authorization: Bearer <key>` está presente y no hay sesión de Clerk, intentar verificar la clave via `apikey.service.verify`. Esto permite que las API Routes funcionen tanto para el dashboard web (Clerk) como para el CLI (API Key) sin cambios en los endpoints.

**Criterios de Aceptacion:**
- [ ] Modelo `ApiKey` migrado en Supabase.
- [ ] `POST /api/api-keys` genera un token y retorna el valor en claro solo una vez.
- [ ] `apikey.service.verify` compara el SHA-256 del token recibido con el hash almacenado.
- [ ] `getAuthContext` autentica correctamente por API Key si no hay sesión Clerk.
- [ ] El panel de perfil muestra las API Keys del usuario con opción de revocar.
- [ ] Un token revocado o expirado retorna 401 al intentar usarlo.

---

### [BACK-09] CLI Tool para Carga de Daily Reports

**Descripcion:**
Herramienta de línea de comandos (Node.js) que permite a un desarrollador cargar su daily report directamente desde la terminal. Se distribuye como un script ejecutable `asyncreport` o como un paquete npm global. Utiliza las API Keys del sistema (SETUP-06) para autenticarse sin browser.

**Implementacion Tecnica:**

1. Crear el directorio `cli/` en la raíz del proyecto con los siguientes archivos:
   - `cli/index.ts`: entry point del CLI.
   - `cli/commands/report.ts`: comando `report` para cargar el daily.
   - `cli/commands/login.ts`: comando `login` para configurar la API Key localmente.
   - `cli/commands/status.ts`: comando `status` para verificar si ya se reportó hoy.
   - `cli/utils/config.ts`: gestión de la configuración local (API Key guardada en `~/.asyncreport/config.json`).
   - `cli/utils/http.ts`: cliente HTTP hacia la API de AsyncReport.

2. Instalar dependencias del CLI: `npm install -D @commander-js/extra-typings` y `npm install chalk inquirer` (para el prompt interactivo y colores en la terminal).

3. Implementar el flujo del comando `asyncreport report`:
   ```
   $ asyncreport report
   > Proyecto: [selector con los proyectos del usuario]
   > ¿Qué hiciste ayer? (CTRL+D para terminar): _
   > ¿Qué harás hoy? (CTRL+D para terminar): _
   > ¿Tienes bloqueadores? (Enter para omitir): _
   > Estado de ánimo [1-5]: _
   ✓ Reporte cargado exitosamente para "Proyecto X"
   ```
   - Detecta la zona horaria del sistema (`Intl.DateTimeFormat().resolvedOptions().timeZone`) y la envía en el body.
   - Usa los mismos endpoints existentes: `GET /api/users/me` (para listar proyectos) y `POST /api/daily-reports`.

4. Implementar `asyncreport login`:
   ```
   $ asyncreport login
   > Ingresa tu API Key de AsyncReport (genera una en dashboard/profile): _
   ✓ API Key guardada en ~/.asyncreport/config.json
   ```
   - Valida la key haciendo un `GET /api/users/me` antes de guardarla.

5. Implementar `asyncreport status`:
   - Llama a `GET /api/daily-reports?today=true` para el proyecto seleccionado.
   - Muestra "Ya reportaste hoy" o "Aún no reportaste hoy" con el resumen si existe.

6. Agregar el script `"cli": "npx ts-node cli/index.ts"` en `package.json` para ejecutar localmente durante desarrollo.

7. Agregar `cli/` al array `content` de `tailwind.config.ts` para evitar que Tailwind procese esos archivos (no son componentes UI).

**Nota de distribución:** Para la versión inicial, el CLI vive en el mismo repositorio y se usa via `npm run cli`. En una segunda iteración, se puede publicar como paquete npm con `bin` en `package.json` para instalación global (`npm install -g asyncreport-cli`).

**Criterios de Aceptacion:**
- [ ] `npm run cli -- report` ejecuta el flujo interactivo completo y crea el reporte en la DB.
- [ ] `npm run cli -- login` guarda la API Key en `~/.asyncreport/config.json`.
- [ ] `npm run cli -- status` muestra si el usuario ya reportó hoy en el proyecto seleccionado.
- [ ] El CLI detecta y envía correctamente la zona horaria del sistema.
- [ ] Si la API Key no está configurada, el CLI muestra un mensaje claro con instrucciones para ejecutar `login`.
- [ ] Si el usuario ya reportó hoy, el CLI muestra el reporte existente y no permite duplicar.
- [ ] El CLI funciona en macOS, Linux y WSL (Windows Subsystem for Linux).

---

> **Nota final:** Este plan es una hoja de ruta viva. A medida que avances, es normal que algunas tareas revelen sub-tareas no previstas. Actualiza los criterios de aceptacion y agrega notas de arquitectura en cada tarea segun la experiencia real de implementacion.
