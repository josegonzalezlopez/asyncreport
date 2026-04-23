# AsyncReport Engineering Template

Plantilla operativa para nuevos productos con enfoque:

- costo cero inicial (local-first),
- calidad consistente,
- evolucion a CI automatizada cuando el negocio lo permita.

## Contenido

- `template/files/` -> archivos listos para copiar al proyecto destino.
- `template/scripts/scaffold.sh` -> script para aplicar plantilla en un repo.

## Uso rapido

Desde el repo que contiene la plantilla:

```bash
bash template/scripts/scaffold.sh /ruta/al/nuevo-proyecto
```

Luego, en el proyecto destino:

```bash
npm run local:hooks:install
```

Y antes de push:

```bash
npm run local:prepush
```

## Nota

Esta plantilla no pisa archivos existentes sin backup: hace merge conservador y crea directorios faltantes.
El pre-push corre `lint + test + e2e full`; el triage con Ollama es manual/opcional.
