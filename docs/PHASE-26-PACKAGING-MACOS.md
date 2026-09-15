# PHASE 26 — Packaging macOS

## Objetivo

Preparar la aplicación Electron para distribución en macOS Apple Silicon, conservando el runtime Electron existente, incluyendo el worker de MLX-Demucs y evitando empaquetar entornos de desarrollo o secretos.

El roadmap define para esta fase:

- aplicación distribuible;
- runtime;
- dependencias MLX;
- worker Python;
- recursos;
- firma/notarización según necesidad.

## Configuración

`electron-builder.yml` define:

- `appId`: `com.qdev.mashups`;
- producto: `QDEV Mashups`;
- salida en `release/`;
- artefacto DMG;
- categoría musical;
- `asar`;
- runtime endurecido;
- exclusión de mapas y tests/docs;
- exclusión explícita de `.venv-stems`;
- inclusión del worker Python como recurso externo.

## MLX-Demucs

El proyecto ya utiliza:

```text
tools/mlx-demucs-worker.py
.venv-stems/bin/python
```

La configuración de packaging **no copia el entorno virtual de desarrollo**. Esto evita congelar rutas absolutas de una máquina concreta.

El worker Python se empaqueta como recurso. La resolución del intérprete y de las dependencias MLX debe hacerse mediante el runtime de producción correspondiente antes del release definitivo.

## Verificaciones

Antes de empaquetar:

```bash
node scripts/install-packaging-scripts.mjs
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:packaging
```

Packaging local:

```bash
pnpm exec electron-builder --mac dmg
```

Después:

```bash
pnpm check:release-bundle
```

## Firma y notarización

La fase deja habilitada la infraestructura de hardened runtime. La identidad de firma, equipo Apple, credenciales de notarización y certificados no se almacenan en el repositorio.

La firma y notarización quedan condicionadas a disponer de las credenciales reales de distribución.

## Regla de seguridad

Nunca introducir en el paquete:

```text
.env
.env.local
.env.production
claves privadas
tokens
credenciales
.venv-stems completo
```

## Estado

PHASE 26: **implementación entregada; pendiente únicamente de la validación final del bundle local**.
