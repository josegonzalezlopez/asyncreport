#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SOURCE="$REPO_ROOT/.githooks/pre-push"
HOOK_TARGET="$REPO_ROOT/.git/hooks/pre-push"

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "No se encontro .git en $REPO_ROOT"
  exit 1
fi

if [[ ! -f "$HOOK_SOURCE" ]]; then
  echo "No existe hook fuente: $HOOK_SOURCE"
  exit 1
fi

mkdir -p "$REPO_ROOT/.git/hooks"
cp "$HOOK_SOURCE" "$HOOK_TARGET"
chmod +x "$HOOK_TARGET"
chmod +x "$HOOK_SOURCE"

echo "Hook instalado en: $HOOK_TARGET"
echo "Para omitir temporalmente: SKIP_LOCAL_GATES=1 git push"
