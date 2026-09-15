import {
  describe,
  expect,
  it
} from "vitest";

import {
  assignMashupRoles
} from "../../src/builder/roles";

import type {
  MashupCandidate
} from "../../src/discovery/types";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

function track(
  trackId: string,
  vocalProfile:
    MusicIntelligenceResult["vocalProfile"]
): MusicIntelligenceResult {
  return {
    trackId,
    analyzedAtMs: 1,
    sourceSizeBytes: 1,
    sourceModifiedTimeMs: 1,
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
    vocalProfile,
    analysisVersion: 1,
    error: null
  };
}

function candidate(): MashupCandidate {
  return {
    trackAId: "a",
    trackBId: "b",
    score: 90,
    grade: "exceptional",
    confidence: "high",
    compatibility: {
      trackAId: "a",
      trackBId: "b",
      calculatedAtMs: 1,
      overallScore: 90,
      grade: "exceptional",
      confidence: "high",

      tempo: {
        score: 100,
        normalizedDifferenceBpm: 0,
        effectiveBpmA: 124,
        effectiveBpmB: 124,
        ratio: 1,
        compatible: true
      },

      harmonic: {
        score: 100,
        keyA: "Am",
        keyB: "Am",
        camelotA: "8A",
        camelotB: "8A",
        semitoneDistance: 0,
        compatible: true
      },

      energy: {
        score: 100,
        energyA: "medium",
        energyB: "medium",
        distance: 0
      },

      vocal: {
        score: 100,
        profileA: "likely-instrumental",
        profileB: "likely-vocal",
        roleCompatible: true
      },

      structure: {
        score: 100,
        durationDifferenceSeconds: 0,
        normalizedDurationDifference: 0
      },

      weights: {
        tempo: 0.25,
        harmonic: 0.3,
        energy: 0.15,
        vocal: 0.15,
        structure: 0.15
      }
    }
  };
}

describe(
  "assignMashupRoles",
  () => {
    it("assigns instrumental as base and vocal as vocal", () => {
      const result =
        assignMashupRoles(
          candidate(),
          track(
            "a",
            "likely-instrumental"
          ),
          track(
            "b",
            "likely-vocal"
          )
        );

      expect(
        result.trackA
      ).toBe("base");

      expect(
        result.trackB
      ).toBe("vocal");
    });

    it("assigns the inverse roles when the vocal track is A", () => {
      const result =
        assignMashupRoles(
          candidate(),
          track(
            "a",
            "likely-vocal"
          ),
          track(
            "b",
            "likely-instrumental"
          )
        );

      expect(
        result.trackA
      ).toBe("vocal");

      expect(
        result.trackB
      ).toBe("base");
    });

    it("uses hybrid roles when vocal information is unknown", () => {
      const result =
        assignMashupRoles(
          candidate(),
          track(
            "a",
            "unknown"
          ),
          track(
            "b",
            "unknown"
          )
        );

      expect(
        result.trackA
      ).toBe("hybrid");

      expect(
        result.trackB
      ).toBe("hybrid");
    });
  }
);