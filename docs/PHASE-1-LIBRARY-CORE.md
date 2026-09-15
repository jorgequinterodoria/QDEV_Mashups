# Phase 1 — Library Core

## Objetivo

Crear el núcleo de indexación de la biblioteca musical.

Fuente inicial:

`/Volumes/Respaldo Mac/MUSICA/Deemix`

## Capacidades implementadas

- Escaneo recursivo.
- Detección de subcarpetas.
- Detección de archivos de audio.
- Identidad determinista de carpetas.
- Identidad determinista de tracks.
- Detección de tracks nuevos.
- Detección de tracks modificados.
- Detección de tracks eliminados.
- Detección de carpetas nuevas.
- Detección de carpetas eliminadas.
- Detección de tracks sin cambios.
- Filtrado de extensiones no soportadas.
- Persistencia local del snapshot.
- Escritura atómica del archivo de base de datos.
- Procesamiento incremental.
- Protección contra cambiar accidentalmente la raíz de una biblioteca existente.

## Formatos soportados

- MP3
- FLAC
- WAV
- AIFF
- AIF
- M4A
- AAC
- OGG
- OPUS

## Identidad

Los IDs se generan mediante SHA-256 a partir de rutas relativas normalizadas.

Esto proporciona una identidad estable para la fase actual sin depender de nombres absolutos de volumen.

## Procesamiento incremental

Primera ejecución:

```text
Filesystem
    ↓
Scanner
    ↓
Snapshot
    ↓
Repository