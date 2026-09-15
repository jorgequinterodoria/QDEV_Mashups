# Phase 2 — Audio Analysis Engine

## Objetivo

Crear la primera capa de análisis musical sobre los tracks indexados por Phase 1.

## Capacidades implementadas

La fase incorpora un motor de análisis basado en `music-metadata`.

Se extraen:

- duración;
- contenedor;
- codec;
- perfil del codec;
- bitrate;
- sample rate;
- bits por sample;
- número de canales;
- indicador lossless/lossy;
- título;
- artista;
- álbum;
- album artist;
- género;
- año;
- número de track;
- número de disco;
- compositor;
- comentarios.

`music-metadata` proporciona una API Node.js `parseFile` para analizar archivos locales y expone información de formato, duración y tags. La opción `duration: true` fuerza el cálculo de duración cuando sea necesario. La opción `skipCovers: true` evita cargar carátulas durante el análisis. 

Referencia oficial del proyecto:

https://www.npmjs.com/package/music-metadata

## Arquitectura

```text
LibraryTrack
    |
    v
AudioAnalyzer
    |
    v
AudioAnalysisResult
    |
    v
AnalysisRepository