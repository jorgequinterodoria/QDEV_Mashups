import type {
  MashupCandidate
} from "../discovery/types";

import type {
  KeyAnalysis,
  MusicIntelligenceResult
} from "../intelligence/types";

export type MashupRole =
  | "base"
  | "vocal"
  | "melodic"
  | "hybrid";

export type PitchAdjustment = {
  semitones: number;
  cents: number;
};

export interface MashupTrackPlan {
  trackId: string;
  role: MashupRole;

  originalBpm: number | null;
  targetBpm: number | null;

  tempoRatio: number | null;
  tempoPercentChange: number | null;

  originalKey: KeyAnalysis;
  targetKey: KeyAnalysis;

  pitchAdjustment: PitchAdjustment;

  durationSeconds: number | null;
}

export interface MashupBuildPlan {
  planId: string;

  sourceCandidate: MashupCandidate;

  baseTrack: MashupTrackPlan;
  secondaryTrack: MashupTrackPlan;

  targetBpm: number | null;
  targetKey: KeyAnalysis;

  estimatedDurationSeconds:
    number | null;

  readyForPreview: boolean;
  warnings: string[];

  createdAtMs: number;
}

export interface MashupBuilderOptions {
  targetBpm?: number;
  targetKey?: KeyAnalysis;
  maxPitchShiftSemitones?: number;
  maxTempoChangePercent?: number;
}

export interface MashupBuilder {
  build(
    candidate: MashupCandidate,
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult,
    options?: MashupBuilderOptions
  ): MashupBuildPlan;
}