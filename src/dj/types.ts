import type {
  MashupBuildPlan
} from "../builder/types";

import type {
  MusicIntelligenceResult
} from "../intelligence/types";

export type DJCueType =
  | "start"
  | "mix-in"
  | "vocal-entry"
  | "phrase"
  | "drop"
  | "breakdown"
  | "mix-out"
  | "outro";

export type DJCueColor =
  | "green"
  | "blue"
  | "yellow"
  | "red"
  | "purple"
  | "orange"
  | "white";

export interface DJCuePoint {
  id: number;
  type: DJCueType;
  label: string;
  timeSeconds: number;
  beatNumber: number | null;
  color: DJCueColor;
  estimated: boolean;
}

export interface DJLoop {
  id: number;
  label: string;
  startSeconds: number;
  endSeconds: number;
  beats: number;
  estimated: boolean;
}

export interface DJBeatGrid {
  bpm: number;
  firstBeatSeconds: number;
  beatIntervalSeconds: number;
  phaseOffsetSeconds: number;
  beatTimes: number[];
  confidence: number;
  estimated: boolean;
}

export interface DJTrackPreparation {
  trackId: string;
  sourcePath: string;
  durationSeconds: number | null;
  bpm: number | null;
  keyLabel: string | null;
  beatGrid: DJBeatGrid | null;
  cuePoints: DJCuePoint[];
  loops: DJLoop[];
}

export interface DJMashupSession {
  sessionId: string;
  createdAtMs: number;

  targetBpm: number | null;
  targetKey: string | null;

  baseTrackId: string;
  secondaryTrackId: string;

  baseTrack: DJTrackPreparation;
  secondaryTrack: DJTrackPreparation;

  recommendedSequence: string[];

  compatibilityScore: number;

  warnings: string[];
}

export interface DJPreparationOptions {
  maxCuePoints?: number;
  maxLoops?: number;
  phraseBeats?: number;
  loopBeats?: number[];
  minimumCueSpacingSeconds?: number;
}

export interface DJSessionOptions
  extends DJPreparationOptions {
  sourcePathA: string;
  sourcePathB: string;
}

export interface DJWorkflowService {
  prepareTrack(
    track: MusicIntelligenceResult,
    sourcePath: string,
    options?: DJPreparationOptions
  ): DJTrackPreparation;

  createSession(
    plan: MashupBuildPlan,
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult,
    options: DJSessionOptions
  ): DJMashupSession;
}

export interface DJSessionExporter {
  export(
    session: DJMashupSession,
    outputDirectory: string
  ): Promise<{
    manifestPath: string;
    playlistPath: string;
  }>;
}