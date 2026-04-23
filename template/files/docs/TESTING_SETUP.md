# Testing Setup (Template)

## Capas

- Unit/Integration: `npm test`
- E2E smoke: `npm run test:e2e:ci`
- E2E full: `npm run test:e2e:full`

## Flujo local recomendado

```bash
npm run local:hooks:install
npm run lint
npm test
npm run test:e2e:ci
```

## Nota

El hook `pre-push` ejecuta este flujo automaticamente y usa `test:e2e:full` como gate por defecto.
