# Proyecto: AsyncReport - Gestión de Dailies Asíncronas

## 1. Visión General
AsyncReport es una plataforma para equipos de desarrollo que permite gestionar actualizaciones diarias (dailies) de forma asíncrona. El objetivo es eliminar las reuniones síncronas innecesarias mediante un portal centralizado de reportes, analítica con IA y gestión de proyectos multisitio. Esta aplicación pensada fundamentalmente para equipos distribuidos en diferentes locaciones con distintos husos horarios.

## 2. Perfil del Desarrollador y Contexto Técnico
* **Background:** Desarrollador con experiencia en Angular (servicios, RxJS, arquitectura SPA). Realizando primeros pasos en Next.js.
* **Entorno:** Sistema operativo Kubuntu (Linux).
* **Preferencia Arquitectónica:** Uso estricto de **API Routes** en lugar de Server Actions para mantener una separación de intereses clara similar a los controladores de backend tradicionales.

## 3. Stack Tecnológico (2026)
* **Framework:** Next.js 16+ (App Router).
* **Frontend:** React, Tailwind CSS, shadcn/ui.
* **Base de Datos:** PostgreSQL vía Supabase + Prisma ORM.
* **Autenticación:** Clerk (Google OAuth como principal) con sincronización de base de datos.
* **IA:** Gemini API (Google Generative AI) para resúmenes ejecutivos.
* **Emails:** Resend (Notificaciones y altas).
* **Despliegue:** Vercel (Hobby Plan).

## 4. Requerimientos Funcionales y Roles (RBAC)

### A. Roles de Usuario
1. **Usuario (Reportador):**
   - Perfil con especialización: Developer, Designer, Analyst, QA, DevOps, etc.
   - Puede pertenecer a múltiples proyectos simultáneamente.
   - Carga de reporte diario: Ayer, Hoy, Bloqueadores, Mood (1-5).
   - Vista de muro de noticias del proyecto.
   - Puede cargar su reporte diario desde una herramienta CLI (interfaz de línea de comandos), autenticada mediante una API Key propia de la aplicación (flujo no-browser). Útil para desarrolladores que prefieren trabajar desde la terminal sin abrir el navegador.

2. **Líder Técnico (LT):**
   - Interfaz personalizada para ver reportes del equipo asignado.
   - Función "AI Summary": Genera un resumen de riesgos y avances basado en los reportes del día usando Gemini.
   - Recibe notificaciones de bloqueadores críticos.

3. **Administrador:**
   - Gestión de Proyectos (CRUD).
   - Estados de Proyecto: Activo, Pausado, Finalizado, Archivado.
   - Asignación de Líderes Técnicos y Miembros a proyectos.
   - Dashboard macro de seguimiento de proyectos.

### B. Comunicación y Notificaciones
- **Sistema Interno:** Centro de notificaciones (campana) para alertas de sistema y asignaciones.
- **Email:** Notificaciones automáticas vía Resend al ser asignado a un proyecto o recibir un mensaje crítico.

## 5. Estándares Arquitectónicos
- **Service Pattern:** Toda la lógica de negocio y llamadas a base de datos debe residir en `lib/services/` (ej. `daily.service.ts`), emulando los servicios de Angular.
- **API Routes:** Los endpoints en `app/api/` deben llamar a los servicios y retornar respuestas estandarizadas. Los Server Components deben importar los servicios directamente (sin hacer `fetch` a su propia API Route) para evitar latencia de red innecesaria en el servidor.
- **Tipado:** TypeScript estricto en todo el proyecto (`"strict": true` en tsconfig.json). Sin uso de `any`.
- **Seguridad y autorización:** Toda ruta en `app/api/` debe verificar sesión de Clerk y rol del usuario antes de ejecutar lógica de negocio. La validación de inputs con Zod es obligatoria antes de llegar al Service.
- **Testing:** Los servicios de dominio y los helpers críticos de seguridad (auth, sanitize) deben tener cobertura de tests unitarios con Vitest antes de ser usados en producción.
- **Zonas horarias:** Todos los campos de fecha/hora se almacenan en UTC en la base de datos. El display en la UI usa la zona horaria del cliente. La lógica de "reporte del día de hoy" compara fechas en UTC para garantizar consistencia entre usuarios de distintas regiones.

## 6. Definición de Base de Datos (Prisma)
El modelo debe incluir:
- **User:** Incluye `role`, `specialization` y relación `ProjectUser`.
- **Project:** Incluye `status` (Enum) y relación con miembros.
- **DailyReport:** Relacionado con Usuario y Proyecto.
- **Notification:** Registro de alertas internas.
- **AISummary:** Historial de resúmenes generados por la IA.

## 7. Instrucciones para Cursor (Prompt Inicial)
"Basado en este documento de definición, inicializa la estructura del proyecto Next.js. Comienza generando el archivo `prisma/schema.prisma` que soporte todas las relaciones mencionadas (M-M entre usuarios y proyectos, enums de estados y roles). Posteriormente, diseña la Landing Page moderna en `app/page.tsx`."

## 8. Seguridad y Protección de Datos
### A. Autenticación y Autorización
- **Validación de Sesión:** Todas las API Routes en `/api/` deben verificar la sesión de Clerk antes de procesar cualquier lógica.
- **RBAC Estricto:** Implementar un middleware de protección que verifique el rol del usuario (`ADMIN`, `TECH_LEAD`, `USER`) antes de permitir el acceso a rutas específicas.
- **Row Level Security (RLS):** Si se utiliza Supabase, activar RLS para asegurar que un usuario solo pueda leer/escribir reportes de los proyectos a los que pertenece.

### B. Validación de Entrada y Tipado
- **Zod Schemas:** Usar la librería **Zod** para validar el esquema de todos los `JSON` recibidos en las API Routes. Si la validación falla, retornar un error `400 Bad Request` antes de llegar al Service.
- **Sanitización para IA:** Antes de enviar los reportes a la API de Gemini, limpiar el texto de cualquier dato sensible o credenciales que accidentalmente un usuario pudiera haber pegado en su daily.

### C. Manejo de Secretos
- **Variables de Entorno:** Nunca hardcodear claves. Usar `.env.local` para desarrollo en Kubuntu y la interfaz de Vercel para producción.
- **Cifrado de IDs:** No exponer IDs secuenciales de la base de datos en las URLs; utilizar `cuid()` o `uuid()` (ya definidos en Prisma) para evitar ataques de enumeración.

## 9. Buenas Prácticas de Desarrollo
### A. Clean Code & Arquitectura
- **Separación de Intereses:** El archivo de ruta (`route.ts`) solo debe manejar la extracción de datos y la respuesta HTTP. Toda la lógica de negocio debe estar en los servicios de `/lib/services/`.
- **Tipos Globales:** Definir interfaces compartidas para los Roles y Estados de Proyecto para asegurar consistencia entre el Frontend y el Backend.

### B. Error Handling
- **Estandarización:** Crear una clase de error personalizada o un helper para retornar errores consistentes (ej: `{ error: string, code: number }`).
- **Logging:** Implementar logs básicos en el servidor para rastrear fallos en el envío de mails o en la generación de resúmenes por IA.

### C. Performance (Next.js 15)
- **Caching:** Usar `unstable_cache` de Next.js para el dashboard macro del Administrador, evitando consultas pesadas a la base de datos en cada recarga.
- **Optimización de Imágenes:** Usar el componente `<Image />` de Next.js para los avatares de usuario traídos desde la cuenta de Google.
