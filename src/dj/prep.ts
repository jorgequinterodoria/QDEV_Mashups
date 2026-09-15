import type { MashupEnginePlan } from "../stems/mashup-engine.js";

export type DjCueType = "intro" | "mix-in" | "transition" | "mix-out" | "outro";

export interface DjBeatgrid {
  readonly bpm: number;
  readonly firstBeatSeconds: number;
  readonly beatsPerBar: 4;
  readonly confidence: number;
}

export interface DjCue {
  readonly id: string;
  readonly type: DjCueType;
  readonly positionSeconds: number;
  readonly label: string;
}

export interface DjPrepInput {
  readonly trackId: string;
  readonly sourcePath: string;
  readonly bpm: number;
  readonly durationSeconds: number;
  readonly firstBeatSeconds?: number;
  readonly beatgridConfidence?: number;
  readonly previewPath?: string | null;
}

export interface DjPrepOptions {
  readonly introBars?: number;
  readonly mixInBars?: number;
  readonly transitionBars?: number;
  readonly mixOutBars?: number;
  readonly outroBars?: number;
}

export interface DjPreparedTrack {
  readonly trackId: string;
  readonly sourcePath: string;
  readonly bpm: number;
  readonly durationSeconds: number;
  readonly beatgrid: DjBeatgrid;
  readonly cues: readonly DjCue[];
  readonly previewPath: string | null;
}

export interface MashupDjPrep {
  readonly schemaVersion: 1;
  readonly mashupPlanFingerprint: string;
  readonly primary: DjPreparedTrack;
  readonly secondary: DjPreparedTrack;
  readonly generatedAtMs: number;
}

export class DjPrepError extends Error {
  readonly code:
    | "INVALID_TRACK"
    | "INVALID_BPM"
    | "INVALID_DURATION"
    | "INVALID_BEATGRID"
    | "INVALID_CUE"
    | "INVALID_PLAN";

  constructor(code: DjPrepError["code"], message: string) {
    super(message);
    this.name = "DjPrepError";
    this.code = code;
  }
}

function assertBpm(value: number): void {
  if (!Number.isFinite(value) || value < 30 || value > 300) {
    throw new DjPrepError("INVALID_BPM", "El BPM debe estar entre 30 y 300.");
  }
}

function assertDuration(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DjPrepError("INVALID_DURATION", "La duración debe ser mayor que cero.");
  }
}

function assertConfidence(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new DjPrepError(
      "INVALID_BEATGRID",
      "La confianza del beatgrid debe estar entre 0 y 1."
    );
  }
}

function barsToSeconds(bars: number, bpm: number): number {
  if (!Number.isInteger(bars) || bars < 0) {
    throw new DjPrepError("INVALID_CUE", "Las barras deben ser enteros no negativos.");
  }
  return (bars * 4 * 60) / bpm;
}

function assertCue(cue: DjCue, duration: number): void {
  if (!cue.id.trim() || !cue.label.trim()) {
    throw new DjPrepError("INVALID_CUE", "El cue debe tener id y etiqueta.");
  }
  if (!Number.isFinite(cue.positionSeconds) || cue.positionSeconds < 0 || cue.positionSeconds > duration) {
    throw new DjPrepError("INVALID_CUE", `Cue fuera de rango: ${cue.id}.`);
  }
}

function fingerprint(plan: MashupEnginePlan): string {
  const value = JSON.stringify(plan);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function prepareTrack(input: DjPrepInput, o: Required<DjPrepOptions>): DjPreparedTrack {
  if (!input.trackId.trim() || !input.sourcePath.trim()) {
    throw new DjPrepError("INVALID_TRACK", "trackId y sourcePath son obligatorios.");
  }

  assertBpm(input.bpm);
  assertDuration(input.durationSeconds);

  const firstBeat = input.firstBeatSeconds ?? 0;
  const confidence = input.beatgridConfidence ?? 1;

  if (!Number.isFinite(firstBeat) || firstBeat < 0 || firstBeat > input.durationSeconds) {
    throw new DjPrepError("INVALID_BEATGRID", "El primer beat no es válido.");
  }
  assertConfidence(confidence);

  const candidates: DjCue[] = [
    {
      id: "intro",
      type: "intro",
      positionSeconds: firstBeat,
      label: "Intro"
    },
    {
      id: "mix-in",
      type: "mix-in",
      positionSeconds: firstBeat + barsToSeconds(o.introBars + o.mixInBars, input.bpm),
      label: "Entrada"
    },
    {
      id: "transition",
      type: "transition",
      positionSeconds:
        input.durationSeconds -
        barsToSeconds(o.transitionBars, input.bpm),
      label: "Transición"
    },
    {
      id: "mix-out",
      type: "mix-out",
      positionSeconds:
        input.durationSeconds -
        barsToSeconds(o.mixOutBars, input.bpm),
      label: "Salida"
    },
    {
      id: "outro",
      type: "outro",
      positionSeconds:
        input.durationSeconds -
        barsToSeconds(o.outroBars, input.bpm),
      label: "Outro"
    }
  ];

  const cues = candidates
    .map((cue) => ({
      ...cue,
      positionSeconds: Number(
        Math.min(
          input.durationSeconds,
          Math.max(firstBeat, cue.positionSeconds)
        ).toFixed(6)
      )
    }))
    .sort((a, b) => a.positionSeconds - b.positionSeconds);

  cues.forEach((cue) => assertCue(cue, input.durationSeconds));

  return {
    trackId: input.trackId,
    sourcePath: input.sourcePath,
    bpm: input.bpm,
    durationSeconds: input.durationSeconds,
    beatgrid: {
      bpm: input.bpm,
      firstBeatSeconds: firstBeat,
      beatsPerBar: 4,
      confidence
    },
    cues,
    previewPath: input.previewPath ?? null
  };
}

const DEFAULTS: Required<DjPrepOptions> = {
  introBars: 2,
  mixInBars: 1,
  transitionBars: 2,
  mixOutBars: 1,
  outroBars: 2
};

export class DjPrepService {
  private readonly options: Required<DjPrepOptions>;

  constructor(options: DjPrepOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  prepare(
    plan: MashupEnginePlan,
    primary: DjPrepInput,
    secondary: DjPrepInput
  ): MashupDjPrep {
    if (plan.schemaVersion !== 1) {
      throw new DjPrepError("INVALID_PLAN", "Plan de mashup incompatible.");
    }

    const a = prepareTrack(primary, this.options);
    const b = prepareTrack(secondary, this.options);

    if (a.trackId === b.trackId) {
      throw new DjPrepError("INVALID_TRACK", "Los tracks deben ser diferentes.");
    }

    return {
      schemaVersion: 1,
      mashupPlanFingerprint: fingerprint(plan),
      primary: a,
      secondary: b,
      generatedAtMs: Date.now()
    };
  }

  static validate(value: MashupDjPrep): MashupDjPrep {
    if (value.schemaVersion !== 1) {
      throw new DjPrepError("INVALID_PLAN", "Versión DJ Prep incompatible.");
    }

    for (const track of [value.primary, value.secondary]) {
      assertBpm(track.bpm);
      assertDuration(track.durationSeconds);
      assertConfidence(track.beatgrid.confidence);
      if (track.beatgrid.bpm !== track.bpm || track.beatgrid.beatsPerBar !== 4) {
        throw new DjPrepError("INVALID_BEATGRID", "Beatgrid inconsistente.");
      }
      track.cues.forEach((cue) => assertCue(cue, track.durationSeconds));
    }

    return structuredClone(value);
  }
}
