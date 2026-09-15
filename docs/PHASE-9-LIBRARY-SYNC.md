# Phase 9 — Automatic Library Sync

## Objective

Keep the local music library synchronized incrementally.

The system must avoid reprocessing tracks that have not changed.

## Change model

Every synchronization compares:

```text
previous snapshot
       ↓
current scan
       ↓
added / modified / removed / unchanged