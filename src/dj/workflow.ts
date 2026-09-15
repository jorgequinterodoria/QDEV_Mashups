import type {
  MashupBuildPlan
} from "../builder/types";

import type {
  MusicIntelligenceResult
} from "../intelligence/types";

import {
  createBeatGrid
} from "./beatgrid";

import {
  createCuePoints,
  createLoopPoints
} from "./cues";

import type {
  DJPreparationOptions,
  DJSessionOptions,
  DJTrackPreparation,
  DJMashupSession,
  DJWorkflowService
} from "./types";

const DEFAULT_MAX_CUES =
  16;

const DEFAULT_MAX_LOOPS =
  8;

export class DJWorkflowServiceImpl
  implements DJWorkflowService
{
  prepareTrack(
    track: MusicIntelligenceResult,
    sourcePath: string,
    options: DJPreparationOptions = {}
  ): DJTrackPreparation {
    const beatGrid =
      createBeatGrid(
        track
      );

    if (
      beatGrid === null
    ) {
      return {
        trackId:
          track.trackId,
        sourcePath,
        durationSeconds:
          track.durationSeconds,
        bpm:
          track.tempo.bpm,
        keyLabel:
          track.key.label,
        beatGrid: null,
        cuePoints: [],
        loops: []
      };
    }

    const cuePoints =
      createCuePoints(
        track,
        beatGrid,
        {
          maxCuePoints:
            Math.min(
              options.maxCuePoints ??
                DEFAULT_MAX_CUES,
              DEFAULT_MAX_CUES
            ),
          phraseBeats:
            options.phraseBeats,
          minimumCueSpacingSeconds:
            options.minimumCueSpacingSeconds
        }
      );

    const loops =
      createLoopPoints(
        track,
        beatGrid,
        {
          maxLoops:
            Math.min(
              options.maxLoops ??
                DEFAULT_MAX_LOOPS,
              DEFAULT_MAX_LOOPS
            ),
          loopBeats:
            options.loopBeats
        }
      );

    return {
      trackId:
        track.trackId,
      sourcePath,
      durationSeconds:
        track.durationSeconds,
      bpm:
        track.tempo.bpm,
      keyLabel:
        track.key.label,
      beatGrid,
      cuePoints,
      loops
    };
  }

  createSession(
    plan: MashupBuildPlan,
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult,
    options: DJSessionOptions
  ): DJMashupSession {
    validateSessionInputs(
      plan,
      trackA,
      trackB
    );

    const preparedA =
      this.prepareTrack(
        trackA,
        options.sourcePathA,
        options
      );

    const preparedB =
      this.prepareTrack(
        trackB,
        options.sourcePathB,
        options
      );

    const warnings = [
      ...createPreparationWarnings(
        preparedA
      ),
      ...createPreparationWarnings(
        preparedB
      )
    ];

    const uniqueWarnings =
      [
        ...new Set(
          warnings
        )
      ];

    const baseTrack =
      plan.baseTrack.trackId ===
        preparedA.trackId
        ? preparedA
        : preparedB;

    const secondaryTrack =
      plan.secondaryTrack.trackId ===
        preparedB.trackId
        ? preparedB
        : preparedA;

    return {
      sessionId:
        createSessionId(
          plan
        ),

      createdAtMs:
        Date.now(),

      targetBpm:
        plan.targetBpm,

      targetKey:
        plan.targetKey.label,

      baseTrackId:
        plan.baseTrack.trackId,

      secondaryTrackId:
        plan.secondaryTrack.trackId,

      baseTrack,

      secondaryTrack,

      recommendedSequence: [
        "Load base track",
        "Set target BPM",
        "Start from base Start cue",
        "Bring secondary track at Mix In",
        "Use Vocal Entry cue when applicable",
        "Transition at phrase boundary",
        "Use Mix Out / Outro for exit"
      ],

      compatibilityScore:
        plan.sourceCandidate
          .score,

      warnings:
        uniqueWarnings
    };
  }
}

function validateSessionInputs(
  plan: MashupBuildPlan,
  trackA: MusicIntelligenceResult,
  trackB: MusicIntelligenceResult
): void {
  if (
    trackA.trackId ===
    trackB.trackId
  ) {
    throw new Error(
      "A DJ session cannot contain the same track twice."
    );
  }

  const candidate =
    plan.sourceCandidate;

  const matches =
    (
      candidate.trackAId ===
        trackA.trackId &&
      candidate.trackBId ===
        trackB.trackId
    ) ||
    (
      candidate.trackAId ===
        trackB.trackId &&
      candidate.trackBId ===
        trackA.trackId
    );

  if (!matches) {
    throw new Error(
      "The DJ session tracks do not match the mashup candidate."
    );
  }
}

function createPreparationWarnings(
  preparation: DJTrackPreparation
): string[] {
  const warnings: string[] = [];

  if (
    preparation.bpm === null
  ) {
    warnings.push(
      `Track ${preparation.trackId} has no BPM.`
    );
  }

  if (
    preparation.beatGrid === null
  ) {
    warnings.push(
      `Track ${preparation.trackId} has no beatgrid.`
    );
  } else if (
    preparation.beatGrid.estimated
  ) {
    warnings.push(
      `Track ${preparation.trackId} uses an estimated beatgrid.`
    );
  }

  if (
    preparation.cuePoints.length === 0
  ) {
    warnings.push(
      `Track ${preparation.trackId} has no cue points.`
    );
  }

  return warnings;
}

function createSessionId(
  plan: MashupBuildPlan
): string {
  return [
    "dj",
    plan.planId
  ].join("::");
}