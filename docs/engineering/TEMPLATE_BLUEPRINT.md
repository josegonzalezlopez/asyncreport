# Template Blueprint (Multi-product)

Blueprint reusable para arrancar nuevos productos con calidad consistente, costo controlado y flujo IA-augmented.

## Objetivo

- Reducir tiempo de setup por proyecto.
- Estandarizar seguridad, testing y entrega.
- Permitir operar en modo `zero-cost` o escalar a CI completo sin refactor grande.

## Perfiles de adopcion

### 1) Lite (costo cero)

- Workflows solo manuales (`workflow_dispatch`).
- Validacion obligatoria local con hook `pre-push`.
- Triage local de fallos con heuristica + Ollama opcional.

### 2) Standard (equipo pequeño)

- CI automatico en PR: `lint`, `test`, `build`, `e2e smoke`.
- Security scans no bloqueantes en `main`.
- Artifact de reportes para debugging rapido.

### 3) Scale (release-driven)

- CI PR + nightly full E2E.
- Reglas mas estrictas en `release/*` (por ejemplo, dependencia `high/critical` bloqueante).
- Runbooks, observabilidad y politicas de incidentes.

## Bloques que deben venir en la plantilla

### A. Arquitectura y backend

- `app/api/**/route.ts` para endpoints (sin server actions).
- `lib/services/**` para logica de negocio (service pattern).
- `lib/helpers/auth*` para auth y RBAC centralizados.
- Esquemas Zod por endpoint para request/response.

### B. Seguridad

- Matriz RBAC base (`docs/security/RBAC_MATRIX.md`).
- Checklist de auditoria de servicios sensibles.
- Validacion uniforme de session + rol antes de logica critica.
- Politica de manejo de secretos (`.env*` fuera de git).

### C. Datos y seed

- `prisma/schema.prisma` con convenciones base.
- `prisma/seed.ts` reproducible (datos deterministicos QA).
- Script de bootstrap E2E env desde seed (ej. `scripts/e2e/generate-ci-env.mjs`).

### D. Testing

- `vitest` para unit/integration.
- `playwright` para e2e con bandas:
  - `quick`
  - `api/ci`
  - `full`
- Preflight de entorno E2E (`tests/e2e/utils/preflight*`).
- Escenarios documentados (`docs/TEST_SCENARIOS.md`).

### E. Calidad local (sin costo)

- `.githooks/pre-push` versionado.
- `scripts/local-quality/install-git-hooks.sh`
- `scripts/local-quality/run-prepush-gates.sh`
- `scripts/local-quality/triage-local-failure.mjs`
- Reportes locales en `reports/local-quality/`.

### F. CI y seguridad de dependencias

- Workflow CI principal con dual-mode:
  - modo manual (`zero-cost`)
  - modo automatico PR/nightly (`paid-mode`)
- Workflow de dependency audit con politica por rama.
- Workflow de checks de seguridad especificos (ej. Supabase/RLS).

### G. IA-augmented

- Abstraccion de proveedor IA (`AI_PROVIDER=ollama|gemini`).
- Triage de fallos:
  - heuristico deterministico
  - enriquecimiento opcional con modelo local (Ollama).
- Prompt templates versionados para tasks repetitivas (QA, seguridad, release).

## Estructura recomendada

```text
.githooks/
  pre-push
.github/workflows/
  ci.yml
  e2e-nightly-full.yml
  dependency-security.yml
scripts/
  local-quality/
    install-git-hooks.sh
    run-prepush-gates.sh
    triage-local-failure.mjs
  e2e/
    check-env.mjs
    generate-ci-env.mjs
    seed-e2e-db.ts
docs/
  engineering/
    CI_QUALITY_GATES.md
    TEMPLATE_BLUEPRINT.md
  security/
    RBAC_MATRIX.md
  TESTING_SETUP.md
  E2E_INTEGRATION.md
  TEST_SCENARIOS.md
```

## Scripts npm minimos

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "test": "vitest run",
    "test:e2e:ci": "tsx tests/e2e/utils/preflight-api.ts && PW_RUN_WEB_E2E=1 playwright test tests/e2e/api tests/e2e/web/public-routes.spec.ts tests/e2e/cli",
    "local:hooks:install": "bash scripts/local-quality/install-git-hooks.sh",
    "local:prepush": "bash scripts/local-quality/run-prepush-gates.sh",
    "local:triage": "node scripts/local-quality/triage-local-failure.mjs"
  }
}
```

## Checklist de adopcion por nuevo proyecto (60 minutos)

- [ ] Copiar estructura base (`.githooks`, `scripts`, `docs`, workflows).
- [ ] Configurar dependencias (`eslint`, `vitest`, `playwright`, `zod`, ORM).
- [ ] Ajustar seed y preflight a dominio real.
- [ ] Instalar hook local: `npm run local:hooks:install`.
- [ ] Verificar flujo local completo:
  - [ ] `npm run lint`
  - [ ] `npm test`
  - [ ] `npm run test:e2e:ci`
- [ ] Definir perfil inicial: `lite` (recomendado) o `standard`.
- [ ] Documentar secretos requeridos y runbook de fallos.

## Roadmap de evolucion recomendado

1. Arrancar en `lite` para validar producto sin costo.
2. Migrar a `standard` cuando haya colaboracion activa por PR.
3. Pasar a `scale` al tener release cadence y SLA.

## Regla de oro

Todo control nuevo debe tener dos modos:

- `modo local-costo-cero` (siempre disponible).
- `modo CI-automatica` (activable cuando el negocio lo justifique).
