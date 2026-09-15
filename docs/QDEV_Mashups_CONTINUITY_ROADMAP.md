QDEV Mashups — Documento de Continuidad

Fecha: 2026-09-15

Punto exacto del proyecto

Proyecto: QDEV Mashups / MASHUP ASSISTANT
Ruta local: ~/Documents/GitHub/QDEV_Mashups
Plataforma: macOS Apple Silicon arm64
Aplicación: Electron + Vite + TypeScript
Idioma obligatorio: español (es-CO)

Reglas permanentes

Trabajar por PHASE, no por stages.

Cada PHASE debe tener tests.

Una PHASE no se cierra hasta que pnpm typecheck, pnpm lint, pnpm test y pnpm build pasen.

En implementación entregar archivos completos, no parches ni snippets.

No declarar una fase completa si existe un fallo.

Mantener toda la aplicación en español.

Stems exclusivamente: vocals, drums, bass, other.

Nunca introducir guitar, piano ni el modelo de seis stems.

El usuario ejecuta las validaciones locales y devuelve los resultados.

Evitar cambios innecesarios sobre componentes ya validados.

Fases completadas

Phase 0 — Foundation: 100%

Phase 1 — Library Core: 100%

Phase 2 — Audio Analysis Engine: 100%

Phase 3 — Music Intelligence: 100%

Phase 4 — Mashup Compatibility Engine: 100%

Phase 5 — Mashup Discovery: 100%

Phase 6 — Mashup Builder: 100%

Phase 7 — Preview & Rendering: 100%

Phase 8 — DJ Workflow / djay Pro: 100%

Phase 9 — Automatic Library Sync: 100%

Phase 10 — Arquitectura Desktop Profesional + Español: 100%

Phase 11 — Motor de separación de stems 4 canales: 100%

Evidencia de Phase 11

Última validación global:

43 test files passed
166 tests passed
Typecheck: PASS
Lint: PASS
Renderer build: PASS
Electron build: PASS
Real MLX-Demucs separation: PASS

Canción real usada:

/Volumes/Respaldo Mac/MUSICA 2026/ALETEO/ALETEO, GUARACHA, TRIBAL/(130) Alexander Zabbi & Mr.Drops - A Place (Original Mix).mp3

Modelo probado: htdemucs

Tiempo de separación real: aproximadamente 2629 s (43 min 49 s).

Infraestructura de stems

Proveedor: mlx-demucs
Worker: tools/mlx-demucs-worker.py
Python: .venv-stems/bin/python
Modelos admitidos: htdemucs, htdemucs_ft

Almacenamiento:

Stems: /Volumes/Respaldo Mac/QDEV_Mashups/Stems

Caché: /Volumes/Respaldo Mac/QDEV_Mashups/Stems/Cache

Modelos: /Volumes/Respaldo Mac/QDEV_Mashups/Models/huggingface

Contrato:

vocals.wav
drums.wav
bass.wav
other.wav

El archivo original nunca se sobrescribe.

PHASE 12 — ACTIVA

Nombre: Gestor y Caché Profesional de Stems

Objetivo:

Convertir la caché funcional de Phase 11 en un subsistema administrable, verificable y seguro.

Entrega iniciada:

src/stems/manager.ts

tests/stems/manager.test.ts

docs/PHASE-12-STEMS.md

src/stems/index.ts debe exportar el gestor sin perder las exportaciones existentes.

Capacidades:

listar entradas válidas

inspeccionar una entrada

verificar usabilidad de sus cuatro stems

calcular tamaño ocupado

generar resumen de caché

eliminar una entrada

limpiar entradas inválidas

limpiar toda la caché mediante operación explícita

rechazar path traversal y claves no SHA-256

Estado: EN IMPLEMENTACIÓN. NO COMPLETAR HASTA VALIDACIÓN.

Importante al continuar Phase 12

El src/stems/index.ts actual del usuario ya contiene exportaciones de tipos, caché, servicio, proveedor y paths. Al integrar el gestor se debe conservar todo lo existente y añadir la exportación de manager.ts; no reemplazar accidentalmente exportaciones funcionales.

Después de integrar los archivos, ejecutar:

pnpm typecheck
pnpm lint
pnpm test
pnpm build

Si todos pasan, revisar si Phase 12 necesita ampliar cobertura antes de cerrarla. La validación real de Phase 11 no debe repetirse salvo que se modifique el proveedor o el worker.

PHASE 13 — Stem Mixer Profesional

mezcla independiente de Voces/Batería/Bajo/Otros

mute/solo

ganancia

control de nivel

preview no destructivo

estado reproducible

integración con el contrato de cuatro stems

PHASE 14 — Mashup Engine basado en Stems

generación de mashups por stems

asignación de roles musicales

BPM/key

sincronización temporal

reglas de mezcla

transiciones

PHASE 15 — Renderer Profesional

render offline determinista

mezcla de stems

headroom/normalización

exportación

verificación de integridad

PHASE 16 — Nueva interfaz de Stems

interfaz profesional de cuatro canales

estados y progreso

caché

selección de stems

controles preparados para mixer

PHASE 17 — Preview Studio Profesional

reproducción previa

timeline

preview por stems

navegación

transporte

comparación original/mashup

PHASE 18 — DJ Prep Real

beatgrid

cues

loops

estructura

metadatos derivados

PHASE 19 — Exportación DJ

archivos listos para DJ

nombres y estructura

metadatos

validación

flujo djay

PHASE 20 — Biblioteca Inteligente 2.0

inteligencia de biblioteca

análisis de audio/stems

relaciones musicales

búsqueda y clasificación avanzada

PHASE 21 — Automatización de Mashups

generación automática

lotes

colas

reglas

priorización

procesamiento controlado

PHASE 22 — Rendimiento y Optimización

optimización MLX

concurrencia segura

caché

memoria

GPU

observabilidad

Nota: la separación real validada tardó ~43m49s; el rendimiento es una preocupación explícita de Phase 22.

PHASE 23 — UX/UI Completa en Español

interfaz final española

estados

errores

accesibilidad

consistencia visual

flujo completo

PHASE 24 — Configuración

rutas

modelos

caché

preferencias

rendimiento

configuración de stems

configuración DJ

PHASE 25 — QA Profesional

unit tests

integración

E2E

regresión

cancelación

corrupción de caché

recuperación

PHASE 26 — Packaging macOS

aplicación distribuible

runtime

dependencias MLX

worker Python

recursos

firma/notarización según necesidad

PHASE 27 — Release 1.0

freeze funcional

documentación

QA final

build release

instalación

checklist de publicación

Regla para otro chat/agente

Leer este documento primero.

El punto de continuación es siempre la primera PHASE cuyo estado sea ACTIVA o EN IMPLEMENTACIÓN.

En este documento: PHASE 12.

No repetir Phase 0–11.
No introducir seis stems.
No cerrar Phase 12 sin las cuatro validaciones verdes.
Después de cerrar Phase 12, continuar con Phase 13.

## PHASE 28 — Stem Studio + Waveform RGB

- separación de stems desde la aplicación de escritorio
- progreso y cancelación
- caché visible y reutilizable
- waveform RGB real
- scrub interactivo
- mixer de cuatro canales integrado
- exportación/descarga de los cuatro stems
- contrato es-CO

Estado: EN IMPLEMENTACIÓN.
