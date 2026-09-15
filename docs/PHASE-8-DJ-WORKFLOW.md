# Phase 8 — DJ Workflow / djay Pro

## Objective

Convert the mashup intelligence and build plan into a DJ-ready preparation workflow.

This phase does not modify djay's private database.

## Capabilities

The phase provides:

- beatgrid generation;
- detected-beat preservation;
- BPM-based estimated beatgrid fallback;
- cue point generation;
- vocal entry estimation;
- phrase markers;
- mix-in cue;
- mix-out cue;
- outro cue;
- beat-quantized loops;
- mashup DJ session creation;
- session manifest export;
- standard M3U8 playlist export.

## Beatgrid

The system first uses analyzed beat times.

When beat events are unavailable, it generates an estimated beatgrid from BPM.

Generated grids are explicitly marked:

```text
estimated: true