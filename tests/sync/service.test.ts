import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AutomaticLibrarySyncService
} from "../../src/sync/service";

import type {
  LibrarySyncProvider,
  SyncInvalidator,
  SyncSnapshot,
  SyncStateStore
} from "../../src/sync/types";

function makeSnapshot(
  tracks:
    SyncSnapshot["tracks"]
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

function createDependencies(
  previous: SyncSnapshot | null,
  current: SyncSnapshot
): {
  provider: LibrarySyncProvider;
  store: SyncStateStore;
  invalidator: SyncInvalidator;
} {
  return {
    provider: {
      scan:
        vi.fn()
          .mockResolvedValue(
            current
          )
    },

    store: {
      load:
        vi.fn()
          .mockResolvedValue(
            previous
          ),

      save:
        vi.fn()
          .mockResolvedValue(
            undefined
          )
    },

    invalidator: {
      invalidateAnalysis:
        vi.fn()
          .mockResolvedValue(
            undefined
          ),

      invalidateIntelligence:
        vi.fn()
          .mockResolvedValue(
            undefined
          )
    }
  };
}

describe(
  "AutomaticLibrarySyncService",
  () => {
    it("invalidates added and modified tracks", async () => {
      const previous =
        makeSnapshot([
          trackA
        ]);

      const current =
        makeSnapshot([
          trackA,
          trackB
        ]);

      const dependencies =
        createDependencies(
          previous,
          current
        );

      const service =
        new AutomaticLibrarySyncService(
          dependencies.provider,
          dependencies.store,
          dependencies.invalidator
        );

      const result =
        await service.synchronize(
          "/music"
        );

      expect(
        result.statistics.added
      ).toBe(1);

      expect(
        result.statistics.unchanged
      ).toBe(1);

      expect(
        dependencies.invalidator
          .invalidateAnalysis
      ).toHaveBeenCalledWith([
        "b"
      ]);

      expect(
        dependencies.invalidator
          .invalidateIntelligence
      ).toHaveBeenCalledWith([
        "b"
      ]);

      expect(
        dependencies.store.save
      ).toHaveBeenCalledTimes(
        1
      );
    });

    it("invalidates removed tracks", async () => {
      const previous =
        makeSnapshot([
          trackA,
          trackB
        ]);

      const current =
        makeSnapshot([
          trackA
        ]);

      const dependencies =
        createDependencies(
          previous,
          current
        );

      const service =
        new AutomaticLibrarySyncService(
          dependencies.provider,
          dependencies.store,
          dependencies.invalidator
        );

      const result =
        await service.synchronize(
          "/music"
        );

      expect(
        result.statistics.removed
      ).toBe(1);

      expect(
        dependencies.invalidator
          .invalidateAnalysis
      ).toHaveBeenCalledWith([
        "b"
      ]);

      expect(
        dependencies.invalidator
          .invalidateIntelligence
      ).toHaveBeenCalledWith([
        "b"
      ]);
    });

    it("does not invalidate unchanged tracks", async () => {
      const previous =
        makeSnapshot([
          trackA
        ]);

      const current =
        makeSnapshot([
          trackA
        ]);

      const dependencies =
        createDependencies(
          previous,
          current
        );

      const service =
        new AutomaticLibrarySyncService(
          dependencies.provider,
          dependencies.store,
          dependencies.invalidator
        );

      const result =
        await service.synchronize(
          "/music"
        );

      expect(
        result.statistics.unchanged
      ).toBe(1);

      expect(
        dependencies.invalidator
          .invalidateAnalysis
      ).toHaveBeenCalledWith([]);

      expect(
        dependencies.invalidator
          .invalidateIntelligence
      ).toHaveBeenCalledWith([]);
    });

    it("rejects an empty library root", async () => {
      const dependencies =
        createDependencies(
          null,
          makeSnapshot([])
        );

      const service =
        new AutomaticLibrarySyncService(
          dependencies.provider,
          dependencies.store,
          dependencies.invalidator
        );

      await expect(
        service.synchronize(
          "   "
        )
      ).rejects.toThrow(
        "Library root cannot be empty."
      );
    });
  }
);