import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculateEnergyCompatibility,
  calculateStructureCompatibility,
  calculateVocalCompatibility
} from "../../src/compatibility/scoring";

describe(
  "calculateEnergyCompatibility",
  () => {
    it("scores equal energy at 100", () => {
      const result =
        calculateEnergyCompatibility(
          "high",
          "high"
        );

      expect(result.score).toBe(
        100
      );

      expect(result.distance).toBe(
        0
      );
    });

    it("penalizes large energy gaps", () => {
      const result =
        calculateEnergyCompatibility(
          "very-low",
          "very-high"
        );

      expect(result.score).toBe(
        10
      );

      expect(result.distance).toBe(
        4
      );
    });

    it("handles unknown energy", () => {
      const result =
        calculateEnergyCompatibility(
          "unknown",
          "high"
        );

      expect(result.score).toBe(0);
      expect(result.distance).toBeNull();
    });
  }
);

describe(
  "calculateVocalCompatibility",
  () => {
    it("prefers vocal plus instrumental", () => {
      const result =
        calculateVocalCompatibility(
          "likely-vocal",
          "likely-instrumental"
        );

      expect(result.score).toBe(
        100
      );

      expect(
        result.roleCompatible
      ).toBe(true);
    });

    it("penalizes two vocal tracks", () => {
      const result =
        calculateVocalCompatibility(
          "likely-vocal",
          "likely-vocal"
        );

      expect(result.score).toBe(
        45
      );

      expect(
        result.roleCompatible
      ).toBe(false);
    });

    it("keeps unknown profiles neutral", () => {
      const result =
        calculateVocalCompatibility(
          "unknown",
          "likely-vocal"
        );

      expect(result.score).toBe(
        50
      );
    });
  }
);

describe(
  "calculateStructureCompatibility",
  () => {
    it("scores equal durations at 100", () => {
      const result =
        calculateStructureCompatibility(
          {
            durationSeconds: 240
          } as never,
          {
            durationSeconds: 240
          } as never
        );

      expect(result.score).toBe(
        100
      );

      expect(
        result.durationDifferenceSeconds
      ).toBe(0);
    });

    it("penalizes substantially different durations", () => {
      const result =
        calculateStructureCompatibility(
          {
            durationSeconds: 120
          } as never,
          {
            durationSeconds: 300
          } as never
        );

      expect(
        result.score
      ).toBeLessThan(55);
    });

    it("handles missing duration", () => {
      const result =
        calculateStructureCompatibility(
          {
            durationSeconds: null
          } as never,
          {
            durationSeconds: 240
          } as never
        );

      expect(result.score).toBe(
        50
      );

      expect(
        result.normalizedDurationDifference
      ).toBeNull();
    });
  }
);