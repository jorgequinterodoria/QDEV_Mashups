# Phase 6 — Mashup Builder

## Objective

Convert a discovered mashup candidate into a deterministic technical build plan.

The builder does not modify or render audio.

## Inputs

The builder consumes:

- `MashupCandidate`;
- `MusicIntelligenceResult` for Track A;
- `MusicIntelligenceResult` for Track B;
- optional build constraints.

No additional audio analysis is performed.

## Responsibilities

The builder:

- assigns mashup roles;
- chooses a target BPM;
- chooses a target key;
- calculates tempo adjustments;
- calculates pitch adjustments;
- estimates usable duration;
- validates tempo limits;
- validates pitch limits;
- produces warnings;
- determines whether the plan is ready for preview.

## Roles

Supported roles:

- `base`
- `vocal`
- `melodic`
- `hybrid`

The first implementation prioritizes vocal/instrumental information.

Instrumental + vocal:

```text
instrumental → base
vocal        → vocal