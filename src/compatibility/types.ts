import type {
  EnergyLevel,
  MusicIntelligenceResult,
  VocalProfile
} from "../intelligence/types";

export type CompatibilityGrade =
  | "exceptional"
  | "excellent"
  | "good"
  | "possible"
  | "weak"
  | "incompatible";

export type CompatibilityConfidence =
  | "high"
  | "medium"
  | "low";

export interface CompatibilityWeights {
  tempo: number;
  harmonic: number;
  energy: number;
  vocal: number;
  structure: number;
}

export interface TempoCompatibility {
  score: number;
  normalizedDifferenceBpm: number | null;
  effectiveBpmA: number | null;
  effectiveBpmB: number | null;
  ratio: number | null;
  compatible: boolean;
}

export interface HarmonicCompatibility {
  score: number;
  keyA: string | null;
  keyB: string | null;
  camelotA: string | null;
  camelotB: string | null;
  semitoneDistance: number | null;
  compatible: boolean;
}

export interface EnergyCompatibility {
  score: number;
  energyA: EnergyLevel;
  energyB: EnergyLevel;
  distance: number | null;
}

export interface VocalCompatibility {
  score: number;
  profileA: VocalProfile;
  profileB: VocalProfile;
  roleCompatible: boolean;
}

export interface StructureCompatibility {
  score: number;
  durationDifferenceSeconds: number | null;
  normalizedDurationDifference: number | null;
}

export interface MashupCompatibilityResult {
  trackAId: string;
  trackBId: string;
  calculatedAtMs: number;

  overallScore: number;
  grade: CompatibilityGrade;
  confidence: CompatibilityConfidence;

  tempo: TempoCompatibility;
  harmonic: HarmonicCompatibility;
  energy: EnergyCompatibility;
  vocal: VocalCompatibility;
  structure: StructureCompatibility;

  weights: CompatibilityWeights;
}

export interface CompatibilityEngine {
  compare(
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult
  ): MashupCompatibilityResult;
}