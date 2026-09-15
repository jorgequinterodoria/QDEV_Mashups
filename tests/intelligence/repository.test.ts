import {
  mkdtemp,
  rm
} from "node:fs/promises";
import {
  tmpdir
} from "node:os";
import {
  join
} from "node:path";

import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  JsonMusicIntelligenceRepository
} from "../../src/intelligence/repository";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

const temporaryDirectories: string[] =
  [];

async function createFixture(): Promise<string> {
  const directory =
    await mkdtemp(
      join(
        tmpdir(),
        "mashup-intelligence-"
      )
    );

  temporaryDirectories.push(
    directory
  );

  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) =>
        rm(directory, {
          recursive: true,
          force: true
        })
      )
  );
});

const result:
  MusicIntelligenceResult = {
  trackId: "track-1",
  analyzedAtMs: 1000,
  sourceSizeBytes: 2000,
  sourceModifiedTimeMs: 3000,
  durationSeconds: 240,
  tempo: {
    bpm: 124,
    confidence: 0.9,
    halfTimeBpm: 62,
    doubleTimeBpm: 248,
    beatTimes: [0, 0.48],
    onsetTimes: [0, 0.24]
  },
  key: {
    label: "Am",
    tonic: 9,
    mode: "minor",
    confidence: 0.8
  },
  chords: [],
  spectral: {
    rms: 0.2,
    loudnessLufs: -14,
    spectralCentroidHz: 1500,
    spectralFlatness: 0.2,
    spectralRolloffHz: 3500,
    zeroCrossingRate: 0.06
  },
  energy: "medium",
  vocalProfile: "unknown",
  analysisVersion: 1,
  error: null
};

describe(
  "JsonMusicIntelligenceRepository",
  () => {
    it("returns null for an unknown track", async () => {
      const directory =
        await createFixture();

      const repository =
        new JsonMusicIntelligenceRepository(
          join(
            directory,
            "intelligence.json"
          )
        );

      await expect(
        repository.get("unknown")
      ).resolves.toBeNull();
    });

    it("persists and retrieves results", async () => {
      const directory =
        await createFixture();

      const repository =
        new JsonMusicIntelligenceRepository(
          join(
            directory,
            "intelligence.json"
          )
        );

      await repository.save(
        result
      );

      await expect(
        repository.get("track-1")
      ).resolves.toEqual(
        result
      );
    });

    it("returns results in deterministic order", async () => {
      const directory =
        await createFixture();

      const repository =
        new JsonMusicIntelligenceRepository(
          join(
            directory,
            "intelligence.json"
          )
        );

      await repository.save({
        ...result,
        trackId: "track-z"
      });

      await repository.save({
        ...result,
        trackId: "track-a"
      });

      const values =
        await repository.list();

      expect(
        values.map(
          (item) => item.trackId
        )
      ).toEqual([
        "track-a",
        "track-z"
      ]);
    });
  }
);