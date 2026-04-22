# Auditoría P0-02 — Aislamiento (Daily / Notification / ProjectUser)

Fecha: 2026-04-22. Complementa `RBAC_MATRIX.md` (borde) con reglas a nivel **servicio + API**.

## Hallazgo corregido (crítico)

| Ruta / problema | Riesgo | Mitigación |
|----------------|--------|------------|
| `GET /api/daily-reports?projectId=` | Cualquier usuario autenticado podía listar dailies de un proyecto sin ser miembro. | `assertCanReadProject` antes de `dailyService.findByProject`. |
| `GET /api/projects/[id]` | Detalle y miembros visibles con solo `getAuthContext` (mitigado en borde para `/api/projects/*` en parte). | `assertCanReadProject` (ADMIN o miembro) para defensa en profundidad. |
| `POST/GET /api/ai-summary` | TL/Admin podía pasar `projectId` de un proyecto sin ser TL de ese proyecto. | `assertCanAccessAISummaryProject` (misma lógica que la página de IA). |
| `GET /api/ai-summary/status/[id]` | Polling de estado de un resumen ajeno. | Carga de `projectId` del resumen + `assertCanViewAISummaryRecord`. |

## Verificación por servicio

| Servicio | Regla |
|----------|--------|
| `daily.service` | `create` / `canUserReport` con `userId` y membership; `findByProject` solo vía API tras comprobar acceso. |
| `notification.service` | `findByUser` / `markAsRead` / `countUnread` con `userId` del contexto; `markAsRead` verifica `notification.userId`. |
| `project.service` | `findAll`/CRUD admin; `findProjectsForUser` con rol; `isMember` usado en helpers de acceso. |

## Pruebas

- `__tests__/helpers/project-access.test.ts` — reglas de `assertCanReadProject` y `assertCanAccessAISummaryProject`.

## IA / automatización

Un agente puede diffs en `app/api/**` y avisar si una ruta nueva lee `projectId` sin `assertCanReadProject` o equivalente.
