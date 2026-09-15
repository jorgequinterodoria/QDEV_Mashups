import type {
  CompatibilityConfidence,
  CompatibilityEngine,
  MashupCompatibilityResult
} from "../compatibility/types";

import type {
  MusicIntelligenceResult
} from "../intelligence/types";

import {
  rankMashupCandidates
} from "./ranking";

import type {
  DiscoveryOptions,
  MashupCandidate,
  MashupDiscoveryEngine,
  MashupDiscoveryResult
} from "./types";

const DEFAULT_MAX_RESULTS = 20;
const DEFAULT_MINIMUM_SCORE = 55;

const CONFIDENCE_RANK: Record<
  CompatibilityConfidence,
  number
> = {
  low: 1,
  medium: 2,
  high: 3
};

export class MashupDiscoveryService
  implements MashupDiscoveryEngine
{
  constructor(
    private readonly compatibilityEngine: CompatibilityEngine
  ) {}

  discover(
    tracks: MusicIntelligenceResult[],
    options: DiscoveryOptions = {}
  ): MashupDiscoveryResult {
    const normalizedOptions =
      normalizeOptions(options);

    const uniqueTracks =
      deduplicateTracks(tracks);

    const candidates: MashupCandidate[] = [];

    let totalEvaluatedPairs = 0;

    for (
      let index = 0;
      index < uniqueTracks.length;
      index += 1
    ) {
      const trackA =
        uniqueTracks[index];

      if (trackA === undefined) {
        continue;
      }

      for (
        let nextIndex = index + 1;
        nextIndex < uniqueTracks.length;
        nextIndex += 1
      ) {
        const trackB =
          uniqueTracks[nextIndex];

        if (trackB === undefined) {
          continue;
        }

        totalEvaluatedPairs += 1;

        const compatibility =
          this.compatibilityEngine.compare(
            trackA,
            trackB
          );

        if (
          !isCandidateEligible(
            compatibility,
            normalizedOptions
          )
        ) {
          continue;
        }

        candidates.push(
          createCandidate(
            compatibility
          )
        );
      }
    }

    const ranked =
      rankMashupCandidates(
        candidates
      );

    return {
      sourceTrackId: null,
      candidates: ranked.slice(
        0,
        normalizedOptions.maxResults
      ),
      totalEvaluatedPairs,
      totalCompatiblePairs:
        candidates.length
    };
  }

  discoverForTrack(
    source: MusicIntelligenceResult,
    tracks: MusicIntelligenceResult[],
    options: DiscoveryOptions = {}
  ): MashupDiscoveryResult {
    const normalizedOptions =
      normalizeOptions(options);

    const uniqueTracks =
      deduplicateTracks(tracks);

    const candidates: MashupCandidate[] = [];

    let totalEvaluatedPairs = 0;

    for (const track of uniqueTracks) {
      if (
        track.trackId ===
        source.trackId
      ) {
        continue;
      }

      totalEvaluatedPairs += 1;

      const compatibility =
        this.compatibilityEngine.compare(
          source,
          track
        );

      if (
        !isCandidateEligible(
          compatibility,
          normalizedOptions
        )
      ) {
        continue;
      }

      candidates.push(
        createCandidate(
          compatibility
        )
      );
    }

    const ranked =
      rankMashupCandidates(
        candidates
      );

    return {
      sourceTrackId:
        source.trackId,
      candidates: ranked.slice(
        0,
        normalizedOptions.maxResults
      ),
      totalEvaluatedPairs,
      totalCompatiblePairs:
        candidates.length
    };
  }
}

interface NormalizedDiscoveryOptions {
  maxResults: number;
  minimumScore: number;
  minimumConfidence:
    CompatibilityConfidence;
  includeWeak: boolean;
}

function normalizeOptions(
  options: DiscoveryOptions
): NormalizedDiscoveryOptions {
  const maxResults =
    options.maxResults ??
    DEFAULT_MAX_RESULTS;

  const minimumScore =
    options.minimumScore ??
    DEFAULT_MINIMUM_SCORE;

  if (
    !Number.isInteger(maxResults) ||
    maxResults < 1
  ) {
    throw new Error(
      "Discovery maxResults must be a positive integer."
    );
  }

  if (
    !Number.isFinite(minimumScore) ||
    minimumScore < 0 ||
    minimumScore > 100
  ) {
    throw new Error(
      "Discovery minimumScore must be between 0 and 100."
    );
  }

  return {
    maxResults,
    minimumScore,
    minimumConfidence:
      options.minimumConfidence ??
      "low",
    includeWeak:
      options.includeWeak ?? false
  };
}

function isCandidateEligible(
  compatibility: MashupCompatibilityResult,
  options: NormalizedDiscoveryOptions
): boolean {
  if (
    compatibility.overallScore <
    options.minimumScore
  ) {
    return false;
  }

  if (
    CONFIDENCE_RANK[
      compatibility.confidence
    ] <
    CONFIDENCE_RANK[
      options.minimumConfidence
    ]
  ) {
    return false;
  }

  if (
    !options.includeWeak &&
    compatibility.grade === "weak"
  ) {
    return false;
  }

  if (
    compatibility.grade ===
    "incompatible"
  ) {
    return false;
  }

  return true;
}

function createCandidate(
  compatibility: MashupCompatibilityResult
): MashupCandidate {
  return {
    trackAId:
      compatibility.trackAId,
    trackBId:
      compatibility.trackBId,
    score:
      compatibility.overallScore,
    grade:
      compatibility.grade,
    confidence:
      compatibility.confidence,
    compatibility
  };
}

function deduplicateTracks(
  tracks: MusicIntelligenceResult[]
): MusicIntelligenceResult[] {
  const byId =
    new Map<
      string,
      MusicIntelligenceResult
    >();

  for (const track of tracks) {
    if (!byId.has(track.trackId)) {
      byId.set(
        track.trackId,
        track
      );
    }
  }

  return [...byId.values()].sort(
    (a, b) =>
      a.trackId.localeCompare(
        b.trackId
      )
  );
}