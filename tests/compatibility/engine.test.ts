import {
  describe,
  expect,
  it
} from "vitest";

import {
  MashupCompatibilityEngine
} from "../../src/compatibility/engine";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

function createTrack(
  overrides: Partial<MusicIntelligenceResult> = {}
): MusicIntelligenceResult {
  return {
    trackId: "track",
    analyzedAtMs: 1000,
    sourceSizeBytes: 1000,
    sourceModifiedTimeMs: 2000,
    durationSeconds: 240,
    tempo: {
      bpm: 124,
      confidence: 0.9,
      halfTimeBpm: 62,
      doubleTimeBpm: 248,
      beatTimes: [],
      onsetTimes: []
    },
    key: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 0.9
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
    vocalProfile:
      "likely-instrumental",
    analysisVersion: 1,
    error: null,
    ...overrides
  };
}

describe(
  "MashupCompatibilityEngine",
  () => {
    it("produces a high compatibility score for compatible tracks", () => {
      const engine =
        new MashupCompatibilityEngine();

      const result =
        engine.compare(
          createTrack({
            trackId: "a"
          }),
          createTrack({
            trackId: "b"
          })
        );

      expect(
        result.trackAId
      ).toBe("a");

      expect(
        result.trackBId
      ).toBe("b");

      expect(
        result.overallScore
      ).toBeGreaterThanOrEqual(
        90
      );

      expect(
        result.grade
      ).toBe("exceptional");

      expect(
        result.confidence
      ).toBe("high");
    });

    it("penalizes incompatible tempo and keys", () => {
      const engine =
        new MashupCompatibilityEngine();

      const result =
        engine.compare(
          createTrack({
            trackId: "a",
            tempo: {
              bpm: 90,
              confidence: 0.9,
              halfTimeBpm: 45,
              doubleTimeBpm: 180,
              beatTimes: [],
              onsetTimes: []
            },
            key: {
              label: "C",
              tonic: 0,
              mode: "major",
              confidence: 0.9
            }
          }),
          createTrack({
            trackId: "b",
            tempo: {
              bpm: 128,
              confidence: 0.9,
              halfTimeBpm: 64,
              doubleTimeBpm: 256,
              beatTimes: [],
              onsetTimes: []
            },
            key: {
              label: "F#",
              tonic: 6,
              mode: "major",
              confidence: 0.9
            }
          })
        );

      expect(
        result.tempo.score
      ).toBe(0);

      expect(
        result.harmonic.score
      ).toBe(0);

      expect(
        result.overallScore
      ).toBeLessThan(55);

      expect(
        result.grade
      ).toBe("weak");
    });

    it("allows custom normalized weights", () => {
      const engine =
        new MashupCompatibilityEngine({
          tempo: 0.5,
          harmonic: 0.2,
          energy: 0.1,
          vocal: 0.1,
          structure: 0.1
        });

      const result =
        engine.compare(
          createTrack(),
          createTrack()
        );

      expect(
        result.weights.tempo
      ).toBe(0.5);
    });

    it("rejects invalid weights", () => {
      expect(
        () =>
          new MashupCompatibilityEngine({
            tempo: 1,
            harmonic: 1,
            energy: 0,
            vocal: 0,
            structure: 0
          })
      ).toThrow(
        "Compatibility weights must sum to 1."
      );
    });

    it("handles incomplete intelligence safely", () => {
      const engine =
        new MashupCompatibilityEngine();

      const result =
        engine.compare(
          createTrack({
            tempo: {
              bpm: null,
              confidence: null,
              halfTimeBpm: null,
              doubleTimeBpm: null,
              beatTimes: [],
              onsetTimes: []
            },
            key: {
              label: null,
              tonic: null,
              mode: "unknown",
              confidence: null
            },
            energy: "unknown",
            vocalProfile: "unknown",
            durationSeconds: null
          }),
          createTrack()
        );

      expect(
        result.overallScore
      ).toBeGreaterThanOrEqual(0);

      expect(
        result.overallScore
      ).toBeLessThanOrEqual(100);

      expect(
        result.confidence
      ).toBe("low");
    });
  }
);