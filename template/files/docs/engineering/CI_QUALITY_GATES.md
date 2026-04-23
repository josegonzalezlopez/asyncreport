# CI Quality Gates (Template)

## Modos

- `zero-cost`: solo `workflow_dispatch`.
- `paid-mode`: PR + push + nightly.

## Gates sugeridos

1. `lint`
2. `test`
3. `build`
4. `e2e smoke` (PR)
5. `e2e full` (nightly/release)

## Politica recomendada

- Main: warning-only en seguridad de dependencias.
- Release: bloquear en vulnerabilidades runtime `high/critical`.
