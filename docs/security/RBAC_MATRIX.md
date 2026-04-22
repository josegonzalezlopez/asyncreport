# RBAC Matrix (Borde + API)

Esta matriz define el control de acceso esperado en el guard de borde (`proxy.ts`) y su respaldo en API Routes.

## Roles

- `ADMIN`: acceso total a gestion y operaciones globales.
- `TECH_LEAD`: acceso de liderazgo tecnico y resumenes IA.
- `USER`: acceso de miembro a funcionalidades de reporte y vistas personales.

## Reglas en `proxy.ts` (Edge RBAC)

| Ruta / Patron | USER | TECH_LEAD | ADMIN | Notas |
|---|---|---|---|---|
| `/dashboard/admin/**` | 403 | 403 | 200 | Admin-only |
| `/api/projects/**` | 403 | 403 | 200 | Admin-only |
| `/api/users/**` | 403 | 403 | 200 | Admin-only |
| `/dashboard/team/**` | 403 | 200 | 200 | TL/Admin |
| `/dashboard/ai-summary/**` | 403 | 200 | 200 | TL/Admin |
| `/dashboard/p/:projectId/team/**` | 403 | 200 | 200 | TL/Admin |
| `/dashboard/p/:projectId/ai-summary/**` | 403 | 200 | 200 | TL/Admin |
| `/api/ai-summary/**` | 403 | 200 | 200 | TL/Admin |
| Rutas publicas (`/`, `/sign-*`, `/api/webhooks/**`, `/api/health`) | 200 | 200 | 200 | Sin auth requerida |

## Integracion con API key

- El header `x-api-key` solo evita `auth.protect()` para rutas `/api/**`.
- Nunca permite bypass para rutas `/dashboard/**`.
- Las API Routes mantienen validacion explicita via `getAuthContext()` + `requireRole()`.

## Criterios de verificacion

- Sin auth, `/api/projects` debe responder `401` o `403` (nunca `200`).
- Con API key de `USER` o `TECH_LEAD`, `/api/projects` debe responder `403`.
- Con API key de `ADMIN`, `/api/projects` debe responder `200`.
- Con API key de `TECH_LEAD`, `/api/ai-summary` debe pasar RBAC (normalmente `200` o `400` por payload).
