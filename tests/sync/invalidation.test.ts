import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AnalysisIntelligenceInvalidator
} from "../../src/sync/invalidation";

describe(
  "AnalysisIntelligenceInvalidator",
  () => {
    it("deduplicates and sorts invalidation IDs", async () => {
      const analysis = {
        invalidate:
          vi.fn()
            .mockResolvedValue(
              undefined
            )
      };

      const intelligence = {
        invalidate:
          vi.fn()
            .mockResolvedValue(
              undefined
            )
      };

      const invalidator =
        new AnalysisIntelligenceInvalidator(
          analysis,
          intelligence
        );

      await invalidator.invalidateAnalysis([
        "b",
        "a",
        "b"
      ]);

      await invalidator.invalidateIntelligence([
        "c",
        "a",
        "c"
      ]);

      expect(
        analysis.invalidate
      ).toHaveBeenCalledWith([
        "a",
        "b"
      ]);

      expect(
        intelligence.invalidate
      ).toHaveBeenCalledWith([
        "a",
        "c"
      ]);
    });

    it("does not call cache layers for empty input", async () => {
      const analysis = {
        invalidate:
          vi.fn()
      };

      const intelligence = {
        invalidate:
          vi.fn()
      };

      const invalidator =
        new AnalysisIntelligenceInvalidator(
          analysis,
          intelligence
        );

      await invalidator.invalidateAnalysis([]);
      await invalidator.invalidateIntelligence([]);

      expect(
        analysis.invalidate
      ).not.toHaveBeenCalled();

      expect(
        intelligence.invalidate
      ).not.toHaveBeenCalled();
    });
  }
);