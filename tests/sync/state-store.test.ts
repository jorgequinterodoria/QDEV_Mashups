import {
  mkdtemp,
  readFile
} from "node:fs/promises";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  JsonSyncStateStore
} from "../../src/sync/state-store";

import type {
  SyncSnapshot
} from "../../src/sync/types";

describe(
  "JsonSyncStateStore",
  () => {
    it("persists and reloads a snapshot", async () => {
      const directory =
        await mkdtemp(
          join(
            tmpdir(),
            "mashup-sync-"
          )
        );

      const store =
        new JsonSyncStateStore(
          directory
        );

      const snapshot:
        SyncSnapshot = {
        libraryRoot:
          "/music",
        generatedAtMs:
          123,
        tracks: [
          {
            trackId: "a",
            absolutePath:
              "/music/a.mp3",
            sizeBytes: 100,
            modifiedTimeMs: 10
          }
        ]
      };

      await store.save(
        snapshot
      );

      const restored =
        await store.load(
          "/music"
        );

      expect(
        restored
      ).toEqual(
        snapshot
      );
    });

    it("returns null when no state exists", async () => {
      const directory =
        await mkdtemp(
          join(
            tmpdir(),
            "mashup-sync-"
          )
        );

      const store =
        new JsonSyncStateStore(
          directory
        );

      expect(
        await store.load(
          "/music"
        )
      ).toBeNull();
    });

    it("stores valid JSON", async () => {
      const directory =
        await mkdtemp(
          join(
            tmpdir(),
            "mashup-sync-"
          )
        );

      const store =
        new JsonSyncStateStore(
          directory
        );

      const snapshot:
        SyncSnapshot = {
        libraryRoot:
          "/music",
        generatedAtMs:
          1,
        tracks: []
      };

      await store.save(
        snapshot
      );

      const files =
        await import(
          "node:fs/promises"
        );

      const directoryFiles =
        await files.readdir(
          directory
        );

      expect(
        directoryFiles
      ).toHaveLength(1);

      const content =
        await readFile(
          join(
            directory,
            directoryFiles[0]
          ),
          "utf8"
        );

      expect(() =>
        JSON.parse(
          content
        )
      ).not.toThrow();
    });
  }
);