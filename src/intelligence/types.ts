export type MusicalMode =
  | "major"
  | "minor"
  | "unknown";

export type EnergyLevel =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high"
  | "unknown";

export type VocalProfile =
  | "likely-vocal"
  | "likely-instrumental"
  | "unknown";

export interface TempoAnalysis {
  bpm: number | null;
  confidence: number | null;
  halfTimeBpm: number | null;
  doubleTimeBpm: number | null;
  beatTimes: number[];
  onsetTimes: number[];
}

export interface KeyAnalysis {
  label: string | null;
  tonic: number | null;
  mode: MusicalMode;
  confidence: number | null;
}

export interface ChordAnalysis {
  startTimeSeconds: number;
  durationSeconds: number;
  label: string;
  confidence: number | null;
}

export interface SpectralAnalysis {
  rms: number | null;
  loudnessLufs: number | null;
  spectralCentroidHz: number | null;
  spectralFlatness: number | null;
  spectralRolloffHz: number | null;
  zeroCrossingRate: number | null;
}

export interface MusicIntelligenceResult {
  trackId: string;
  analyzedAtMs: number;
  sourceSizeBytes: number;
  sourceModifiedTimeMs: number;
  durationSeconds: number | null;
  tempo: TempoAnalysis;
  key: KeyAnalysis;
  chords: ChordAnalysis[];
  spectral: SpectralAnalysis;
  energy: EnergyLevel;
  vocalProfile: VocalProfile;
  analysisVersion: number;
  error: string | null;
}

export interface MusicIntelligenceAnalysisOptions {
  maxAnalysisSeconds?: number;
  startSeconds?: number;
}

export interface MusicIntelligenceEngine {
  analyze(
    absolutePath: string,
    options?: MusicIntelligenceAnalysisOptions
  ): Promise<MusicIntelligenceEngineResult>;
}

export interface MusicIntelligenceEngineResult {
  durationSeconds: number | null;
  tempo: TempoAnalysis;
  key: KeyAnalysis;
  chords: ChordAnalysis[];
  spectral: SpectralAnalysis;
}