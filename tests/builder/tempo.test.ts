import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculateTempoAdjustment,
  chooseTargetBpm
} from "../../src/builder/tempo";

describe(
  "builder tempo",
  () => {
    it("calculates tempo ratio and percentage", () => {
      const result =
        calculateTempoAdjustment(
          120,
          126
        );

      expect(
        result.ratio
      ).toBeCloseTo(1.05);

      expect(
        result.percentChange
      ).toBeCloseTo(5);
    });

    it("handles missing BPM", () => {
      const result =
        calculateTempoAdjustment(
          null,
          120
        );

      expect(
        result.ratio
      ).toBeNull();

      expect(
        result.percentChange
      ).toBeNull();
    });

    it("chooses a valid target BPM", () => {
      expect(
        chooseTargetBpm(
          124,
          62
        )
      ).toBe(124);
    });

    it("returns the available BPM when one is missing", () => {
      expect(
        chooseTargetBpm(
          128,
          null
        )
      ).toBe(128);
    });
  }
);