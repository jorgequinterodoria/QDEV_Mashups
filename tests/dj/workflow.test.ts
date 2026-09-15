import {
  describe,
  expect,
  it
} from "vitest";

import {
  DJWorkflowServiceImpl
} from "../../src/dj/workflow";

import type {
  MashupBuildPlan
} from "../../src/builder/types";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

function track(
  id: string,
  vocalProfile:
    MusicIntelligenceResult["vocalProfile"]
): MusicIntelligenceResult {
  return {
    trackId: id,
    analyzedAtMs: 1,
    sourceSizeBytes: 1,
    sourceModifiedTimeMs: 1,
    durationSeconds: 120,

    tempo: {
      bpm: 120,
      confidence: 1,
      halfTimeBpm: 60,
      doubleTimeBpm: 240,
      beatTimes:
        Array.from(
          {
            length: 240
          },
          (_, index) =>
            index * 0.5
        ),
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
    vocalProfile,
    analysisVersion: 1,
    error: null
  };
}

function plan():
  MashupBuildPlan {
  return {
    planId:
      "a::b::120::Am",

    sourceCandidate: {
      trackAId: "a",
      trackBId: "b",
      score: 95,
      grade: "exceptional",
      confidence: "high",
      compatibility:
        {} as never
    },

    baseTrack: {
      trackId: "a",
      role: "base",
      originalBpm: 120,
      targetBpm: 120,
      tempoRatio: 1,
      tempoPercentChange: 0,
      originalKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 1
      },
      targetKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 1
      },
      pitchAdjustment: {
        semitones: 0,
        cents: 0
      },
      durationSeconds: 120
    },

    secondaryTrack: {
      trackId: "b",
      role: "vocal",
      originalBpm: 120,
      targetBpm: 120,
      tempoRatio: 1,
      tempoPercentChange: 0,
      originalKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 1
      },
      targetKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 1
      },
      pitchAdjustment: {
        semitones: 0,
        cents: 0
      },
      durationSeconds: 120
    },

    targetBpm: 120,

    targetKey: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 1
    },

    estimatedDurationSeconds:
      120,

    readyForPreview: true,
    warnings: [],
    createdAtMs: 1
  };
}

describe(
  "DJWorkflowServiceImpl",
  () => {
    it("prepares a track with beatgrid, cues, and loops", () => {
      const service =
        new DJWorkflowServiceImpl();

      const result =
        service.prepareTrack(
          track(
            "a",
            "likely-instrumental"
          ),
          "/music/base.wav"
        );

      expect(
        result.trackId
      ).toBe("a");

      expect(
        result.beatGrid
      ).not.toBeNull();

      expect(
        result.cuePoints.length
      ).toBeGreaterThan(0);

      expect(
        result.loops.length
      ).toBeGreaterThan(0);
    });

    it("creates a DJ mashup session", () => {
      const service =
        new DJWorkflowServiceImpl();

      const result =
        service.createSession(
          plan(),
          track(
            "a",
            "likely-instrumental"
          ),
          track(
            "b",
            "likely-vocal"
          ),
          {
            sourcePathA:
              "/music/base.wav",
            sourcePathB:
              "/music/vocal.wav"
          }
        );

      expect(
        result.baseTrackId
      ).toBe("a");

      expect(
        result.secondaryTrackId
      ).toBe("b");

      expect(
        result.targetBpm
      ).toBe(120);

      expect(
        result.targetKey
      ).toBe("Am");

      expect(
        result.compatibilityScore
      ).toBe(95);

      expect(
        result.recommendedSequence.length
      ).toBeGreaterThan(0);
    });

    it("rejects tracks unrelated to the candidate", () => {
      const service =
        new DJWorkflowServiceImpl();

      expect(() =>
        service.createSession(
          plan(),
          track(
            "wrong",
            "likely-instrumental"
          ),
          track(
            "b",
            "likely-vocal"
          ),
          {
            sourcePathA:
              "/music/wrong.wav",
            sourcePathB:
              "/music/vocal.wav"
          }
        )
      ).toThrow(
        "The DJ session tracks do not match the mashup candidate."
      );
    });
  }
);