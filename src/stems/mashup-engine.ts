import type { StemChannel } from "./types.js";
import { STEM_CHANNELS, StemSeparationError } from "./types.js";

export type MashupStemAction = "include" | "exclude";

export interface MashupTrackProfile {
  readonly trackId: string;
  readonly title: string;
  readonly bpm: number;
  readonly key: string;
  readonly durationSeconds: number;
  readonly stems: Readonly<Record<StemChannel, string>>;
}

export interface MashupStemSelection {
  readonly channel: StemChannel;
  readonly sourceTrackId: string;
  readonly action: MashupStemAction;
  readonly gainDb: number;
  readonly pan: number;
  readonly offsetSeconds: number;
  readonly startSeconds: number;
  readonly durationSeconds: number;
}

export interface MashupEngineOptions {
  readonly bpmTolerancePercent?: number;
  readonly maxDurationSeconds?: number;
}

export interface MashupEngineInput {
  readonly primary: MashupTrackProfile;
  readonly secondary: MashupTrackProfile;
  readonly selectedChannels?: readonly StemChannel[];
  readonly secondaryChannels?: readonly StemChannel[];
  readonly primaryGainDb?: number;
  readonly secondaryGainDb?: number;
  readonly transitionSeconds?: number;
}

export interface MashupEnginePlan {
  readonly schemaVersion: 1;
  readonly primaryTrackId: string;
  readonly secondaryTrackId: string;
  readonly bpmRatio: number;
  readonly bpmCompatible: boolean;
  readonly selectedChannels: readonly MashupStemSelection[];
  readonly transitionSeconds: number;
  readonly durationSeconds: number;
}

const DEFAULT_BPM_TOLERANCE_PERCENT = 8;
const DEFAULT_MAX_DURATION_SECONDS = 900;

export class MashupEngineError extends Error {
  readonly code:
    | "INVALID_TRACK"
    | "INCOMPATIBLE_BPM"
    | "INVALID_CHANNEL"
    | "INVALID_GAIN"
    | "INVALID_PAN"
    | "INVALID_DURATION"
    | "INVALID_TRANSITION";

  constructor(
    code: MashupEngineError["code"],
    message: string
  ) {
    super(message);
    this.name = "MashupEngineError";
    this.code = code;
  }
}

function finitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new MashupEngineError(
      "INVALID_TRACK",
      `${label} debe ser un número finito mayor que cero.`
    );
  }
}

function validateTrack(track: MashupTrackProfile): void {
  if (!track.trackId.trim()) {
    throw new MashupEngineError("INVALID_TRACK", "El trackId no puede estar vacío.");
  }

  finitePositive(track.bpm, "El BPM");
  finitePositive(track.durationSeconds, "La duración");

  for (const channel of STEM_CHANNELS) {
    const path = track.stems[channel];
    if (!path || !path.trim()) {
      throw new MashupEngineError(
        "INVALID_TRACK",
        `Falta el stem ${channel} en ${track.trackId}.`
      );
    }
  }
}

function validateGain(value: number): void {
  if (!Number.isFinite(value) || value < -60 || value > 12) {
    throw new MashupEngineError(
      "INVALID_GAIN",
      "La ganancia debe estar entre -60 dB y +12 dB."
    );
  }
}

function validatePan(value: number): void {
  if (!Number.isFinite(value) || value < -1 || value > 1) {
    throw new MashupEngineError(
      "INVALID_PAN",
      "El panorama debe estar entre -1 y +1."
    );
  }
}

function validateChannels(
  channels: readonly StemChannel[]
): readonly StemChannel[] {
  const unique = [...new Set(channels)];

  for (const channel of unique) {
    if (!(STEM_CHANNELS as readonly string[]).includes(channel)) {
      throw new MashupEngineError(
        "INVALID_CHANNEL",
        `Canal no válido: ${String(channel)}.`
      );
    }
  }

  return unique;
}

export class MashupStemEngine {
  private readonly bpmTolerancePercent: number;
  private readonly maxDurationSeconds: number;

  constructor(options: MashupEngineOptions = {}) {
    this.bpmTolerancePercent =
      options.bpmTolerancePercent ?? DEFAULT_BPM_TOLERANCE_PERCENT;
    this.maxDurationSeconds =
      options.maxDurationSeconds ?? DEFAULT_MAX_DURATION_SECONDS;

    if (
      !Number.isFinite(this.bpmTolerancePercent) ||
      this.bpmTolerancePercent < 0
    ) {
      throw new MashupEngineError(
        "INVALID_TRACK",
        "La tolerancia BPM no es válida."
      );
    }

    finitePositive(this.maxDurationSeconds, "La duración máxima");
  }

  build(input: MashupEngineInput): MashupEnginePlan {
    validateTrack(input.primary);
    validateTrack(input.secondary);

    if (input.primary.trackId === input.secondary.trackId) {
      throw new MashupEngineError(
        "INVALID_TRACK",
        "El track primario y secundario deben ser diferentes."
      );
    }

    const ratio = input.secondary.bpm / input.primary.bpm;
    const percentDifference = Math.abs(ratio - 1) * 100;

    if (percentDifference > this.bpmTolerancePercent) {
      throw new MashupEngineError(
        "INCOMPATIBLE_BPM",
        `Los BPM difieren un ${percentDifference.toFixed(2)}%, fuera de la tolerancia de ${this.bpmTolerancePercent}%.`
      );
    }

    const primaryChannels = validateChannels(
      input.selectedChannels ?? STEM_CHANNELS
    );
    const secondaryChannels = validateChannels(
      input.secondaryChannels ?? []
    );

    const primaryGain = input.primaryGainDb ?? 0;
    const secondaryGain = input.secondaryGainDb ?? 0;
    validateGain(primaryGain);
    validateGain(secondaryGain);

    const transitionSeconds = input.transitionSeconds ?? 8;
    if (
      !Number.isFinite(transitionSeconds) ||
      transitionSeconds < 0 ||
      transitionSeconds > Math.min(input.primary.durationSeconds, input.secondary.durationSeconds)
    ) {
      throw new MashupEngineError(
        "INVALID_TRANSITION",
        "La duración de transición no es válida."
      );
    }

    const durationSeconds = Math.min(
      this.maxDurationSeconds,
      Math.min(input.primary.durationSeconds, input.secondary.durationSeconds)
    );

    if (durationSeconds <= 0) {
      throw new MashupEngineError(
        "INVALID_DURATION",
        "El plan no tiene una duración válida."
      );
    }

    const selections: MashupStemSelection[] = [];

    for (const channel of primaryChannels) {
      selections.push({
        channel,
        sourceTrackId: input.primary.trackId,
        action: "include",
        gainDb: primaryGain,
        pan: 0,
        offsetSeconds: 0,
        startSeconds: 0,
        durationSeconds
      });
    }

    for (const channel of secondaryChannels) {
      selections.push({
        channel,
        sourceTrackId: input.secondary.trackId,
        action: "include",
        gainDb: secondaryGain,
        pan: 0,
        offsetSeconds: 0,
        startSeconds: 0,
        durationSeconds
      });
    }

    return {
      schemaVersion: 1,
      primaryTrackId: input.primary.trackId,
      secondaryTrackId: input.secondary.trackId,
      bpmRatio: ratio,
      bpmCompatible: true,
      selectedChannels: selections,
      transitionSeconds,
      durationSeconds
    };
  }

  static exclude(
    plan: MashupEnginePlan,
    sourceTrackId: string,
    channel: StemChannel
  ): MashupEnginePlan {
    if (!(STEM_CHANNELS as readonly string[]).includes(channel)) {
      throw new MashupEngineError(
        "INVALID_CHANNEL",
        `Canal no válido: ${String(channel)}.`
      );
    }

    return {
      ...plan,
      selectedChannels: plan.selectedChannels.map((selection) =>
        selection.sourceTrackId === sourceTrackId &&
        selection.channel === channel
          ? { ...selection, action: "exclude" }
          : selection
      )
    };
  }

  static validate(plan: MashupEnginePlan): MashupEnginePlan {
    if (plan.schemaVersion !== 1) {
      throw new MashupEngineError(
        "INVALID_TRACK",
        "Versión de plan de mashup no compatible."
      );
    }

    finitePositive(plan.bpmRatio, "La relación BPM");
    finitePositive(plan.durationSeconds, "La duración");
    if (!Number.isFinite(plan.transitionSeconds) || plan.transitionSeconds < 0) {
      throw new MashupEngineError(
        "INVALID_TRANSITION",
        "La transición no es válida."
      );
    }

    for (const selection of plan.selectedChannels) {
      if (!(STEM_CHANNELS as readonly string[]).includes(selection.channel)) {
        throw new MashupEngineError(
          "INVALID_CHANNEL",
          `Canal no válido: ${String(selection.channel)}.`
        );
      }
      if (!selection.sourceTrackId.trim()) {
        throw new MashupEngineError(
          "INVALID_TRACK",
          "El sourceTrackId no puede estar vacío."
        );
      }
      validateGain(selection.gainDb);
      validatePan(selection.pan);
      if (
        !Number.isFinite(selection.startSeconds) ||
        selection.startSeconds < 0 ||
        !Number.isFinite(selection.durationSeconds) ||
        selection.durationSeconds <= 0 ||
        !Number.isFinite(selection.offsetSeconds)
      ) {
        throw new MashupEngineError(
          "INVALID_DURATION",
          "La selección de stem contiene tiempos inválidos."
        );
      }
    }

    return {
      ...plan,
      selectedChannels: plan.selectedChannels.map((selection) => ({
        ...selection
      }))
    };
  }
}

export { StemSeparationError };
