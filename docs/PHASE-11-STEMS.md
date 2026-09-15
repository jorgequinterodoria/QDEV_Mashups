# PHASE 11 — Motor profesional de separación de stems

## Contrato

QDEV Mashups separa exclusivamente cuatro canales:

- `vocals`
- `drums`
- `bass`
- `other`

No se admiten `guitar`, `piano` ni el modelo `htdemucs_6s`.

## Motor

El proveedor `MlxDemucsProvider` ya no depende del CLI `mlx-demucs`.

Electron/Node inicia un worker Python controlado por QDEV. El worker importa directamente:

- `mlx_demucs.utils.loader.load_model`
- MLX
- NumPy
- SoundFile

El procesamiento usa la segmentación del modelo y overlap-add, con progreso JSONL por segmento.

## Configuración

Variables opcionales:

```bash
export QDEV_STEMS_PYTHON="/ruta/al/.venv-stems/bin/python"
export QDEV_STEMS_WORKER="/ruta/al/proyecto/tools/mlx-demucs-worker.py"
```

Si no se especifican, el proveedor busca:

```text
<cwd>/.venv-stems/bin/python
<cwd>/tools/mlx-demucs-worker.py
```

## Modelo

El modelo de producción por defecto sigue siendo:

```text
htdemucs_ft
```

La prueba real permite seleccionar `htdemucs` temporalmente mediante:

```bash
export QDEV_STEMS_REAL_MODEL=htdemucs
```

Esto es útil para validar el pipeline sin esperar una separación completa del modelo fine-tuned.

## Seguridad operacional

- El destino de una separación es una carpeta de caché aislada.
- Nunca se recorre recursivamente el árbol para localizar stems.
- La cancelación mata el grupo de procesos en macOS/Linux.
- El worker emite progreso estructurado.
- Se rechazan explícitamente `guitar.wav` y `piano.wav`.
- Los WAV se validan por chunks RIFF/WAVE y no por una cabecera fija de 44 bytes.
- Se aceptan PCM y float WAV.

## Criterio de cierre

La fase solo se considera completada cuando el repositorio pasa:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

y una separación real mediante el worker directo produce exactamente cuatro stems válidos.
