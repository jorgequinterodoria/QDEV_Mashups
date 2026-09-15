# PHASE 27 — Release 1.0

## Objetivo

Cerrar el producto para publicación como **QDEV Mashups 1.0.0**, congelando funcionalidad, documentación, QA y artefacto distribuible.

El roadmap define Phase 27 con cinco bloques: freeze funcional, documentación, QA final, build release, instalación y checklist de publicación.

## Contrato de Release 1.0

- Producto: `QDEV Mashups`
- Versión: `1.0.0`
- Plataforma principal validada: macOS Apple Silicon `arm64`
- Idioma contractual: `es-CO`
- Stems oficiales y únicos: `vocals`, `drums`, `bass`, `other`
- Formato distribuible validado: `.dmg`
- Separación y worker: MLX-Demucs, sin cambiar el contrato de cuatro stems.

## Freeze funcional

Desde el inicio del cierre 1.0 no se incorporan nuevas funciones no previstas en el roadmap. Solo se aceptan correcciones necesarias para superar las validaciones de Release 1.0.

La versión de `package.json` debe quedar fijada en `1.0.0` antes del build release. El nombre del paquete npm puede mantenerse técnico; el nombre comercial debe ser `QDEV Mashups` mediante `build.productName`.

## Documentación mínima

Antes del cierre deben estar revisados:

1. documentación de configuración;
2. documentación de QA;
3. documentación de packaging macOS;
4. guía/checklist de publicación 1.0;
5. instrucciones de instalación y primer arranque.

## QA final

La validación obligatoria conserva el contrato del proyecto:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Después debe ejecutarse el packaging macOS y la comprobación final del artefacto.

## Build release

El artefacto debe corresponder a `1.0.0` y estar generado para `arm64`. El nombre comercial se toma de `build.productName`.

Comandos recomendados:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:packaging
pnpm exec electron-builder --mac dmg
node scripts/check-release-1.0.mjs
```

## Instalación

La validación de instalación debe realizarse en un Mac Apple Silicon, preferiblemente en un entorno limpio o en un usuario de prueba.

Comprobar:

- apertura de la aplicación;
- carga del renderer;
- comunicación Electron/preload;
- acceso a la biblioteca;
- ejecución de análisis;
- disponibilidad del worker de stems;
- persistencia de configuración;
- creación de previews/mashups;
- flujo DJ;
- cierre y reapertura sin corrupción.

## Criterio de cierre

Phase 27 solo puede marcarse como completa cuando:

- la versión `1.0.0` está congelada;
- la documentación está revisada;
- typecheck, lint, test y build están verdes;
- el DMG `1.0.0` fue creado;
- el checklist técnico de Release 1.0 es correcto;
- la instalación/primer arranque fue validada;
- no quedan fallos conocidos de severidad de lanzamiento.

## Estado

**EN IMPLEMENTACIÓN — NO CERRAR HASTA VALIDACIÓN FINAL.**
