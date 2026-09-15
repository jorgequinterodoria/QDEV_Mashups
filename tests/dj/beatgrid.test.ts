import {
  describe,
  expect,
  it
} from "vitest";

import {
  createBeatGrid
} from "../../src/dj/beatgrid";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

function track(
  beatTimes: number[]
): MusicIntelligenceResult {
  return {
    trackId: "track",
    analyzedAtMs: 1,
    sourceSizeBytes: 1,
    sourceModifiedTimeMs: 1,
    durationSeconds: 30,

    tempo: {
      bpm: 120,
      confidence: 1,
      halfTimeBpm: 60,
      doubleTimeBpm: 240,
      beatTimes,
      onsetTimes: []
    },

    key: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 1
    },

    chords: [],

    spectral: {
      rms: 0.2,
      loudnessLufs: -14,
      spectralCentroidHz: 1500,
      spectralFlatness: 0.2,
      spectralRolloffHz: 3500,
      zeroCrossingRate: 0.05
    },

    energy: "medium",
    vocalProfile: "likely-vocal",
    analysisVersion: 1,
    error: null
  };
}

describe(
  "createBeatGrid",
  () => {
    it("uses detected beat times", () => {
      const result =
        createBeatGrid(
          track([
            0,
            0.5,
            1,
            1.5,
            2
          ])
        );

      expect(result).not.toBeNull();

      expect(
        result?.estimated
      ).toBe(false);

      expect(
        result?.firstBeatSeconds
      ).toBe(0);

      expect(
        result?.beatIntervalSeconds
      ).toBeCloseTo(0.5);

      expect(
        result?.beatTimes
      ).toHaveLength(5);
    });

    it("generates an estimated grid without beat events", () => {
      const result =
        createBeatGrid(
          track([])
        );

      expect(result).not.toBeNull();

      expect(
        result?.estimated
      ).toBe(true);

      expect(
        result?.beatTimes.length
      ).toBeGreaterThan(1);

      expect(
        result?.beatIntervalSeconds
      ).toBeCloseTo(0.5);
    });

    it("rejects invalid BPM", () => {
      const data =
        track([]);

      data.tempo.bpm =
        null;

      expect(
        createBeatGrid(data)
      ).toBeNull();
    });
  }
);