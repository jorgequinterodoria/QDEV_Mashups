# PHASE 19 — Exportación DJ

## Objetivo

Crear un paquete de exportación DJ estable a partir de `MashupDjPrep`.

## Archivos

- `src/dj/export-package.ts`
- `src/dj/index.ts`
- `tests/dj/export-package.test.ts`

## Artefactos

Cada paquete contiene:

```text
<paquete>/
├── qdev-dj-manifest.json
├── qdev-cues.json
└── qdev-beatgrids.json
```

El audio final puede referenciarse mediante `audioPath`.

## Información exportada

- fingerprint del plan de mashup;
- BPM;
- duración;
- beatgrid;
- confianza;
- cues;
- rutas de origen;
- preview opcional;
- ruta opcional del audio final.

## Seguridad

- el nombre del paquete se sanea antes de formar la ruta;
- la ruta final se valida dentro de `outputRoot`;
- se puede impedir la sobrescritura;
- se valida el audio referenciado;
- no se modifica ninguna base privada de djay.

## Nota sobre traversal

Entradas como `../escape` no se aceptan literalmente como parte de la ruta. Se transforman a un nombre seguro (`..-escape`) y la salida final se valida dentro del directorio raíz.

## Compatibilidad

`qdev-dj-manifest.json` es un formato interno de QDEV Mashups. No se presenta como un formato propietario de djay.

## Criterio de cierre

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
