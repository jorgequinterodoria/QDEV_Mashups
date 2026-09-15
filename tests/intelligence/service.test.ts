import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  MusicIntelligenceService
} from "../../src/intelligence/service";

import type {
  MusicIntelligenceEngine,
  MusicIntelligenceEngineResult
} from "../../src/intelligence/types";

import type {
  MusicIntelligenceRepository
} from "../../src/intelligence/repository";

import type {
  LibraryTrack
} from "../../src/library/types";

const track: LibraryTrack = {
  id: "track-1",
  relativePath:
    "House/Track.mp3",
  absolutePath:
    "/music/House/Track.mp3",
  fileName: "Track.mp3",
  extension: ".mp3",
  folderId: "folder-1",
  sizeBytes: 1000,
  modifiedTimeMs: 2000,
  status: "active"
};

const engineResult:
  MusicIntelligenceEngineResult = {
    durationSeconds: 240,
    tempo: {
      bpm: 124,
      confidence: null,
      halfTimeBpm: 62,
      doubleTimeBpm: 248,
      beatTimes: [
        0,
        0.48,
        0.96
      ],
      onsetTimes: [
        0,
        0.24,
        0.48
      ]
    },
    key: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 0.8
    },
    chords: [
      {
        startTimeSeconds: 0,
        durationSeconds: 4,
        label: "Am",
        confidence: 0.9
      }
    ],
    spectral: {
      rms: 0.2,
      loudnessLufs: -14,
      spectralCentroidHz: 1500,
      spectralFlatness: 0.2,
      spectralRolloffHz: 3500,
      zeroCrossingRate: 0.06
    }
  };

function createEngine(): MusicIntelligenceEngine {
  return {
    analyze: vi.fn(
      async () => engineResult
    )
  };
}

function createRepository(
  cached:
    | Awaited<
        ReturnType<
          MusicIntelligenceRepository["get"]
        >
      >
    | null
): MusicIntelligenceRepository {
  return {
    get: vi.fn(async () => cached),
    save: vi.fn(async () => undefined),
    list: vi.fn(async () => [])
  };
}

describe("MusicIntelligenceService", () => {
  it("creates a complete intelligence result", async () => {
    const engine =
      createEngine();

    const repository =
      createRepository(null);

    const service =
      new MusicIntelligenceService(
        engine,
        repository
      );

    const result =
      await service.analyzeTrack(
        track
      );

    expect(result.trackId).toBe(
      "track-1"
    );

    expect(result.tempo.bpm).toBe(
      124
    );

    expect(result.key.label).toBe(
      "Am"
    );

    expect(result.chords).toHaveLength(
      1
    );

    expect(result.energy).toBe(
      "medium"
    );

    expect(result.vocalProfile).toBe(
      "unknown"
    );

    expect(result.error).toBeNull();

    expect(
      repository.save
    ).toHaveBeenCalledTimes(1);
  });

  it("reuses a valid cached result", async () => {
    const engine =
      createEngine();

    const repository =
      createRepository({
        trackId: "track-1",
        analyzedAtMs: 3000,
        sourceSizeBytes: 1000,
        sourceModifiedTimeMs: 2000,
        durationSeconds: 240,
        tempo: engineResult.tempo,
        key: engineResult.key,
        chords: engineResult.chords,
        spectral: engineResult.spectral,
        energy: "medium",
        vocalProfile: "unknown",
        analysisVersion: 1,
        error: null
      });

    const service =
      new MusicIntelligenceService(
        engine,
        repository
      );

    const result =
      await service.analyzeTrack(
        track
      );

    expect(result.trackId).toBe(
      "track-1"
    );

    expect(
      engine.analyze
    ).not.toHaveBeenCalled();
  });

  it("reanalyzes when the source changed", async () => {
    const engine =
      createEngine();

    const repository =
      createRepository({
        trackId: "track-1",
        analyzedAtMs: 3000,
        sourceSizeBytes: 999,
        sourceModifiedTimeMs: 2000,
        durationSeconds: 240,
        tempo: engineResult.tempo,
        key: engineResult.key,
        chords: engineResult.chords,
        spectral: engineResult.spectral,
        energy: "medium",
        vocalProfile: "unknown",
        analysisVersion: 1,
        error: null
      });

    const service =
      new MusicIntelligenceService(
        engine,
        repository
      );

    await service.analyzeTrack(
      track
    );

    expect(
      engine.analyze
    ).toHaveBeenCalledTimes(1);
  });

  it("persists failures without throwing", async () => {
    const engine:
      MusicIntelligenceEngine = {
      analyze: vi.fn(
        async () => {
          throw new Error(
            "Audio decoding failed."
          );
        }
      )
    };

    const repository =
      createRepository(null);

    const service =
      new MusicIntelligenceService(
        engine,
        repository
      );

    const result =
      await service.analyzeTrack(
        track
      );

    expect(result.error).toBe(
      "Audio decoding failed."
    );

    expect(result.energy).toBe(
      "unknown"
    );

    expect(result.key.mode).toBe(
      "unknown"
    );

    expect(
      repository.save
    ).toHaveBeenCalledTimes(1);
  });
});