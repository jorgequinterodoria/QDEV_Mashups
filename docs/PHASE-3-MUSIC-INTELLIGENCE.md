# Phase 3 — Music Intelligence

## Objetivo

Transformar audio PCM en información musical útil para el futuro motor de mashups.

## Motor

La implementación utiliza `audio` como backend de análisis.

El paquete proporciona:

- decodificación de audio;
- BPM;
- beats;
- onsets;
- loudness;
- RMS;
- spectral centroid;
- spectral flatness;
- spectral rolloff;
- zero-crossing rate;
- pitch;
- chords;
- key.

La implementación actual utiliza únicamente las capacidades necesarias para esta fase.

## Arquitectura

```text
LibraryTrack
     |
     v
MusicIntelligenceService
     |
     v
MusicIntelligenceEngine
     |
     v
AudioMusicIntelligenceEngine
     |
     v
audio
     |
     +--> BPM
     +--> Beats
     +--> Onsets
     +--> Key
     +--> Chords
     +--> Loudness
     +--> RMS
     +--> Spectral features
     |
     v
MusicIntelligenceResult
     |
     v
JsonMusicIntelligenceRepository