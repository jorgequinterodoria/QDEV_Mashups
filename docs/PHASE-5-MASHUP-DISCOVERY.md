# Phase 5 — Mashup Discovery

## Objective

Transform the compatibility engine into a deterministic discovery system capable of finding the strongest mashup candidates inside the analyzed music library.

## Responsibilities

The discovery layer:

- consumes existing `MusicIntelligenceResult` objects;
- never re-analyzes audio;
- evaluates unique track pairs;
- excludes self-pairs;
- delegates compatibility calculations to `CompatibilityEngine`;
- filters candidates by minimum score;
- filters candidates by confidence;
- excludes incompatible candidates;
- excludes weak candidates by default;
- ranks candidates deterministically;
- limits the returned result set;
- supports discovery for an entire library;
- supports discovery for a single source track.

## Architecture

```text
MusicIntelligenceResult[]
        |
        v
MashupDiscoveryService
        |
        v
CompatibilityEngine
        |
        v
MashupCompatibilityResult[]
        |
        v
Filtering
        |
        v
Deterministic Ranking
        |
        v
MashupCandidate[]