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
  DJSessionExporterImpl
} from "../../src/dj/exporter";

import type {
  DJMashupSession
} from "../../src/dj/types";

function session():
  DJMashupSession {
  return {
    sessionId:
      "dj::a::b::120::Am",
    createdAtMs: 1,
    targetBpm: 120,
    targetKey: "Am",
    baseTrackId: "a",
    secondaryTrackId: "b",

    baseTrack: {
      trackId: "a",
      sourcePath:
        "/music/base.wav",
      durationSeconds: 120,
      bpm: 120,
      keyLabel: "Am",
      beatGrid: null,
      cuePoints: [],
      loops: []
    },

    secondaryTrack: {
      trackId: "b",
      sourcePath:
        "/music/vocal.wav",
      durationSeconds: 120,
      bpm: 120,
      keyLabel: "Am",
      beatGrid: null,
      cuePoints: [],
      loops: []
    },

    recommendedSequence: [
      "Load base track"
    ],

    compatibilityScore: 95,

    warnings: []
  };
}

describe(
  "DJSessionExporterImpl",
  () => {
    it("exports JSON manifest and M3U8 playlist", async () => {
      const directory =
        await mkdtemp(
          join(
            tmpdir(),
            "mashup-dj-"
          )
        );

      const exporter =
        new DJSessionExporterImpl();

      const result =
        await exporter.export(
          session(),
          directory
        );

      const manifest =
        await readFile(
          result.manifestPath,
          "utf8"
        );

      const playlist =
        await readFile(
          result.playlistPath,
          "utf8"
        );

      expect(
        manifest
      ).toContain(
        "\"sessionId\""
      );

      expect(
        manifest
      ).toContain(
        "\"targetBpm\": 120"
      );

      expect(
        playlist
      ).toContain(
        "#EXTM3U"
      );

      expect(
        playlist
      ).toContain(
        "/music/base.wav"
      );

      expect(
        playlist
      ).toContain(
        "/music/vocal.wav"
      );
    });
  }
);