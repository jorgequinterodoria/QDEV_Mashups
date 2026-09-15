import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculateTempoCompatibility
} from "../../src/compatibility/tempo";

function tempo(
  bpm: number | null
) {
  return {
    bpm,
    confidence: null,
    halfTimeBpm:
      bpm === null ? null : bpm / 2,
    doubleTimeBpm:
      bpm === null ? null : bpm * 2,
    beatTimes: [],
    onsetTimes: []
  };
}

describe(
  "calculateTempoCompatibility",
  () => {
    it("gives maximum score to equal BPM", () => {
      const result =
        calculateTempoCompatibility(
          tempo(124),
          tempo(124)
        );

      expect(result.score).toBe(
        100
      );

      expect(
        result.compatible
      ).toBe(true);
    });

    it("recognizes half-time compatibility", () => {
      const result =
        calculateTempoCompatibility(
          tempo(124),
          tempo(62)
        );

      expect(result.score).toBe(
        100
      );

      expect(
        result.effectiveBpmB
      ).toBe(124);
    });

    it("recognizes double-time compatibility", () => {
      const result =
        calculateTempoCompatibility(
          tempo(128),
          tempo(64)
        );

      expect(result.score).toBe(
        100
      );
    });

    it("rejects missing BPM", () => {
      const result =
        calculateTempoCompatibility(
          tempo(null),
          tempo(128)
        );

      expect(result.score).toBe(0);
      expect(result.compatible).toBe(
        false
      );
    });

    it("penalizes large tempo differences", () => {
      const result =
        calculateTempoCompatibility(
          tempo(90),
          tempo(128)
        );

      expect(result.score).toBe(0);
      expect(result.compatible).toBe(
        false
      );
    });
  }
);