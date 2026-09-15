import { spawn } from "node:child_process";
import { access, mkdir, open, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  StemChannel,
  StemSeparationProvider,
  StemSeparationProviderRequest,
  StemSeparationProviderResult
} from "./types.js";
import {
  STEM_CHANNELS,
  StemSeparationError,
  assertFourStemChannels
} from "./types.js";

export const MLX_DEMUCS_ENGINE_VERSION = "mlx-demucs-direct-v1";

export interface MlxDemucsProviderOptions {
  readonly pythonExecutable?: string;
  readonly workerScript?: string;
  readonly modelVersion?: string;
}

const STEM_FILE_NAMES: Record<StemChannel, string> = {
  vocals: "vocals.wav",
  drums: "drums.wav",
  bass: "bass.wav",
  other: "other.wav"
};

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));

function defaultWorkerScript(): string {
  const candidates = [
    process.env.QDEV_STEMS_WORKER?.trim(),
    resolve(process.cwd(), "tools/mlx-demucs-worker.py"),
    resolve(MODULE_DIRECTORY, "../../tools/mlx-demucs-worker.py"),
    resolve(MODULE_DIRECTORY, "../../../tools/mlx-demucs-worker.py")
  ].filter((value): value is string => Boolean(value));

  return candidates[0] ?? resolve(process.cwd(), "tools/mlx-demucs-worker.py");
}

function defaultPythonExecutable(): string {
  return (
    process.env.QDEV_STEMS_PYTHON?.trim() ||
    resolve(process.cwd(), ".venv-stems/bin/python")
  );
}

export class MlxDemucsProvider implements StemSeparationProvider {
  readonly name = "mlx-demucs" as const;

  private readonly pythonExecutable: string;
  private readonly workerScript: string;
  private readonly modelVersion: string;

  constructor(options: MlxDemucsProviderOptions = {}) {
    this.pythonExecutable =
      options.pythonExecutable?.trim() || defaultPythonExecutable();
    this.workerScript =
      options.workerScript?.trim() || defaultWorkerScript();
    this.modelVersion =
      options.modelVersion?.trim() || MLX_DEMUCS_ENGINE_VERSION;
  }

  async separate(
    request: StemSeparationProviderRequest
  ): Promise<StemSeparationProviderResult> {
    assertFourStemChannels({
      vocals: "",
      drums: "",
      bass: "",
      other: ""
    });

    if (request.signal?.aborted) {
      throw new StemSeparationError(
        "CANCELLED",
        "La separación de stems fue cancelada."
      );
    }

    const sourcePath = resolve(request.sourcePath);
    const destinationDirectory = resolve(request.destinationDirectory);

    try {
      await access(sourcePath);
    } catch {
      throw new StemSeparationError(
        "INVALID_SOURCE",
        `No se puede leer el archivo de audio: ${sourcePath}`
      );
    }

    try {
      await access(this.workerScript);
    } catch {
      throw new StemSeparationError(
        "PROVIDER_UNAVAILABLE",
        `No se encontró el worker de MLX-Demucs: ${this.workerScript}`
      );
    }

    try {
      await access(this.pythonExecutable);
    } catch {
      throw new StemSeparationError(
        "PROVIDER_UNAVAILABLE",
        `No se encontró Python para MLX-Demucs: ${this.pythonExecutable}`
      );
    }

    await mkdir(destinationDirectory, { recursive: true });

    request.onProgress?.(0.05, "Iniciando motor MLX-Demucs…");

    await runWorker(
      this.pythonExecutable,
      this.workerScript,
      sourcePath,
      destinationDirectory,
      request,
      request.model
    );

    request.onProgress?.(0.92, "Localizando los cuatro stems generados…");

    const stems = await resolveStems(destinationDirectory);

    request.onProgress?.(0.96, "Validando integridad de los stems…");
    await validateFourStemWavFiles(stems);

    return {
      provider: this.name,
      model: request.model,
      modelVersion: this.modelVersion,
      stems
    };
  }
}

function runWorker(
  pythonExecutable: string,
  workerScript: string,
  sourcePath: string,
  destinationDirectory: string,
  request: StemSeparationProviderRequest,
  model: StemSeparationProviderRequest["model"]
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      pythonExecutable,
      [
        workerScript,
        "--input",
        sourcePath,
        "--output",
        destinationDirectory,
        "--model",
        model
      ],
      {
        detached: process.platform !== "win32",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1"
        }
      }
    );

    let stderrTail = "";
    let settled = false;

    const finish = (
      callback: () => void
    ): void => {
      if (settled) {
        return;
      }
      settled = true;
      request.signal?.removeEventListener("abort", onAbort);
      callback();
    };

    const onAbort = (): void => {
      if (child.pid) {
        try {
          if (process.platform !== "win32") {
            process.kill(-child.pid, "SIGTERM");
          } else {
            child.kill("SIGTERM");
          }
        } catch {
          child.kill("SIGTERM");
        }
      } else {
        child.kill("SIGTERM");
      }

      finish(() => {
        reject(
          new StemSeparationError(
            "CANCELLED",
            "La separación de stems fue cancelada."
          )
        );
      });
    };

    request.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/u)) {
        const text = line.trim();
        if (!text) {
          continue;
        }

        try {
          const event = JSON.parse(text) as {
            event?: string;
            progress?: number;
            message?: string;
          };

          if (event.event === "progress" || event.event === "status") {
            if (
              typeof event.progress === "number" &&
              Number.isFinite(event.progress)
            ) {
              const progress = Math.min(
                0.91,
                Math.max(0.05, event.progress)
              );
              request.onProgress?.(
                progress,
                typeof event.message === "string"
                  ? event.message
                  : "Procesando separación…"
              );
            }
          }
        } catch {
          // El worker usa JSONL; una línea no JSON no debe romper el proceso.
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = `${stderrTail}${chunk}`.slice(-4000);
    });

    child.once("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(
            new StemSeparationError(
              "PROVIDER_UNAVAILABLE",
              `No se pudo ejecutar Python para MLX-Demucs: ${pythonExecutable}`
            )
          );
          return;
        }

        reject(
          new StemSeparationError(
            "PROVIDER_FAILED",
            `MLX-Demucs no pudo iniciar: ${error.message}`
          )
        );
      });
    });

    child.once("close", (code, signal) => {
      if (settled) {
        return;
      }

      if (request.signal?.aborted) {
        finish(() => {
          reject(
            new StemSeparationError(
              "CANCELLED",
              "La separación de stems fue cancelada."
            )
          );
        });
        return;
      }

      if (code === 0) {
        finish(() => resolvePromise());
        return;
      }

      finish(() => {
        const detail = stderrTail.trim();
        const suffix = signal
          ? ` señal ${signal}`
          : ` código ${code ?? "desconocido"}`;

        reject(
          new StemSeparationError(
            "PROVIDER_FAILED",
            `MLX-Demucs terminó con${suffix}${detail ? `: ${detail}` : "."}`
          )
        );
      });
    });
  });
}

async function resolveStems(
  destinationDirectory: string
): Promise<Record<StemChannel, string>> {
  const stems = {} as Record<StemChannel, string>;

  for (const channel of STEM_CHANNELS) {
    const filePath = join(destinationDirectory, STEM_FILE_NAMES[channel]);

    try {
      const metadata = await stat(filePath);

      if (!metadata.isFile() || metadata.size <= 0) {
        throw new Error("empty");
      }

      stems[channel] = resolve(filePath);
    } catch {
      throw new StemSeparationError(
        "INVALID_PROVIDER_OUTPUT",
        `No se encontró el stem '${channel}' en ${destinationDirectory}.`
      );
    }
  }

  await rejectExperimentalSixStemFiles(destinationDirectory);
  assertFourStemChannels(stems);
  return stems;
}

async function rejectExperimentalSixStemFiles(
  destinationDirectory: string
): Promise<void> {
  for (const name of ["guitar.wav", "piano.wav"]) {
    try {
      await access(join(destinationDirectory, name));
    } catch {
      continue;
    }

    throw new StemSeparationError(
      "INVALID_PROVIDER_OUTPUT",
      "La salida contiene stems experimentales de seis canales. QDEV Mashups solo acepta Voces, Batería, Bajo y Otros."
    );
  }
}

async function validateFourStemWavFiles(
  stems: Record<StemChannel, string>
): Promise<void> {
  for (const channel of STEM_CHANNELS) {
    const filePath = stems[channel];
    const handle = await open(filePath, "r");

    try {
      const header = Buffer.alloc(65536);
      const { bytesRead } = await handle.read(
        header,
        0,
        header.length,
        0
      );

      if (
        bytesRead < 12 ||
        header.toString("ascii", 0, 4) !== "RIFF" ||
        header.toString("ascii", 8, 12) !== "WAVE"
      ) {
        throw new StemSeparationError(
          "INVALID_PROVIDER_OUTPUT",
          `El stem '${channel}' no es un contenedor WAV válido: ${filePath}`
        );
      }

      let offset = 12;
      let audioFormat: number | null = null;
      let channels: number | null = null;
      let sampleRate: number | null = null;
      let dataFound = false;

      while (offset + 8 <= bytesRead) {
        const chunkId = header.toString(
          "ascii",
          offset,
          offset + 4
        );
        const chunkSize = header.readUInt32LE(offset + 4);
        const dataStart = offset + 8;

        if (chunkId === "fmt " && dataStart + 16 <= bytesRead) {
          audioFormat = header.readUInt16LE(dataStart);
          channels = header.readUInt16LE(dataStart + 2);
          sampleRate = header.readUInt32LE(dataStart + 4);
        }

        if (chunkId === "data") {
          dataFound = true;
          break;
        }

        offset = dataStart + (chunkSize % 2 === 0 ? chunkSize : chunkSize + 1);
      }

      if (
        audioFormat !== 1 &&
        audioFormat !== 3
      ) {
        throw new StemSeparationError(
          "INVALID_PROVIDER_OUTPUT",
          `El stem '${channel}' usa un formato WAV no compatible: ${filePath}`
        );
      }

      if (
        channels === null ||
        channels < 1 ||
        sampleRate === null ||
        sampleRate < 1 ||
        !dataFound
      ) {
        throw new StemSeparationError(
          "INVALID_PROVIDER_OUTPUT",
          `No se pudo validar completamente el WAV del stem '${channel}': ${filePath}`
        );
      }
    } finally {
      await handle.close();
    }
  }
}
