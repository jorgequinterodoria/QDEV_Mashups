import type {
  SyncChanges,
  LibrarySyncProvider,
  LibrarySyncService,
  SyncInvalidator,
  SyncResult,
  SyncStateStore,
  SyncSnapshot
} from "./types";

import {
  detectSyncChanges
} from "./change-detector";

export class AutomaticLibrarySyncService
  implements LibrarySyncService
{
  constructor(
    private readonly provider:
      LibrarySyncProvider,
    private readonly stateStore:
      SyncStateStore,
    private readonly invalidator:
      SyncInvalidator
  ) {}

  async synchronize(
    libraryRoot: string
  ): Promise<SyncResult> {
    const normalizedRoot =
      normalizeRoot(
        libraryRoot
      );

    const current =
      await this.provider.scan(
        normalizedRoot
      );

    const previous =
      await this.stateStore.load(
        normalizedRoot
      );

    const snapshot =
      normalizeSnapshot(
        current,
        normalizedRoot
      );

    const changes =
      detectSyncChanges(
        previous,
        snapshot
      );

    const invalidatedTrackIds =
      uniqueTrackIds([
        ...changes.added,
        ...changes.modified
      ]);

    const removedTrackIds =
      uniqueTrackIds(
        changes.removed
      );

    const analysisInvalidationIds =
      uniqueStrings([
        ...invalidatedTrackIds,
        ...removedTrackIds
      ]);

    const intelligenceInvalidationIds =
      uniqueStrings([
        ...invalidatedTrackIds,
        ...removedTrackIds
      ]);

    await this.invalidator.invalidateAnalysis(
      analysisInvalidationIds
    );

    await this.invalidator.invalidateIntelligence(
      intelligenceInvalidationIds
    );

    await this.stateStore.save(
      snapshot
    );

    return {
      snapshot,
      changes,
      statistics:
        createStatistics(
          changes,
          analysisInvalidationIds,
          intelligenceInvalidationIds
        )
    };
  }
}

function normalizeRoot(
  value: string
): string {
  const normalized =
    value.trim();

  if (
    normalized.length === 0
  ) {
    throw new Error(
      "Library root cannot be empty."
    );
  }

  return normalized;
}

function normalizeSnapshot(
  snapshot: SyncSnapshot,
  libraryRoot: string
): SyncSnapshot {
  const uniqueTracks =
    new Map<
      string,
      SyncSnapshot["tracks"][number]
    >();

  for (
    const track of snapshot.tracks
  ) {
    uniqueTracks.set(
      track.trackId,
      track
    );
  }

  return {
    libraryRoot,
    generatedAtMs:
      snapshot.generatedAtMs,
    tracks: [
      ...uniqueTracks.values()
    ].sort(
      (a, b) =>
        a.trackId.localeCompare(
          b.trackId
        )
    )
  };
}

function uniqueTrackIds(
  tracks: SyncSnapshot["tracks"]
): string[] {
  return uniqueStrings(
    tracks.map(
      (
        track
      ) =>
        track.trackId
    )
  );
}

function uniqueStrings(
  values: string[]
): string[] {
  return [
    ...new Set(
      values
    )
  ].sort();
}

function createStatistics(
  changes: SyncChanges,
  analysisInvalidationIds:
    string[],
  intelligenceInvalidationIds:
    string[]
) {
  return {
    discovered:
      changes.added.length +
      changes.modified.length +
      changes.unchanged.length,

    added:
      changes.added.length,

    modified:
      changes.modified.length,

    removed:
      changes.removed.length,

    unchanged:
      changes.unchanged.length,

    analysisInvalidated:
      analysisInvalidationIds.length,

    intelligenceInvalidated:
      intelligenceInvalidationIds.length
  };
}