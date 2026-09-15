import {
  describe,
  expect,
  it
} from "vitest";

import {
  rankMashupCandidates
} from "../../src/discovery/ranking";

import type {
  MashupCandidate
} from "../../src/discovery/types";

function candidate(
  overrides: Partial<MashupCandidate>
): MashupCandidate {
  return {
    trackAId: "a",
    trackBId: "b",
    score: 80,
    grade: "excellent",
    confidence: "high",
    compatibility:
      {} as MashupCandidate["compatibility"],
    ...overrides
  };
}

describe(
  "rankMashupCandidates",
  () => {
    it("ranks by score descending", () => {
      const result =
        rankMashupCandidates([
          candidate({
            trackAId: "a",
            trackBId: "c",
            score: 70
          }),
          candidate({
            trackAId: "a",
            trackBId: "b",
            score: 95
          }),
          candidate({
            trackAId: "a",
            trackBId: "d",
            score: 82
          })
        ]);

      expect(
        result.map(
          (item) => item.score
        )
      ).toEqual([
        95,
        82,
        70
      ]);
    });

    it("uses confidence as a deterministic tie breaker", () => {
      const result =
        rankMashupCandidates([
          candidate({
            trackBId: "low",
            score: 80,
            confidence: "low"
          }),
          candidate({
            trackBId: "high",
            score: 80,
            confidence: "high"
          }),
          candidate({
            trackBId: "medium",
            score: 80,
            confidence: "medium"
          })
        ]);

      expect(
        result.map(
          (item) => item.trackBId
        )
      ).toEqual([
        "high",
        "medium",
        "low"
      ]);
    });

    it("is deterministic when all ranking fields are equal", () => {
      const result =
        rankMashupCandidates([
          candidate({
            trackAId: "b",
            trackBId: "z",
            score: 80
          }),
          candidate({
            trackAId: "a",
            trackBId: "z",
            score: 80
          })
        ]);

      expect(
        result.map(
          (item) =>
            `${item.trackAId}:${item.trackBId}`
        )
      ).toEqual([
        "a:z",
        "b:z"
      ]);
    });
  }
);