import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import type { DjCue, DjPreparedTrack, MashupDjPrep } from "./prep.js";

export interface DjExportOptions {
  readonly outputRoot: string;
  readonly packageName?: string;
  readonly audioPath?: string;
  readonly overwrite?: boolean;
}

export interface DjExportManifest {
  readonly schemaVersion: 1;
  readonly packageName: string;
  readonly createdAtMs: number;
  readonly audioPath: string | null;
  readonly mashupPlanFingerprint: string;
  readonly tracks: readonly DjPreparedTrack[];
}

export interface DjExportResult {
  readonly packageDirectory: string;
  readonly manifestPath: string;
  readonly cuesPath: string;
  readonly beatgridsPath: string;
  readonly audioPath: string | null;
}

export class DjExportError extends Error {
  readonly code:
    | "INVALID_PREP"
    | "INVALID_OUTPUT"
    | "OUTPUT_EXISTS"
    | "WRITE_FAILED";

  constructor(code: DjExportError["code"], message: string) {
    super(message);
    this.name = "DjExportError";
    this.code = code;
  }
}

function safeName(value: string): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim();

  return cleaned.slice(0, 120) || "QDEV-DJ-Export";
}

function validateCue(cue: DjCue, duration: number): void {
  if (
    !cue.id.trim() ||
    !cue.label.trim() ||
    !Number.isFinite(cue.positionSeconds) ||
    cue.positionSeconds < 0 ||
    cue.positionSeconds > duration
  ) {
    throw new DjExportError("INVALID_PREP", `Cue inválido: ${cue.id}.`);
  }
}

function validateTrack(track: DjPreparedTrack): void {
  if (!track.trackId.trim() || !track.sourcePath.trim()) {
    throw new DjExportError(
      "INVALID_PREP",
      "La preparación contiene un track incompleto."
    );
  }

  if (
    !Number.isFinite(track.bpm) ||
    track.bpm < 30 ||
    track.bpm > 300 ||
    !Number.isFinite(track.durationSeconds) ||
    track.durationSeconds <= 0
  ) {
    throw new DjExportError(
      "INVALID_PREP",
      `Datos inválidos en ${track.trackId}.`
    );
  }

  if (
    track.beatgrid.bpm !== track.bpm ||
    track.beatgrid.beatsPerBar !== 4 ||
    track.beatgrid.confidence < 0 ||
    track.beatgrid.confidence > 1
  ) {
    throw new DjExportError(
      "INVALID_PREP",
      `Beatgrid inválido en ${track.trackId}.`
    );
  }

  for (const cue of track.cues) {
    validateCue(cue, track.durationSeconds);
  }
}

function validatePrep(prep: MashupDjPrep): void {
  if (
    prep.schemaVersion !== 1 ||
    !prep.mashupPlanFingerprint.trim()
  ) {
    throw new DjExportError(
      "INVALID_PREP",
      "La preparación DJ no es válida."
    );
  }

  validateTrack(prep.primary);
  validateTrack(prep.secondary);
}

function assertInsideRoot(root: string, directory: string): void {
  const rootPath = resolve(root);
  const targetPath = resolve(directory);
  const prefix = `${rootPath}${sep}`;

  if (targetPath !== rootPath && !targetPath.startsWith(prefix)) {
    throw new DjExportError(
      "INVALID_OUTPUT",
      "La ruta de exportación queda fuera del directorio permitido."
    );
  }
}

export class DjExportPackageService {
  async export(
    prep: MashupDjPrep,
    options: DjExportOptions
  ): Promise<DjExportResult> {
    validatePrep(prep);

    if (!options.outputRoot.trim()) {
      throw new DjExportError(
        "INVALID_OUTPUT",
        "outputRoot es obligatorio."
      );
    }

    const packageName = safeName(
      options.packageName ??
        `${prep.primary.trackId} x ${prep.secondary.trackId}`
    );

    const packageDirectory = join(
      resolve(options.outputRoot),
      packageName
    );

    assertInsideRoot(options.outputRoot, packageDirectory);

    if (options.overwrite === false) {
      try {
        await stat(packageDirectory);
        throw new DjExportError(
          "OUTPUT_EXISTS",
          `El paquete ya existe: ${packageDirectory}.`
        );
      } catch (error) {
        if (error instanceof DjExportError) {
          throw error;
        }
      }
    }

    const audioPath = options.audioPath
      ? resolve(options.audioPath)
      : null;

    if (audioPath) {
      try {
        const metadata = await stat(audioPath);

        if (!metadata.isFile() || metadata.size <= 0) {
          throw new Error("archivo vacío o inválido");
        }
      } catch {
        throw new DjExportError(
          "INVALID_OUTPUT",
          `El audio exportado no existe o no es válido: ${audioPath}.`
        );
      }
    }

    try {
      await mkdir(packageDirectory, { recursive: true });

      const manifest: DjExportManifest = {
        schemaVersion: 1,
        packageName,
        createdAtMs: prep.generatedAtMs,
        audioPath,
        mashupPlanFingerprint: prep.mashupPlanFingerprint,
        tracks: [
          {
            ...prep.primary,
            beatgrid: { ...prep.primary.beatgrid },
            cues: prep.primary.cues.map((cue) => ({ ...cue }))
          },
          {
            ...prep.secondary,
            beatgrid: { ...prep.secondary.beatgrid },
            cues: prep.secondary.cues.map((cue) => ({ ...cue }))
          }
        ]
      };

      const manifestPath = join(
        packageDirectory,
        "qdev-dj-manifest.json"
      );
      const cuesPath = join(packageDirectory, "qdev-cues.json");
      const beatgridsPath = join(
        packageDirectory,
        "qdev-beatgrids.json"
      );

      await writeFile(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
      );

      await writeFile(
        cuesPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            primary: prep.primary.cues,
            secondary: prep.secondary.cues
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      await writeFile(
        beatgridsPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            primary: prep.primary.beatgrid,
            secondary: prep.secondary.beatgrid
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      return {
        packageDirectory,
        manifestPath,
        cuesPath,
        beatgridsPath,
        audioPath
      };
    } catch (error) {
      if (error instanceof DjExportError) {
        throw error;
      }

      throw new DjExportError(
        "WRITE_FAILED",
        `No se pudo crear el paquete DJ: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
