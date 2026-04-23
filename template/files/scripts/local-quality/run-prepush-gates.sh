#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
LOG_DIR="$REPO_ROOT/reports/local-quality"
LOG_FILE="$LOG_DIR/prepush-latest.log"
SUMMARY_FILE="$LOG_DIR/prepush-summary.md"

mkdir -p "$LOG_DIR"

run_step() {
  local label="$1"
  local command="$2"

  echo ""
  echo "==> $label"
  if ! bash -lc "$command" 2>&1 | tee -a "$LOG_FILE"; then
    echo ""
    echo "Fallo en: $label"
    return 1
  fi
}

cat >"$LOG_FILE" <<EOF
# Local pre-push quality gates
# Fecha: $(date -Iseconds)
# Repo: $REPO_ROOT
EOF

echo "Iniciando quality gates locales..." | tee -a "$LOG_FILE"

if ! run_step "Lint" "npm run lint"; then
  npm run local:triage "$LOG_FILE" || true
  exit 1
fi

if ! run_step "Unit/Integration" "npm test"; then
  npm run local:triage "$LOG_FILE" || true
  exit 1
fi

if [[ "${LOCAL_GATES_SKIP_E2E:-0}" == "1" ]]; then
  echo "LOCAL_GATES_SKIP_E2E=1 detectado: se omite E2E." | tee -a "$LOG_FILE"
else
  if ! run_step "E2E smoke" "npm run test:e2e:ci"; then
    npm run local:triage "$LOG_FILE" || true
    exit 1
  fi
fi

cat >"$SUMMARY_FILE" <<EOF
## Local Quality Gates

- Resultado: OK
- Fecha: $(date -Iseconds)
- Log: \`reports/local-quality/prepush-latest.log\`
EOF

echo "Quality gates locales OK."
