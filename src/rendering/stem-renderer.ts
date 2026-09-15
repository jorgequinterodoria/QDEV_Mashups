import { mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";

import type {
  MashupEnginePlan,
  MashupStemSelection
} from "../stems/mashup-engine.js";
import type { StemChannel } from "../stems/types.js";
import { STEM_CHANNELS } from "../stems/types.js";

export interface StemRendererOptions {
  readonly ffmpegExecutable?: string;
  readonly outputDirectory?: string;
}

export interface StemRenderRequest {
  readonly plan: MashupEnginePlan;
  readonly outputPath: string;
  readonly sampleRate?: number;
  readonly channels?: number;
  readonly overwrite?: boolean;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress01: number, message: string) => void;
}

export interface StemRenderResult {
  readonly outputPath: string;
  readonly durationSeconds: number;
  readonly sampleRate: number;
  readonly channels: number;
  readonly sourceSelections: number;
}

export class StemRendererError extends Error {
  readonly code:
    | "INVALID_PLAN"
    | "INVALID_OUTPUT"
    | "FFMPEG_UNAVAILABLE"
    | "FFMPEG_FAILED"
    | "CANCELLED";

  constructor(
    code: StemRendererError["code"],
    message: string
  ) {
    super(message);
    this.name = "StemRendererError";
    this.code = code;
  }
}

function validateChannel(channel: StemChannel): void {
  if (!(STEM_CHANNELS as readonly string[]).includes(channel)) {
    throw new StemRendererError(
      "INVALID_PLAN",
      `Canal no válido: ${String(channel)}.`
    );
  }
}

function validateSelection(selection: MashupStemSelection): void {
  validateChannel(selection.channel);

  if (!selection.sourceTrackId.trim()) {
    throw new StemRendererError(
      "INVALID_PLAN",
      "Cada selección debe tener un sourceTrackId."
    );
  }

  for (const value of [
    selection.gainDb,
    selection.pan,
    selection.offsetSeconds,
    selection.startSeconds,
    selection.durationSeconds
  ]) {
    if (!Number.isFinite(value)) {
      throw new StemRendererError(
        "INVALID_PLAN",
        "El plan contiene valores numéricos no válidos."
      );
    }
  }

  if (
    selection.gainDb < -60 ||
    selection.gainDb > 12 ||
    selection.pan < -1 ||
    selection.pan > 1 ||
    selection.offsetSeconds < 0 ||
    selection.startSeconds < 0 ||
    selection.durationSeconds <= 0
  ) {
    throw new StemRendererError(
      "INVALID_PLAN",
      `La selección ${selection.channel} contiene parámetros fuera de rango.`
    );
  }
}

function validatePlan(plan: MashupEnginePlan): void {
  if (plan.schemaVersion !== 1) {
    throw new StemRendererError(
      "INVALID_PLAN",
      "Versión de plan no compatible."
    );
  }

  if (
    !Number.isFinite(plan.durationSeconds) ||
    plan.durationSeconds <= 0 ||
    !Number.isFinite(plan.transitionSeconds) ||
    plan.transitionSeconds < 0 ||
    plan.transitionSeconds > plan.durationSeconds
  ) {
    throw new StemRendererError(
      "INVALID_PLAN",
      "La duración o transición del plan no es válida."
    );
  }

  for (const selection of plan.selectedChannels) {
    validateSelection(selection);
  }
}

function buildFilter(selection: MashupStemSelection): string {
  const safeGain = selection.gainDb.toFixed(6);
  const left = ((1 - selection.pan) / 2).toFixed(6);
  const right = ((1 + selection.pan) / 2).toFixed(6);
  const delayMs = Math.round(selection.offsetSeconds * 1000);
  const trimStart = selection.startSeconds.toFixed(6);
  const trimDuration = selection.durationSeconds.toFixed(6);

  return [
    `atrim=start=${trimStart}:duration=${trimDuration}`,
    "asetpts=PTS-STARTPTS",
    `volume=${safeGain}dB`,
    `pan=stereo|c0=FL*${left}+FR*0|c1=FL*0+FR*${right}`,
    `adelay=${delayMs}|${delayMs}`
  ].join(",");
}

async function assertOutputParent(outputPath: string): Promise<void> {
  if (!outputPath.trim()) {
    throw new StemRendererError(
      "INVALID_OUTPUT",
      "La ruta de salida no puede estar vacía."
    );
  }

  const parent = dirname(resolve(outputPath));
  await mkdir(parent, { recursive: true });
}

async function ensureInputFiles(
  selections: readonly MashupStemSelection[]
): Promise<Map<string, string>> {
  const existing = new Map<string, string>();

  for (const selection of selections) {
    const key = `${selection.sourceTrackId}:${selection.channel}`;
    if (existing.has(key)) {
      continue;
    }

    try {
      const metadata = await stat(selection.sourceTrackId);
      if (!metadata.isFile() || metadata.size <= 0) {
        throw new Error("no es un archivo válido");
      }
    } catch {
      throw new StemRendererError(
        "INVALID_PLAN",
        `No se encontró el stem de origen: ${selection.sourceTrackId}.`
      );
    }

    existing.set(key, selection.sourceTrackId);
  }

  return existing;
}

export class StemRenderer {
  private readonly ffmpegExecutable: string;

  constructor(options: StemRendererOptions = {}) {
    this.ffmpegExecutable = options.ffmpegExecutable ?? "ffmpeg";
  }

  async render(request: StemRenderRequest): Promise<StemRenderResult> {
    validatePlan(request.plan);

    const included = request.plan.selectedChannels.filter(
      (selection) => selection.action === "include"
    );

    if (included.length === 0) {
      throw new StemRendererError(
        "INVALID_PLAN",
        "El plan no contiene stems incluidos para renderizar."
      );
    }

    await assertOutputParent(request.outputPath);

    if (request.overwrite === false) {
      try {
        await stat(request.outputPath);
        throw new StemRendererError(
          "INVALID_OUTPUT",
          `El archivo de salida ya existe: ${request.outputPath}.`
        );
      } catch (error) {
        if (error instanceof StemRendererError) {
          throw error;
        }
      }
    }

    await ensureInputFiles(included);

    if (request.signal?.aborted) {
      throw new StemRendererError(
        "CANCELLED",
        "El renderizado fue cancelado antes de comenzar."
      );
    }

    const uniqueInputs = [
      ...new Set(included.map((selection) => selection.sourceTrackId))
    ];

    const inputIndex = new Map(uniqueInputs.map((path, index) => [path, index]));

    const filterParts = included.map((selection) => {
      const input = inputIndex.get(selection.sourceTrackId);
      if (input === undefined) {
        throw new StemRendererError(
          "INVALID_PLAN",
          `No se pudo resolver el input del stem ${selection.channel}.`
        );
      }

      return `[${input}:a]${buildFilter(selection)}[stem${input}-${selection.channel}]`;
    });

    const labels = included
      .map(
        (selection) =>
          `[stem${inputIndex.get(selection.sourceTrackId)}-${selection.channel}]`
      )
      .join("");

    filterParts.push(
      `${labels}amix=inputs=${included.length}:duration=longest:dropout_transition=0[aout]`
    );

    const sampleRate = request.sampleRate ?? 48000;
    const channels = request.channels ?? 2;

    if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
      throw new StemRendererError(
        "INVALID_OUTPUT",
        "La frecuencia de muestreo no es válida."
      );
    }

    if (channels !== 1 && channels !== 2) {
      throw new StemRendererError(
        "INVALID_OUTPUT",
        "El número de canales debe ser 1 o 2."
      );
    }

    const outputArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      ...(request.overwrite === false ? ["-n"] : ["-y"]),
      ...uniqueInputs.flatMap((input) => ["-i", input]),
      "-filter_complex",
      filterParts.join(";"),
      "-map",
      "[aout]",
      "-t",
      String(request.plan.durationSeconds),
      "-ar",
      String(sampleRate),
      "-ac",
      String(channels),
      "-c:a",
      "pcm_s16le",
      request.outputPath
    ];

    request.onProgress?.(0, "Iniciando renderizado profesional...");

    const result = await this.runFfmpeg(
      outputArgs,
      request.signal,
      request.onProgress
    );

    if (result.exitCode !== 0) {
      throw new StemRendererError(
        "FFMPEG_FAILED",
        result.stderr || `ffmpeg terminó con código ${result.exitCode}.`
      );
    }

    const outputMetadata = await stat(request.outputPath).catch(() => null);

    if (!outputMetadata || outputMetadata.size <= 0) {
      throw new StemRendererError(
        "FFMPEG_FAILED",
        "ffmpeg terminó correctamente pero no produjo un archivo válido."
      );
    }

    request.onProgress?.(1, "Renderizado completado.");

    return {
      outputPath: request.outputPath,
      durationSeconds: request.plan.durationSeconds,
      sampleRate,
      channels,
      sourceSelections: included.length
    };
  }

  private runFfmpeg(
    args: readonly string[],
    signal?: AbortSignal,
    onProgress?: (progress01: number, message: string) => void
  ): Promise<{ exitCode: number; stderr: string }> {
    const run = (): Promise<{ exitCode: number; stderr: string }> =>
      new Promise<{ exitCode: number; stderr: string }>((resolvePromise) => {
        let stderr = "";
        let settled = false;

        const child = spawn(this.ffmpegExecutable, args, {
          stdio: ["ignore", "ignore", "pipe"]
        });

        const finish = (result: {
          exitCode: number;
          stderr: string;
        }): void => {
          if (settled) {
            return;
          }
          settled = true;
          signal?.removeEventListener("abort", abort);
          resolvePromise(result);
        };

        const abort = (): void => {
          child.kill("SIGTERM");
          onProgress?.(0, "Cancelando renderizado...");
          finish({
            exitCode: -1,
            stderr: "cancelled"
          });
        };

        child.on("error", (error) => {
          finish({
            exitCode: -1,
            stderr:
              error instanceof Error
                ? `No se pudo ejecutar ffmpeg: ${error.message}`
                : String(error)
          });
        });

        child.stderr.on("data", (chunk: Buffer | string) => {
          stderr += chunk.toString();
        });

        child.on("close", (code) => {
          finish({
            exitCode: code ?? -1,
            stderr
          });
        });

        if (signal) {
          if (signal.aborted) {
            abort();
            return;
          }

          signal.addEventListener("abort", abort, { once: true });
        }
      });

    return run().then(
      (result): { exitCode: number; stderr: string } => {
        if (result.stderr === "cancelled") {
          throw new StemRendererError(
            "CANCELLED",
            "El renderizado fue cancelado."
          );
        }

        if (
          result.exitCode === -1 &&
          result.stderr.startsWith("No se pudo ejecutar ffmpeg:")
        ) {
          throw new StemRendererError("FFMPEG_UNAVAILABLE", result.stderr);
        }

        return result;
      }
    );
  }
}

export const DEFAULT_STEM_RENDER_OUTPUT_DIRECTORY = join(
  process.cwd(),
  "renders"
);
