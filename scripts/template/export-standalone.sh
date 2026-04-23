#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-/home/jose/workspace/engineering-starter-template}"
SRC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEMPLATE_ROOT="$SRC_ROOT/template"

if [[ ! -d "$TEMPLATE_ROOT/files" ]]; then
  echo "No existe $TEMPLATE_ROOT/files"
  exit 1
fi

mkdir -p "$DEST"
mkdir -p "$DEST/.githooks" "$DEST/scripts/local-quality" "$DEST/docs/engineering" "$DEST/docs/security" "$DEST/docs"

cp "$TEMPLATE_ROOT/files/.githooks/pre-push" "$DEST/.githooks/pre-push"
cp "$TEMPLATE_ROOT/files/scripts/local-quality/install-git-hooks.sh" "$DEST/scripts/local-quality/install-git-hooks.sh"
cp "$TEMPLATE_ROOT/files/scripts/local-quality/run-prepush-gates.sh" "$DEST/scripts/local-quality/run-prepush-gates.sh"
cp "$TEMPLATE_ROOT/files/scripts/local-quality/triage-local-failure.mjs" "$DEST/scripts/local-quality/triage-local-failure.mjs"

cp "$TEMPLATE_ROOT/files/docs/engineering/CI_QUALITY_GATES.md" "$DEST/docs/engineering/CI_QUALITY_GATES.md"
cp "$TEMPLATE_ROOT/files/docs/engineering/PACKAGE_SCRIPTS_TEMPLATE.md" "$DEST/docs/engineering/PACKAGE_SCRIPTS_TEMPLATE.md"
cp "$TEMPLATE_ROOT/files/docs/security/RBAC_MATRIX.md" "$DEST/docs/security/RBAC_MATRIX.md"
cp "$TEMPLATE_ROOT/files/docs/TESTING_SETUP.md" "$DEST/docs/TESTING_SETUP.md"
cp "$TEMPLATE_ROOT/files/docs/E2E_INTEGRATION.md" "$DEST/docs/E2E_INTEGRATION.md"
cp "$TEMPLATE_ROOT/files/docs/TEST_SCENARIOS.md" "$DEST/docs/TEST_SCENARIOS.md"

cat > "$DEST/.gitignore" <<'EOF'
node_modules
dist
build
reports/local-quality
.env
.env.local
.env.e2e
EOF

cat > "$DEST/README.md" <<'EOF'
# Engineering Starter Template

Template base para nuevos productos con:

- quality gates locales (`pre-push`),
- triage de fallos con Ollama local opcional,
- documentación de testing/CI/RBAC.

## Arranque

1. Copiar scripts sugeridos desde `docs/engineering/PACKAGE_SCRIPTS_TEMPLATE.md` al `package.json` del proyecto.
2. Instalar hook:

```bash
npm run local:hooks:install
```

3. Validar gates:

```bash
npm run local:prepush
```
EOF

cat > "$DEST/bootstrap.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
chmod +x .githooks/pre-push scripts/local-quality/install-git-hooks.sh scripts/local-quality/run-prepush-gates.sh
echo "Template listo. Revisa docs/engineering/PACKAGE_SCRIPTS_TEMPLATE.md y ejecuta npm run local:hooks:install"
EOF

chmod +x "$DEST/bootstrap.sh" "$DEST/.githooks/pre-push" "$DEST/scripts/local-quality/install-git-hooks.sh" "$DEST/scripts/local-quality/run-prepush-gates.sh"

if [[ ! -d "$DEST/.git" ]]; then
  git -C "$DEST" init >/dev/null 2>&1 || true
fi

echo "Standalone template exportado en: $DEST"
