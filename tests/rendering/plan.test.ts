import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculateStretchFactor,
  createAudioTransformPlan,
  hasPitchAdjustment,
  hasTempoAdjustment
} from "../../src/rendering/plan";

import type {
  MashupTrackPlan
} from "../../src/builder/types";

function trackPlan(): MashupTrackPlan {
  return {
    trackId: "track-a",
    role: "base",
    originalBpm: 120,
    targetBpm: 126,
    tempoRatio: 1.05,
    tempoPercentChange: 5,
    originalKey: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 0.9
    },
    targetKey: {
      label: "Bm",
      tonic: 11,
      mode: "minor",
      confidence: 0.9
    },
    pitchAdjustment: {
      semitones: 2,
      cents: 0
    },
    durationSeconds: 240
  };
}

describe(
  "rendering plan",
  () => {
    it("calculates the inverse stretch factor", () => {
      expect(
        calculateStretchFactor(
          120,
          126
        )
      ).toBeCloseTo(
        120 / 126
      );
    });

    it("returns null when BPM is unavailable", () => {
      expect(
        calculateStretchFactor(
          null,
          126
        )
      ).toBeNull();
    });

    it("creates a complete transform plan", () => {
      const result =
        createAudioTransformPlan(
          trackPlan(),
          -3
        );

      expect(
        result.trackId
      ).toBe("track-a");

      expect(
        result.stretchFactor
      ).toBeCloseTo(
        120 / 126
      );

      expect(
        result.pitchSemitones
      ).toBe(2);

      expect(
        result.gainDb
      ).toBe(-3);
    });

    it("detects tempo adjustment", () => {
      const result =
        createAudioTransformPlan(
          trackPlan(),
          -3
        );

      expect(
        hasTempoAdjustment(result)
      ).toBe(true);
    });

    it("detects pitch adjustment", () => {
      const result =
        createAudioTransformPlan(
          trackPlan(),
          -3
        );

      expect(
        hasPitchAdjustment(result)
      ).toBe(true);
    });
  }
);