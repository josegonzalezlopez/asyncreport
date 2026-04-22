#!/usr/bin/env bash
set -euo pipefail

# Sincroniza labels, milestones e issues P0/P1 sin duplicar por titulo.

label_exists() {
  local name="$1"
  [ "$(gh label list --limit 300 --json name --jq "any(.[]; .name == \"$name\")")" = "true" ]
}

ensure_label() {
  local name="$1"
  local color="$2"
  local desc="$3"

  if label_exists "$name"; then
    echo "Label existente: $name"
  else
    gh label create "$name" --color "$color" --description "$desc" >/dev/null
    echo "Label creado: $name"
  fi
}

get_milestone_number_exact() {
  local title="$1"
  gh api repos/{owner}/{repo}/milestones --paginate \
    --jq ".[] | select(.title==\"$title\") | .number" | head -n 1
}

ensure_milestone() {
  local title="$1"
  local description="$2"
  local due_on="$3"

  local ms
  ms="$(get_milestone_number_exact "$title")"
  if [ -n "${ms:-}" ]; then
    echo "Milestone existente: $title (#$ms)"
  else
    gh api repos/{owner}/{repo}/milestones \
      -f title="$title" \
      -f description="$description" \
      -f due_on="$due_on" >/dev/null
    ms="$(get_milestone_number_exact "$title")"
    echo "Milestone creado: $title (#$ms)"
  fi
}

find_issue_number_exact_title() {
  local title="$1"
  gh issue list --state all --limit 500 --search "$title in:title" --json number,title \
    --jq ".[] | select(.title == \"$title\") | .number" | head -n 1
}

set_issue_milestone() {
  local issue_number="$1"
  local milestone_number="$2"
  gh api "repos/{owner}/{repo}/issues/$issue_number" \
    -X PATCH \
    -F milestone="$milestone_number" >/dev/null
}

create_or_update_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"
  local milestone_title="$4"

  local issue_num
  issue_num="$(find_issue_number_exact_title "$title")"

  local ms_num
  ms_num="$(get_milestone_number_exact "$milestone_title")"
  if [ -z "${ms_num:-}" ]; then
    echo "ERROR: milestone no encontrado: $milestone_title"
    return 1
  fi

  if [ -n "${issue_num:-}" ]; then
    echo "Issue existente #$issue_num -> $title"
    gh issue edit "$issue_num" --add-label "$labels" >/dev/null
    set_issue_milestone "$issue_num" "$ms_num"
    echo "Issue actualizado #$issue_num (labels + milestone)"
  else
    local created_url
    created_url="$(gh issue create --title "$title" --label "$labels" --body "$body")"
    issue_num="$(gh issue view "$created_url" --json number --jq .number)"
    set_issue_milestone "$issue_num" "$ms_num"
    echo "Issue creado #$issue_num -> $title"
  fi
}

ensure_label "priority:P0" "B60205" "Trabajo critico del sprint"
ensure_label "priority:P1" "FBCA04" "Trabajo importante no critico"

ensure_label "security" "D93F0B" "Seguridad"
ensure_label "auth" "5319E7" "Autenticacion y autorizacion"
ensure_label "backend" "0E8A16" "Backend"
ensure_label "data-access" "1D76DB" "Acceso a datos"
ensure_label "devops" "0052CC" "DevOps"
ensure_label "quality" "006B75" "Calidad"
ensure_label "ci" "0E8A16" "Integracion continua"
ensure_label "testing" "C5DEF5" "Testing"
ensure_label "e2e" "BFD4F2" "End-to-end"
ensure_label "qa" "C2E0C6" "Quality Assurance"
ensure_label "ops" "F9D0C4" "Operaciones"
ensure_label "configuration" "FBCA04" "Configuracion"
ensure_label "frontend" "1D76DB" "Frontend"
ensure_label "ux" "FAD8C7" "Experiencia de usuario"
ensure_label "profile" "E99695" "Perfil de usuario"
ensure_label "ai" "5319E7" "Inteligencia Artificial"
ensure_label "reliability" "BFDADC" "Confiabilidad"
ensure_label "performance" "C2E0C6" "Rendimiento"
ensure_label "platform" "0052CC" "Plataforma"
ensure_label "release" "D4C5F9" "Release"

ensure_milestone \
  "Sprint Hardening (P0)" \
  "Seguridad, CI y reconciliacion de testing para dejar base merge-ready." \
  "2026-05-15T23:59:59Z"

ensure_milestone \
  "Sprint Release Readiness (P1)" \
  "Cierre funcional pendiente y validacion de performance/release." \
  "2026-05-29T23:59:59Z"

create_or_update_issue \
  "sec: P0 auditar RBAC en proxy/middleware y matcher de rutas" \
  "priority:P0,security,auth,backend" \
"Objetivo: garantizar que rutas protegidas bloqueen acceso por rol de forma consistente usando claims de Clerk.

## DoD
- [ ] Matriz de rutas vs roles documentada.
- [ ] Middleware usa claims con fallback seguro si faltan.
- [ ] Matcher cubre todas las rutas sensibles.
- [ ] Tests de integracion (no auth / rol insuficiente / rol correcto).
- [ ] Ninguna ruta sensible accesible sin validacion de rol." \
  "Sprint Hardening (P0)"

create_or_update_issue \
  "sec: P0 auditar servicios sensibles para evitar fuga cross-tenant" \
  "priority:P0,security,backend,data-access" \
"Objetivo: revisar servicios y APIs de DailyReport, Notification y ProjectUser para asegurar filtrado por contexto autenticado.

## DoD
- [ ] Inventario de metodos sensibles.
- [ ] Todas las queries sensibles filtran por dbUserId/projectId.
- [ ] No hay retornos fuera del scope usuario/proyecto.
- [ ] Tests negativos: usuario A no accede a datos de B.
- [ ] Documento de auditoria actualizado." \
  "Sprint Hardening (P0)"

create_or_update_issue \
  "chore: P0 implementar quality gates de CI (lint/test/build)" \
  "priority:P0,devops,quality,ci" \
"Objetivo: bloquear merges no desplegables con CI obligatorio en PR.

## DoD
- [ ] Workflow CI en PR.
- [ ] Jobs: lint, test, build.
- [ ] Branch protection exige CI verde.
- [ ] Cache de dependencias configurado.
- [ ] Documentacion de quality gates actualizada." \
  "Sprint Hardening (P0)"

create_or_update_issue \
  "test: P0 reconciliar suite E2E con flujos criticos reales" \
  "priority:P0,testing,e2e,qa" \
"Objetivo: alinear tests/e2e y scripts con el estado real del producto.

## DoD
- [ ] E2E: login+onboarding.
- [ ] E2E: admin crea/asigna proyecto.
- [ ] E2E: daily con blocker.
- [ ] E2E: resumen IA (happy path + fallo controlado).
- [ ] Scripts/documentacion E2E actualizados.
- [ ] Suite estable en CI (sin flakes criticos)." \
  "Sprint Hardening (P0)"

create_or_update_issue \
  "sec: P0 hardening de secretos y configuracion de entornos" \
  "priority:P0,security,ops,configuration" \
"Objetivo: prevenir exposicion de credenciales y drift de configuracion.

## DoD
- [ ] Escaneo de secretos sin hallazgos criticos.
- [ ] .gitignore cubre archivos sensibles.
- [ ] Checklist env vars dev/preview/prod completo.
- [ ] Documento de control actualizado." \
  "Sprint Hardening (P0)"

create_or_update_issue \
  "task: P1 completar perfil/configuracion de usuario (FRONT-07)" \
  "priority:P1,frontend,ux,profile" \
"Objetivo: cerrar pantalla de perfil con edicion y persistencia robusta.

## DoD
- [ ] Nombre y especializacion editables con validacion.
- [ ] Email readonly.
- [ ] Proyectos y rol por proyecto visibles.
- [ ] Historial reciente de dailies visible.
- [ ] Tests UI/integracion del flujo de guardado." \
  "Sprint Release Readiness (P1)"

create_or_update_issue \
  "sec: P1 robustez IA con rate limiting y manejo de timeout" \
  "priority:P1,ai,backend,reliability" \
"Objetivo: endurecer generacion IA ante carga y fallos del proveedor.

## DoD
- [ ] Rate limiting configurable por ventana.
- [ ] Timeout/fallback controlado.
- [ ] Idempotencia basica en reintentos.
- [ ] Logs/observabilidad de intentos y fallos.
- [ ] Tests de servicio para limites y errores." \
  "Sprint Release Readiness (P1)"

create_or_update_issue \
  "chore: P1 ejecutar optimizaciones pre-produccion (PERF-01)" \
  "priority:P1,performance,frontend,platform" \
"Objetivo: aplicar optimizaciones de imagen, cache y revision final de seguridad.

## DoD
- [ ] Sin tags img nativas en areas criticas.
- [ ] next.config con dominios correctos.
- [ ] Estrategia de cache validada por tipo de pagina.
- [ ] Revision final de seguridad completada." \
  "Sprint Release Readiness (P1)"

create_or_update_issue \
  "chore: P1 verificacion final de release en Vercel (PERF-02)" \
  "priority:P1,release,devops,qa" \
"Objetivo: validar despliegue productivo con smoke checks post-release.

## DoD
- [ ] Build/deploy exitosos.
- [ ] Migraciones aplicadas correctamente.
- [ ] Smoke E2E post-deploy en verde.
- [ ] Sin errores 500 criticos en logs." \
  "Sprint Release Readiness (P1)"

echo "Listo: labels, milestones e issues sincronizados sin duplicados."
