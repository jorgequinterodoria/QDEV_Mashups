# PHASE 28 — Stem Studio + Waveform RGB

## Objetivo
Integrar la separación real de stems dentro de la aplicación de escritorio y reemplazar la waveform sintética por una waveform RGB calculada a partir del audio real.

## Alcance
- Selección de una pista desde la aplicación.
- Separación real mediante `mlx-demucs`.
- Exactamente cuatro canales: `vocals`, `drums`, `bass`, `other`.
- Progreso en tiempo real y cancelación.
- Reutilización automática de la caché.
- URLs locales para reproducir/abrir los cuatro WAV.
- Estudio de stems accesible desde la navegación principal.
- Mixer de cuatro canales con ganancia real mediante Web Audio.
- Waveform RGB interactiva con scrub.
- Codificación visual: rojo = graves, verde = medios, azul = agudos.
- Contrato es-CO en los controles nuevos.
- Worker MLX-Demucs incluido como recurso del bundle cuando se empaqueta la aplicación.

## Limitación de distribución
El bundle incluye el worker Python, pero el entorno Python/MLX (`.venv-stems`) no se distribuye automáticamente con esta fase. En una instalación limpia es necesario provisionar ese runtime antes de separar stems. La aplicación debe comunicar claramente cuándo el motor local no está disponible.

## Validación
La fase requiere: `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`.
