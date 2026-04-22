# CI — Quality gates (P0-10)

## Workflow

- Fichero: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- Disparo: `push` y `pull_request` a `main` y `release/**`, y manual (`workflow_dispatch`).

## Jobs (todos deben pasar)

| Job    | Comando        |
|--------|----------------|
| `lint` | `npx prisma generate` → `npm run lint` |
| `test` | `npx prisma generate` → `npm test`   |
| `build`| `npx prisma generate` → `npm run build`|

Cada job hace `npm ci` y cache de dependencias (Node 20, alineado con el resto de workflows).

## Variables de entorno en CI

Se definen en el propio workflow (`env` a nivel de workflow) con valores **placeholder** suficientes para compilar: base de datos ficticia, claves Clerk en formato de test, etc. **No** uses secretos reales en YAML.

## Proteger la rama `main`

1. En GitHub: **Settings** → **Branches** → regla para `main`.
2. Marca **Require status checks to pass** y exige al menos: `lint`, `test`, `build` (nombres de job del workflow CI).

## IA / automatización

Puedes añadir un comentario en PR si falla solo un job, o un resumen vía `actions/github-script`; el workflow actual no comenta (fail rápido en la pestaña Checks).
