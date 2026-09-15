import type {
  CompatibilityConfidence,
  CompatibilityGrade
} from "../compatibility/types";

import type {
  MashupCandidate
} from "./types";

const CONFIDENCE_RANK: Record<
  CompatibilityConfidence,
  number
> = {
  high: 3,
  medium: 2,
  low: 1
};

const GRADE_RANK: Record<
  CompatibilityGrade,
  number
> = {
  exceptional: 6,
  excellent: 5,
  good: 4,
  possible: 3,
  weak: 2,
  incompatible: 1
};

export function rankMashupCandidates(
  candidates: MashupCandidate[]
): MashupCandidate[] {
  return [...candidates].sort(
    compareCandidates
  );
}

function compareCandidates(
  a: MashupCandidate,
  b: MashupCandidate
): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  const confidenceDifference =
    CONFIDENCE_RANK[b.confidence] -
    CONFIDENCE_RANK[a.confidence];

  if (confidenceDifference !== 0) {
    return confidenceDifference;
  }

  const gradeDifference =
    GRADE_RANK[b.grade] -
    GRADE_RANK[a.grade];

  if (gradeDifference !== 0) {
    return gradeDifference;
  }

  const trackAComparison =
    a.trackAId.localeCompare(
      b.trackAId
    );

  if (trackAComparison !== 0) {
    return trackAComparison;
  }

  return a.trackBId.localeCompare(
    b.trackBId
  );
}