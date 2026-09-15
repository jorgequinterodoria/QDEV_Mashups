import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculatePitchAdjustment,
  chooseTargetKey
} from "../../src/builder/harmonic";

import type {
  KeyAnalysis
} from "../../src/intelligence/types";

function key(
  label: string,
  tonic: number,
  mode:
    | "major"
    | "minor"
): KeyAnalysis {
  return {
    label,
    tonic,
    mode,
    confidence: 0.9
  };
}

describe(
  "builder harmonic",
  () => {
    it("uses the first valid key as target", () => {
      expect(
        chooseTargetKey(
          key("Am", 9, "minor"),
          key("C", 0, "major")
        ).label
      ).toBe("Am");
    });

    it("calculates upward pitch adjustment", () => {
      const result =
        calculatePitchAdjustment(
          key("C", 0, "major"),
          key("D", 2, "major")
        );

      expect(
        result.semitones
      ).toBe(2);

      expect(
        result.cents
      ).toBe(0);
    });

    it("uses the shortest chromatic distance", () => {
      const result =
        calculatePitchAdjustment(
          key("B", 11, "major"),
          key("C", 0, "major")
        );

      expect(
        result.semitones
      ).toBe(1);
    });

    it("returns zero when tonic information is unavailable", () => {
      const result =
        calculatePitchAdjustment(
          {
            label: null,
            tonic: null,
            mode: "unknown",
            confidence: null
          },
          key("C", 0, "major")
        );

      expect(
        result.semitones
      ).toBe(0);
    });
  }
);