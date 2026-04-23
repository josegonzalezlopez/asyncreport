#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: bash template/scripts/scaffold.sh /ruta/proyecto-destino"
  exit 1
fi

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILES_ROOT="$SOURCE_ROOT/files"
TARGET_ROOT="$1"

if [[ ! -d "$TARGET_ROOT" ]]; then
  echo "Directorio destino no existe: $TARGET_ROOT"
  exit 1
fi

if [[ ! -d "$FILES_ROOT" ]]; then
  echo "No existe carpeta de archivos template: $FILES_ROOT"
  exit 1
fi

copy_file() {
  local rel="$1"
  local src="$FILES_ROOT/$rel"
  local dst="$TARGET_ROOT/$rel"
  local dst_dir
  dst_dir="$(dirname "$dst")"
  mkdir -p "$dst_dir"

  if [[ -f "$dst" ]]; then
    cp "$dst" "$dst.bak.template"
    echo "Backup creado: $dst.bak.template"
  fi

  cp "$src" "$dst"
  echo "Copiado: $rel"
}

while IFS= read -r -d '' file; do
  rel="${file#$FILES_ROOT/}"
  copy_file "$rel"
done < <(find "$FILES_ROOT" -type f -print0)

if [[ -f "$TARGET_ROOT/.githooks/pre-push" ]]; then
  chmod +x "$TARGET_ROOT/.githooks/pre-push"
fi
if [[ -f "$TARGET_ROOT/scripts/local-quality/install-git-hooks.sh" ]]; then
  chmod +x "$TARGET_ROOT/scripts/local-quality/install-git-hooks.sh"
fi
if [[ -f "$TARGET_ROOT/scripts/local-quality/run-prepush-gates.sh" ]]; then
  chmod +x "$TARGET_ROOT/scripts/local-quality/run-prepush-gates.sh"
fi

echo ""
echo "Template aplicado en: $TARGET_ROOT"
echo "Siguiente paso recomendado:"
echo "  1) Revisar package.json scripts"
echo "  2) npm run local:hooks:install"
echo "  3) npm run local:prepush"
