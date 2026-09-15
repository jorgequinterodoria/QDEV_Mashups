import {
  describe,
  expect,
  it
} from "vitest";

import {
  detectSyncChanges
} from "../../src/sync/change-detector";

import type {
  SyncSnapshot
} from "../../src/sync/types";

function snapshot(
  tracks: SyncSnapshot["tracks"]
): SyncSnapshot {
  return {
    libraryRoot:
      "/music",
    generatedAtMs:
      1,
    tracks
  };
}

const trackA = {
  trackId: "a",
  absolutePath:
    "/music/a.mp3",
  sizeBytes: 100,
  modifiedTimeMs: 1
};

const trackB = {
  trackId: "b",
  absolutePath:
    "/music/b.mp3",
  sizeBytes: 200,
  modifiedTimeMs: 2
};

describe(
  "detectSyncChanges",
  () => {
    it("detects first synchronization as additions", () => {
      const result =
        detectSyncChanges(
          null,
          snapshot([
            trackA,
            trackB
          ])
        );

      expect(
        result.added.map(
          (
            track
          ) => track.trackId
        )
      ).toEqual([
        "a",
        "b"
      ]);

      expect(
        result.modified
      ).toHaveLength(0);

      expect(
        result.unchanged
      ).toHaveLength(0);

      expect(
        result.removed
      ).toHaveLength(0);
    });

    it("detects modified tracks", () => {
      const modified = {
        ...trackA,
        sizeBytes: 150
      };

      const result =
        detectSyncChanges(
          snapshot([
            trackA,
            trackB
          ]),
          snapshot([
            modified,
            trackB
          ])
        );

      expect(
        result.modified.map(
          (
            track
          ) => track.trackId
        )
      ).toEqual([
        "a"
      ]);

      expect(
        result.unchanged.map(
          (
            track
          ) => track.trackId
        )
      ).toEqual([
        "b"
      ]);
    });

    it("detects removals", () => {
      const result =
        detectSyncChanges(
          snapshot([
            trackA,
            trackB
          ]),
          snapshot([
            trackA
          ])
        );

      expect(
        result.removed.map(
          (
            track
          ) => track.trackId
        )
      ).toEqual([
        "b"
      ]);
    });

    it("detects path changes even when identity is stable", () => {
      const result =
        detectSyncChanges(
          snapshot([
            trackA
          ]),
          snapshot([
            {
              ...trackA,
              absolutePath:
                "/music/new/a.mp3"
            }
          ])
        );

      expect(
        result.modified
      ).toHaveLength(1);

      expect(
        result.unchanged
      ).toHaveLength(0);
    });

    it("keeps results deterministic", () => {
      const result =
        detectSyncChanges(
          null,
          snapshot([
            trackB,
            trackA
          ])
        );

      expect(
        result.added.map(
          (
            track
          ) => track.trackId
        )
      ).toEqual([
        "a",
        "b"
      ]);
    });
  }
);