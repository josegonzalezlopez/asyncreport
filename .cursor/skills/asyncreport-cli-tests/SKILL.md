---
name: asyncreport-cli-tests
description: >-
  Ejecutar y mantener pruebas automatizadas del CLI de AsyncReport (cli/).
  Usar cuando se modifique cli/, proxy/middleware de API keys, o rutas usadas
  por el CLI (/api/daily, /api/projects/my, autenticación X-API-Key).
---

# Pruebas automatizadas del CLI (AsyncReport)

## Qué cubre

- `__tests__/cli/projects.test.ts`: resolución por id/código, orden, `fetchMyProjects`, formateo.
- `__tests__/cli/http.test.ts`: cliente HTTP (`createHttpClient`), errores JSON/HTML, detalles de validación.

## Comandos

```bash
npm run test:cli    # solo CLI
npm test            # suite completa (incluye CLI)
```

## Tras cambios en el CLI

1. Ejecutar `npm run test:cli`.
2. Si falla, revisar `cli/utils/projects.ts` y `cli/utils/http.ts` primero.
3. Si cambia el contrato de la API (`/api/daily`, `/api/projects/my`), actualizar mocks en tests o añadir casos.

## Tras cambios en auth

- `proxy.ts`: rutas con `X-API-Key` deben hacer `NextResponse.next()` antes de `auth.protect()`.
- Regresión típica: CLI recibe HTML en vez de JSON → ampliar test de `http.test.ts` si aplica.

## IA / agente

Al implementar nuevos comandos en `cli/commands/`, extraer lógica pura a `cli/utils/` y cubrirla con Vitest; mantener comandos delgados (I/O + orquestación).
