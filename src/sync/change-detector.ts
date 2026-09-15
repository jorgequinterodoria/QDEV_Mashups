import type {
  SyncChanges,
  SyncSnapshot,
  SyncTrack
} from "./types";

export function detectSyncChanges(
  previous:
    | SyncSnapshot
    | null,
  current: SyncSnapshot
): SyncChanges {
  if (
    previous === null ||
    previous.libraryRoot !==
      current.libraryRoot
  ) {
    return {
      added: sortTracks(
        current.tracks
      ),
      modified: [],
      removed: [],
      unchanged: []
    };
  }

  const previousMap =
    indexTracks(
      previous.tracks
    );

  const currentMap =
    indexTracks(
      current.tracks
    );

  const added: SyncTrack[] = [];
  const modified: SyncTrack[] = [];
  const unchanged: SyncTrack[] = [];
  const removed: SyncTrack[] = [];

  for (
    const currentTrack of currentMap.values()
  ) {
    const previousTrack =
      previousMap.get(
        currentTrack.trackId
      );

    if (
      previousTrack ===
      undefined
    ) {
      added.push(
        currentTrack
      );
      continue;
    }

    if (
      hasTrackChanged(
        previousTrack,
        currentTrack
      )
    ) {
      modified.push(
        currentTrack
      );
      continue;
    }

    unchanged.push(
      currentTrack
    );
  }

  for (
    const previousTrack of previousMap.values()
  ) {
    if (
      !currentMap.has(
        previousTrack.trackId
      )
    ) {
      removed.push(
        previousTrack
      );
    }
  }

  return {
    added:
      sortTracks(added),
    modified:
      sortTracks(modified),
    removed:
      sortTracks(removed),
    unchanged:
      sortTracks(unchanged)
  };
}

function indexTracks(
  tracks: SyncTrack[]
): Map<string, SyncTrack> {
  const result =
    new Map<
      string,
      SyncTrack
    >();

  for (
    const track of tracks
  ) {
    result.set(
      track.trackId,
      track
    );
  }

  return result;
}

function hasTrackChanged(
  previous: SyncTrack,
  current: SyncTrack
): boolean {
  return (
    previous.absolutePath !==
      current.absolutePath ||
    previous.sizeBytes !==
      current.sizeBytes ||
    previous.modifiedTimeMs !==
      current.modifiedTimeMs
  );
}

function sortTracks(
  tracks: SyncTrack[]
): SyncTrack[] {
  return [
    ...tracks
  ].sort(
    (a, b) =>
      a.trackId.localeCompare(
        b.trackId
      )
  );
}