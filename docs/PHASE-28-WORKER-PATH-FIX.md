# Phase 28 — Corrección de resolución del worker MLX-Demucs

## Problema

Durante `pnpm desktop`, Electron expone `process.resourcesPath` apuntando al `Electron.app` de desarrollo de `node_modules`. Ese directorio no contiene los recursos `extraResources` del packaging y, por tanto, no puede usarse como primera ruta válida del worker en desarrollo.

## Corrección

La resolución del proveedor ahora:

- respeta primero `QDEV_STEMS_WORKER` y `QDEV_STEMS_PYTHON` cuando están definidos;
- en desarrollo, selecciona la primera ruta existente en el proyecto (`tools/mlx-demucs-worker.py` y `.venv-stems/bin/python`);
- en una aplicación empaquetada, puede usar `process.resourcesPath` cuando los recursos realmente existen allí;
- evita elegir una ruta inexistente solo porque `process.resourcesPath` esté definido.

Se mantiene el contrato de cuatro stems: `vocals`, `drums`, `bass`, `other`.
