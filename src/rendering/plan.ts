import type {
  MashupTrackPlan
} from "../builder/types";

export interface AudioTransformPlan {
  trackId: string;
  stretchFactor: number | null;
  pitchSemitones: number;
  gainDb: number;
}

export function createAudioTransformPlan(
  track: MashupTrackPlan,
  gainDb: number
): AudioTransformPlan {
  return {
    trackId: track.trackId,

    stretchFactor:
      calculateStretchFactor(
        track.originalBpm,
        track.targetBpm
      ),

    pitchSemitones:
      track.pitchAdjustment.semitones,

    gainDb
  };
}

export function calculateStretchFactor(
  originalBpm: number | null,
  targetBpm: number | null
): number | null {
  if (
    originalBpm === null ||
    targetBpm === null ||
    !Number.isFinite(originalBpm) ||
    !Number.isFinite(targetBpm) ||
    originalBpm <= 0 ||
    targetBpm <= 0
  ) {
    return null;
  }

  return originalBpm / targetBpm;
}

export function hasTempoAdjustment(
  plan: AudioTransformPlan
): boolean {
  return (
    plan.stretchFactor !== null &&
    Math.abs(
      plan.stretchFactor - 1
    ) > 0.000001
  );
}

export function hasPitchAdjustment(
  plan: AudioTransformPlan
): boolean {
  return (
    Math.abs(
      plan.pitchSemitones
    ) > 0
  );
}