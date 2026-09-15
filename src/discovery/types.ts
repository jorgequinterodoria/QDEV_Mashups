import type {
  CompatibilityGrade,
  CompatibilityConfidence,
  MashupCompatibilityResult
} from "../compatibility/types";

import type {
  MusicIntelligenceResult
} from "../intelligence/types";

export interface MashupCandidate {
  trackAId: string;
  trackBId: string;

  score: number;
  grade: CompatibilityGrade;
  confidence: CompatibilityConfidence;

  compatibility: MashupCompatibilityResult;
}

export interface DiscoveryOptions {
  maxResults?: number;
  minimumScore?: number;
  minimumConfidence?: CompatibilityConfidence;
  includeWeak?: boolean;
}

export interface MashupDiscoveryResult {
  sourceTrackId: string | null;
  candidates: MashupCandidate[];
  totalEvaluatedPairs: number;
  totalCompatiblePairs: number;
}

export interface MashupDiscoveryEngine {
  discover(
    tracks: MusicIntelligenceResult[],
    options?: DiscoveryOptions
  ): MashupDiscoveryResult;

  discoverForTrack(
    sourceTrack: MusicIntelligenceResult,
    tracks: MusicIntelligenceResult[],
    options?: DiscoveryOptions
  ): MashupDiscoveryResult;
}