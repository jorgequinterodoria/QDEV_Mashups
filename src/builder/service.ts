import type {
  MashupCandidate
} from "../discovery/types";

import type {
  MusicIntelligenceResult
} from "../intelligence/types";

import {
  calculatePitchAdjustment,
  chooseTargetKey
} from "./harmonic";

import {
  assignMashupRoles
} from "./roles";

import {
  calculateTempoAdjustment,
  chooseTargetBpm
} from "./tempo";

import type {
  MashupBuildPlan,
  MashupBuilder,
  MashupBuilderOptions,
  MashupRole,
  MashupTrackPlan
} from "./types";

const DEFAULT_MAX_PITCH_SHIFT =
  6;

const DEFAULT_MAX_TEMPO_CHANGE =
  8;

export class MashupBuilderService
  implements MashupBuilder
{
  build(
    candidate: MashupCandidate,
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult,
    options: MashupBuilderOptions = {}
  ): MashupBuildPlan {
    validateCandidateTracks(
      candidate,
      trackA,
      trackB
    );

    const maxPitchShift =
      options.maxPitchShiftSemitones ??
      DEFAULT_MAX_PITCH_SHIFT;

    const maxTempoChange =
      options.maxTempoChangePercent ??
      DEFAULT_MAX_TEMPO_CHANGE;

    validateLimits(
      maxPitchShift,
      maxTempoChange
    );

    const roles =
      assignMashupRoles(
        candidate,
        trackA,
        trackB
      );

    const targetBpm =
      options.targetBpm ??
      chooseTargetBpm(
        trackA.tempo.bpm,
        trackB.tempo.bpm
      );

    const targetKey =
      options.targetKey ??
      chooseTargetKey(
        trackA.key,
        trackB.key
      );

    const baseTrack =
      createTrackPlan(
        trackA,
        roles.trackA,
        targetBpm,
        targetKey
      );

    const secondaryTrack =
      createTrackPlan(
        trackB,
        roles.trackB,
        targetBpm,
        targetKey
      );

    const warnings =
      collectWarnings(
        baseTrack,
        secondaryTrack,
        maxPitchShift,
        maxTempoChange
      );

    return {
      planId: createPlanId(
        candidate,
        targetBpm,
        targetKey
      ),

      sourceCandidate: candidate,

      baseTrack,
      secondaryTrack,

      targetBpm,
      targetKey,

      estimatedDurationSeconds:
        estimateDuration(
          baseTrack,
          secondaryTrack
        ),

      readyForPreview:
        warnings.length === 0,

      warnings,

      createdAtMs:
        Date.now()
    };
  }
}

function createTrackPlan(
  track: MusicIntelligenceResult,
  role: MashupRole,
  targetBpm: number | null,
  targetKey: MusicIntelligenceResult["key"]
): MashupTrackPlan {
  const tempo =
    calculateTempoAdjustment(
      track.tempo.bpm,
      targetBpm
    );

  const pitch =
    calculatePitchAdjustment(
      track.key,
      targetKey
    );

  return {
    trackId:
      track.trackId,

    role,

    originalBpm:
      track.tempo.bpm,

    targetBpm,

    tempoRatio:
      tempo.ratio,

    tempoPercentChange:
      tempo.percentChange,

    originalKey:
      track.key,

    targetKey: {
      ...targetKey
    },

    pitchAdjustment: pitch,

    durationSeconds:
      track.durationSeconds
  };
}

function collectWarnings(
  baseTrack: MashupTrackPlan,
  secondaryTrack: MashupTrackPlan,
  maxPitchShift: number,
  maxTempoChange: number
): string[] {
  const warnings: string[] = [];

  for (const track of [
    baseTrack,
    secondaryTrack
  ]) {
    if (
      track.tempoPercentChange !==
        null &&
      Math.abs(
        track.tempoPercentChange
      ) > maxTempoChange
    ) {
      warnings.push(
        `Track ${track.trackId} requires ${formatPercent(track.tempoPercentChange)} tempo change.`
      );
    }

    if (
      Math.abs(
        track.pitchAdjustment.semitones
      ) > maxPitchShift
    ) {
      warnings.push(
        `Track ${track.trackId} requires ${track.pitchAdjustment.semitones} semitones of pitch adjustment.`
      );
    }

    if (
      track.originalBpm === null ||
      track.targetBpm === null
    ) {
      warnings.push(
        `Track ${track.trackId} has insufficient tempo information.`
      );
    }

    if (
      track.originalKey.mode ===
      "unknown" ||
      track.targetKey.mode ===
      "unknown"
    ) {
      warnings.push(
        `Track ${track.trackId} has incomplete harmonic information.`
      );
    }
  }

  return [
    ...new Set(warnings)
  ];
}

function estimateDuration(
  baseTrack: MashupTrackPlan,
  secondaryTrack: MashupTrackPlan
): number | null {
  const durations = [
    baseTrack.durationSeconds,
    secondaryTrack.durationSeconds
  ].filter(
    (
      duration
    ): duration is number =>
      duration !== null &&
      Number.isFinite(duration) &&
      duration > 0
  );

  if (durations.length === 0) {
    return null;
  }

  return Math.min(
    ...durations
  );
}

function validateCandidateTracks(
  candidate: MashupCandidate,
  trackA: MusicIntelligenceResult,
  trackB: MusicIntelligenceResult
): void {
  const idsMatch =
    candidate.trackAId ===
      trackA.trackId &&
    candidate.trackBId ===
      trackB.trackId;

  if (!idsMatch) {
    throw new Error(
      "Mashup candidate does not match the supplied tracks."
    );
  }

  if (
    trackA.trackId === trackB.trackId
  ) {
    throw new Error(
      "A mashup cannot be built from the same track twice."
    );
  }
}

function validateLimits(
  maxPitchShift: number,
  maxTempoChange: number
): void {
  if (
    !Number.isFinite(maxPitchShift) ||
    maxPitchShift < 0 ||
    maxPitchShift > 12
  ) {
    throw new Error(
      "maxPitchShiftSemitones must be between 0 and 12."
    );
  }

  if (
    !Number.isFinite(maxTempoChange) ||
    maxTempoChange < 0 ||
    maxTempoChange > 100
  ) {
    throw new Error(
      "maxTempoChangePercent must be between 0 and 100."
    );
  }
}

function createPlanId(
  candidate: MashupCandidate,
  targetBpm: number | null,
  targetKey: MusicIntelligenceResult["key"]
): string {
  return [
    candidate.trackAId,
    candidate.trackBId,
    targetBpm ?? "unknown",
    targetKey.label ?? "unknown"
  ].join("::");
}

function formatPercent(
  value: number
): string {
  const rounded =
    Math.round(value * 100) / 100;

  return `${rounded}%`;
}