import audio from "audio";

import type {
  MashupRenderer,
  RenderInput,
  RenderOptions,
  RenderResult
} from "./types";

import {
  assertOutputIsNotInput,
  ensureInputFile,
  ensureOutputDirectory
} from "./path";

import {
  createAudioTransformPlan,
  hasPitchAdjustment,
  hasTempoAdjustment
} from "./plan";

const DEFAULT_PREVIEW_DURATION =
  30;

const DEFAULT_BASE_GAIN_DB =
  -3;

const DEFAULT_SECONDARY_GAIN_DB =
  -6;

const DEFAULT_FADE_IN_SECONDS =
  0.25;

const DEFAULT_FADE_OUT_SECONDS =
  0.5;

const DEFAULT_SAMPLE_RATE =
  44100;

const DEFAULT_CHANNELS =
  2;

export class AudioMashupRenderer
  implements MashupRenderer
{
  async render(
    input: RenderInput,
    options: RenderOptions
  ): Promise<RenderResult> {
    validateInput(input);

    const outputPath =
      await ensureOutputDirectory(
        options.outputPath
      );

    const baseTrackPath =
      await ensureInputFile(
        input.baseTrackPath
      );

    const secondaryTrackPath =
      await ensureInputFile(
        input.secondaryTrackPath
      );

    assertOutputIsNotInput(
      outputPath,
      [
        baseTrackPath,
        secondaryTrackPath
      ]
    );

    const mode =
      options.mode ?? "preview";

    const baseGain =
      options.baseGainDb ??
      DEFAULT_BASE_GAIN_DB;

    const secondaryGain =
      options.secondaryGainDb ??
      DEFAULT_SECONDARY_GAIN_DB;

    const fadeIn =
      options.fadeInSeconds ??
      DEFAULT_FADE_IN_SECONDS;

    const fadeOut =
      options.fadeOutSeconds ??
      DEFAULT_FADE_OUT_SECONDS;

    const basePlan =
      createAudioTransformPlan(
        input.plan.baseTrack,
        baseGain
      );

    const secondaryPlan =
      createAudioTransformPlan(
        input.plan.secondaryTrack,
        secondaryGain
      );

    const base =
      audio(baseTrackPath);

    const secondary =
      audio(secondaryTrackPath);

    await Promise.all([
      base,
      secondary
    ]);

    applyTransforms(
      base,
      basePlan
    );

    applyTransforms(
      secondary,
      secondaryPlan
    );

    const mix =
      base.mix(
        secondary,
        {
          at: 0
        }
      );

    if (fadeIn > 0) {
      mix.fade(
        fadeIn,
        "linear"
      );
    }

    const renderDuration =
      resolveRenderDuration(
        mode,
        options.previewDurationSeconds,
        input.plan.estimatedDurationSeconds,
        base.duration,
        secondary.duration
      );

    if (
      fadeOut > 0 &&
      renderDuration > 0
    ) {
      mix.fade(
        fadeOut,
        "cos"
      );
    }

    if (options.normalize !== false) {
      mix.normalize(
        "streaming"
      );
    }

    await mix.save(
      outputPath,
      {
        duration:
          renderDuration
      }
    );

    const finalAudio =
      audio(outputPath);

    await finalAudio;

    const finalDuration =
      Math.min(
        renderDuration,
        finalAudio.duration
      );

    return {
      outputPath,
      mode,
      durationSeconds:
        finalDuration,
      sampleRate:
        DEFAULT_SAMPLE_RATE,
      channels:
        DEFAULT_CHANNELS,
      baseTrackId:
        input.plan.baseTrack.trackId,
      secondaryTrackId:
        input.plan.secondaryTrack.trackId,
      tempoApplied:
        hasTempoAdjustment(
          basePlan
        ) ||
        hasTempoAdjustment(
          secondaryPlan
        ),
      pitchApplied:
        hasPitchAdjustment(
          basePlan
        ) ||
        hasPitchAdjustment(
          secondaryPlan
        ),
      normalized:
        options.normalize !== false
    };
  }
}

function applyTransforms(
  track: ReturnType<typeof audio>,
  plan: ReturnType<
    typeof createAudioTransformPlan
  >
): void {
  if (
    plan.stretchFactor !== null &&
    Math.abs(
      plan.stretchFactor - 1
    ) > 0.000001
  ) {
    track.stretch(
      plan.stretchFactor
    );
  }

  if (
    Math.abs(
      plan.pitchSemitones
    ) > 0
  ) {
    track.pitch(
      plan.pitchSemitones
    );
  }

  if (
    Math.abs(plan.gainDb) > 0
  ) {
    track.gain(
      plan.gainDb
    );
  }
}

function resolveRenderDuration(
  mode: "preview" | "full",
  previewDurationSeconds:
    | number
    | undefined,
  estimatedDurationSeconds:
    | number
    | null,
  baseDuration: number,
  secondaryDuration: number
): number {
  const availableDuration =
    Math.min(
      baseDuration,
      secondaryDuration
    );

  if (
    !Number.isFinite(
      availableDuration
    ) ||
    availableDuration <= 0
  ) {
    throw new Error(
      "Unable to determine a valid render duration."
    );
  }

  if (mode === "full") {
    return Math.min(
      availableDuration,
      estimatedDurationSeconds ??
        availableDuration
    );
  }

  const requested =
    previewDurationSeconds ??
    DEFAULT_PREVIEW_DURATION;

  if (
    !Number.isFinite(requested) ||
    requested <= 0
  ) {
    throw new Error(
      "previewDurationSeconds must be greater than zero."
    );
  }

  return Math.min(
    requested,
    availableDuration
  );
}

function validateInput(
  input: RenderInput
): void {
  if (
    input.plan.baseTrack.trackId ===
    input.plan.secondaryTrack.trackId
  ) {
    throw new Error(
      "A mashup cannot render the same track twice."
    );
  }

  if (
    input.plan.sourceCandidate
      .trackAId ===
    input.plan.sourceCandidate
      .trackBId
  ) {
    throw new Error(
      "A mashup candidate cannot reference the same track twice."
    );
  }

  if (
    !input.baseTrackPath ||
    !input.secondaryTrackPath
  ) {
    throw new Error(
      "Both source audio paths are required."
    );
  }
}