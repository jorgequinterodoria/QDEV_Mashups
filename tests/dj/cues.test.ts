import {
  describe,
  expect,
  it
} from "vitest";

import {
  createCuePoints,
  createLoopPoints
} from "../../src/dj/cues";

import type {
  DJBeatGrid
} from "../../src/dj/types";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

const beatGrid: DJBeatGrid = {
  bpm: 120,
  firstBeatSeconds: 0,
  beatIntervalSeconds: 0.5,
  phaseOffsetSeconds: 0,
  beatTimes:
    Array.from(
      {
        length: 200
      },
      (_, index) =>
        index * 0.5
    ),
  confidence: 1,
  estimated: false
};

function track():
  MusicIntelligenceResult {
  return {
    trackId: "track",
    analyzedAtMs: 1,
    sourceSizeBytes: 1,
    sourceModifiedTimeMs: 1,
    durationSeconds: 100,

    tempo: {
      bpm: 120,
      confidence: 1,
      halfTimeBpm: 60,
      doubleTimeBpm: 240,
      beatTimes:
        beatGrid.beatTimes,
      onsetTimes: [
        10
      ]
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
  "DJ cues and loops",
  () => {
    it("creates deterministic cue points", () => {
      const result =
        createCuePoints(
          track(),
          beatGrid
        );

      expect(
        result.length
      ).toBeGreaterThan(0);

      expect(
        result.length
      ).toBeLessThanOrEqual(16);

      expect(
        result[0].label
      ).toBe("Start");

      expect(
        result.some(
          (cue) =>
            cue.type ===
            "mix-in"
        )
      ).toBe(true);

      expect(
        result.some(
          (cue) =>
            cue.type ===
            "vocal-entry"
        )
      ).toBe(true);
    });

    it("creates beat-quantized loop points", () => {
      const result =
        createLoopPoints(
          track(),
          beatGrid,
          {
            loopBeats: [
              8,
              16,
              32
            ]
          }
        );

      expect(
        result
      ).toHaveLength(3);

      for (
        const loop of result
      ) {
        expect(
          loop.endSeconds -
            loop.startSeconds
        ).toBeCloseTo(
          loop.beats *
            0.5
        );
      }
    });
  }
);