# Catálogo de Escenarios de Prueba (AsyncReport)

Este catálogo enumera escenarios posibles por dominio. Úsalo como backlog vivo para CI.

## Convención de prioridad

- **P0**: bloquea release
- **P1**: crítico funcional
- **P2**: importante no crítica
- **P3**: nice-to-have / hardening

---

## 1) Auth, RBAC y Seguridad

- **P0** Clerk sesión válida permite acceso a dashboard.
- **P0** Sin sesión, rutas privadas redirigen a `/sign-in`.
- **P0** API privada sin credenciales retorna 401/redirect controlado.
- **P0** Middleware permite `X-API-Key` sin romper Clerk.
- **P0** API key inválida deniega acceso.
- **P0** API key revocada deniega acceso.
- **P1** API key expirada deniega acceso.
- **P1** `lastUsedAt` se actualiza al usar API key válida.
- **P0** `requireRole` bloquea rutas ADMIN/TECH_LEAD para USER.
- **P1** ADMIN conserva permisos en endpoints administrativos.
- **P1** TECH_LEAD acceso solo a features permitidas.
- **P2** Mensajes de error no filtran secretos ni stack traces.

## 2) Gestión de API Keys (Web)

- **P0** Crear API key devuelve token solo una vez.
- **P0** Token no se persiste en claro en DB (solo hash).
- **P1** Listado de keys por usuario autenticado.
- **P1** Revocación elimina acceso inmediato del CLI.
- **P2** Expiración opcional funciona (si se usa).
- **P2** UI de perfil muestra estado de keys y último uso.

## 3) CLI (login/report/status/projects/use-project)

- **P0** `login` con key válida autentica y guarda config.
- **P0** `login` con key inválida falla con mensaje claro.
- **P0** `report` envía payload válido (mood numérico 1..5).
- **P0** `report` bloquea payload inválido localmente (min chars, mood).
- **P0** `report` por código e id resuelve proyecto correcto.
- **P0** no miembro en proyecto retorna FORBIDDEN manejado.
- **P1** `status` usa proyecto default cuando existe.
- **P1** `use-project` guarda y limpia defaultProjectId.
- **P1** `projects` lista solo membresías reales.
- **P1** `--as-user` solo ADMIN (403 para resto).
- **P1** `--as-user` usuario destino inexistente retorna 404.
- **P2** comandos funcionan con override por env (`ASYNCREPORT_*`).
- **P2** salidas CLI mantienen formato estable (snapshot opcional).

## 4) Proyectos y Membresías

- **P0** crear proyecto (ADMIN) OK.
- **P1** editar proyecto respeta permisos.
- **P0** asignar miembro crea relación única.
- **P1** asignación repetida no duplica membership.
- **P1** asignar/quitar TECH_LEAD consistente.
- **P2** filtros/listados por estado.

## 5) Dailies

- **P0** crear daily válido por miembro.
- **P0** bloqueo por daily duplicado del mismo día/proyecto.
- **P0** no miembro no puede crear daily.
- **P1** timezone aplicada correctamente para ventana del día.
- **P1** blocker crea notificación a tech lead.
- **P2** historial por proyecto con paginación cursor.

## 6) IA Summary

- **P0** initiate summary crea estado `PENDING` y responde 202.
- **P1** transición `PENDING -> PROCESSING -> COMPLETED`.
- **P1** en fallo, estado `FAILED` + mensaje amigable.
- **P1** polling status responde consistentemente.
- **P1** rate limiting diario y por minuto gestionado.
- **P2** provider switch Gemini/Ollama sin cambios de contrato.
- **P2** sanitización de prompt remueve secretos.

## 7) Notificaciones y Email

- **P1** assignment genera notificación interna.
- **P1** blocker genera notificación interna.
- **P1** ai summary completed genera notificación interna.
- **P1** unread-count correcto con polling.
- **P1** mark-one / mark-all.
- **P2** email assignment enviado fuera de transacción.
- **P2** email blocker enviado fuera de transacción.
- **P2** override dev `RESEND_DEV_OVERRIDE_TO` aplicado.

## 8) Perfil de Usuario

- **P1** GET `/api/users/me` retorna perfil + memberships.
- **P1** PATCH `/api/users/me` actualiza nombre/especialización.
- **P0** PATCH no permite escalar `role`.
- **P2** render avatar remoto permitido por next/image.

## 9) Web UX / Navegación

- **P1** rutas sidebar según rol.
- **P1** rutas protegidas redirigen correctamente.
- **P2** NotificationBell accesible (DialogTitle).
- **P2** contraste y theming consistentes (incluye Clerk UserButton).

## 10) Resiliencia técnica

- **P1** manejo consistente de errores API (`error`, `code`, `details`).
- **P1** no hay race conditions en tx críticas.
- **P2** logs útiles sin data sensible.
- **P2** performance base en páginas dashboard (TTFB/latencia).

---

## Matriz mínima recomendada para CI (primer release)

- **PR quick gate**
  - `npm test`
  - `npm run test:e2e -- tests/e2e/api/health.spec.ts tests/e2e/web/public-routes.spec.ts`

- **Nightly / main**
  - `npm test`
  - `npm run test:e2e`
  - (opcional) pruebas CLI integradas con `E2E_API_KEY` real de entorno QA.
