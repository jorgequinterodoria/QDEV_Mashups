import {
  describe,
  expect,
  it
} from "vitest";

import {
  MashupBuilderService
} from "../../src/builder/service";

import type {
  MashupCandidate
} from "../../src/discovery/types";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

function track(
  trackId: string,
  bpm: number,
  keyLabel: string,
  tonic: number,
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
      bpm,
      confidence: 0.9,
      halfTimeBpm: bpm / 2,
      doubleTimeBpm: bpm * 2,
      beatTimes: [],
      onsetTimes: []
    },

    key: {
      label: keyLabel,
      tonic,
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

function candidate(
  trackAId: string,
  trackBId: string
): MashupCandidate {
  return {
    trackAId,
    trackBId,
    score: 95,
    grade: "exceptional",
    confidence: "high",

    compatibility: {
      trackAId,
      trackBId,
      calculatedAtMs: 1,
      overallScore: 95,
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
  "MashupBuilderService",
  () => {
    it("builds a preview-ready mashup plan", () => {
      const service =
        new MashupBuilderService();

      const result =
        service.build(
          candidate("a", "b"),
          track(
            "a",
            124,
            "Am",
            9,
            "likely-instrumental"
          ),
          track(
            "b",
            124,
            "Am",
            9,
            "likely-vocal"
          )
        );

      expect(
        result.baseTrack.role
      ).toBe("base");

      expect(
        result.secondaryTrack.role
      ).toBe("vocal");

      expect(
        result.targetBpm
      ).toBe(124);

      expect(
        result.targetKey.label
      ).toBe("Am");

      expect(
        result.readyForPreview
      ).toBe(true);

      expect(
        result.warnings
      ).toHaveLength(0);
    });

    it("detects excessive tempo changes", () => {
      const service =
        new MashupBuilderService();

      const result =
        service.build(
          candidate("a", "b"),
          track(
            "a",
            100,
            "Am",
            9,
            "likely-instrumental"
          ),
          track(
            "b",
            124,
            "Am",
            9,
            "likely-vocal"
          ),
          {
            targetBpm: 124,
            maxTempoChangePercent: 8
          }
        );

      expect(
        result.readyForPreview
      ).toBe(false);

      expect(
        result.warnings.some(
          (warning) =>
            warning.includes(
              "tempo change"
            )
        )
      ).toBe(true);
    });

    it("rejects mismatched candidate tracks", () => {
      const service =
        new MashupBuilderService();

      expect(() =>
        service.build(
          candidate("a", "b"),
          track(
            "wrong",
            124,
            "Am",
            9,
            "likely-instrumental"
          ),
          track(
            "b",
            124,
            "Am",
            9,
            "likely-vocal"
          )
        )
      ).toThrow(
        "Mashup candidate does not match the supplied tracks."
      );
    });

    it("rejects using the same track twice", () => {
      const service =
        new MashupBuilderService();

      expect(() =>
        service.build(
          candidate("a", "a"),
          track(
            "a",
            124,
            "Am",
            9,
            "likely-instrumental"
          ),
          track(
            "a",
            124,
            "Am",
            9,
            "likely-vocal"
          )
        )
      ).toThrow(
        "A mashup cannot be built from the same track twice."
      );
    });
  }
);