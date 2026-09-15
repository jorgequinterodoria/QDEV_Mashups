import { mkdir, open, stat } from "node:fs/promises";

import {
  buildStemCacheKey,
  cacheEntryIsUsable,
  createStemCacheEntry,
  fingerprintSource,
  readCachedManifest,
  type StemSourceFingerprint,
  writeCachedManifest
} from "./cache.js";
import {
  resolveStemCacheRoot
} from "./paths.js";
import type {
  StemChannel,
  StemManifest,
  StemModelName,
  StemSeparationProvider,
  StemSeparationRequest,
  StemSeparationResult
} from "./types.js";
import {
  STEM_CHANNELS,
  StemSeparationError,
  assertFourStemChannels
} from "./types.js";

export const DEFAULT_STEM_MODEL: StemModelName =
  "htdemucs_ft";

export const STEM_SCHEMA_VERSION = 1 as const;

export class StemSeparationService {
  constructor(
    private readonly provider: StemSeparationProvider,
    private readonly cacheRootDirectory: string =
      resolveStemCacheRoot(),
    private readonly modelVersion: string =
      "mlx-demucs"
  ) {}

  async separate(
    request: StemSeparationRequest
  ): Promise<StemSeparationResult> {
    const model =
      request.model ?? DEFAULT_STEM_MODEL;

    const sourcePath =
      request.sourcePath.trim();

    if (!request.trackId.trim()) {
      throw new StemSeparationError(
        "INVALID_SOURCE",
        "El identificador de la canción es obligatorio."
      );
    }

    if (!sourcePath) {
      throw new StemSeparationError(
        "INVALID_SOURCE",
        "La ruta de la canción es obligatoria."
      );
    }

    const fingerprint =
      await fingerprintSource(sourcePath);

    const cacheKey =
      buildStemCacheKey({
        sourceSha256:
          fingerprint.sha256,
        provider:
          this.provider.name,
        model,
        modelVersion:
          this.modelVersion
      });

    const entry =
      createStemCacheEntry(
        {
          rootDirectory:
            this.cacheRootDirectory,
          modelVersion:
            this.modelVersion
        },
        cacheKey
      );

    request.onProgress?.({
      trackId:
        request.trackId,
      status: "pending",
      progress01: 0,
      message:
        "Comprobando caché de stems…"
    });

    if (!request.force) {
      const cached =
        await readCachedManifest(entry);

      if (
        cached !== null &&
        await cacheEntryIsUsable(
          entry,
          cached
        ) &&
        manifestMatchesRequest(
          cached,
          request.trackId,
          sourcePath,
          fingerprint,
          this.provider.name,
          model,
          this.modelVersion
        )
      ) {
        request.onProgress?.({
          trackId:
            request.trackId,
          status: "ready",
          progress01: 1,
          message:
            "Stems recuperados desde la caché."
        });

        return {
          cacheHit: true,
          manifest: cached
        };
      }
    }

    await mkdir(
      entry.stemDirectory,
      {
        recursive: true
      }
    );

    request.onProgress?.({
      trackId:
        request.trackId,
      status: "running",
      progress01: 0.02,
      message:
        "Separando la canción en cuatro stems…"
    });

    try {
      const providerResult =
        await this.provider.separate({
          sourcePath,
          destinationDirectory:
            entry.stemDirectory,
          model,
          signal:
            request.signal,
          onProgress: (
            progress01,
            message
          ) => {
            const bounded =
              Math.min(
                0.98,
                Math.max(
                  0.02,
                  progress01
                )
              );

            request.onProgress?.({
              trackId:
                request.trackId,
              status: "running",
              progress01:
                bounded,
              message
            });
          }
        });

      assertFourStemChannels(
        providerResult.stems
      );

      const stemFiles =
        await buildStemFiles(
          providerResult.stems
        );

      const audioInfo =
        await readWavInfo(
          stemFiles.vocals.path
        );

      const manifest: StemManifest = {
        schemaVersion:
          STEM_SCHEMA_VERSION,
        trackId:
          request.trackId,
        sourcePath,
        sourceSizeBytes:
          fingerprint.sizeBytes,
        sourceModifiedTimeMs:
          fingerprint.modifiedTimeMs,
        sourceSha256:
          fingerprint.sha256,
        provider:
          this.provider.name,
        model,
        modelVersion:
          providerResult.modelVersion,
        sampleRate:
          audioInfo.sampleRate,
        channels:
          audioInfo.channels,
        durationSeconds:
          audioInfo.durationSeconds,
        stems:
          stemFiles,
        createdAtMs:
          Date.now()
      };

      await writeCachedManifest(
        entry,
        manifest
      );

      request.onProgress?.({
        trackId:
          request.trackId,
        status: "ready",
        progress01: 1,
        message:
          "Los cuatro stems están listos."
      });

      return {
        cacheHit: false,
        manifest
      };
    } catch (cause) {
      if (
        cause instanceof StemSeparationError
      ) {
        if (
          cause.code ===
          "CANCELLED"
        ) {
          request.onProgress?.({
            trackId:
              request.trackId,
            status:
              "cancelled",
            progress01: 0,
            message:
              cause.message
          });
        } else {
          request.onProgress?.({
            trackId:
              request.trackId,
            status:
              "failed",
            progress01: 0,
            message:
              cause.message
          });
        }

        throw cause;
      }

      const error =
        new StemSeparationError(
          "PROVIDER_FAILED",
          cause instanceof Error
            ? cause.message
            : String(cause)
        );

      request.onProgress?.({
        trackId:
          request.trackId,
        status: "failed",
        progress01: 0,
        message:
          error.message
      });

      throw error;
    }
  }
}

function manifestMatchesRequest(
  manifest: StemManifest,
  trackId: string,
  sourcePath: string,
  fingerprint: StemSourceFingerprint,
  provider: string,
  model: StemModelName,
  modelVersion: string
): boolean {
  return (
    manifest.schemaVersion ===
      STEM_SCHEMA_VERSION &&
    manifest.trackId ===
      trackId &&
    manifest.sourcePath ===
      sourcePath &&
    manifest.sourceSizeBytes ===
      fingerprint.sizeBytes &&
    manifest.sourceModifiedTimeMs ===
      fingerprint.modifiedTimeMs &&
    manifest.sourceSha256 ===
      fingerprint.sha256 &&
    manifest.provider ===
      provider &&
    manifest.model ===
      model &&
    manifest.modelVersion ===
      modelVersion
  );
}

async function buildStemFiles(
  stems: Record<
    StemChannel,
    string
  >
): Promise<StemManifest["stems"]> {
  assertFourStemChannels(stems);

  const result =
    {} as Record<
      StemChannel,
      StemManifest["stems"][StemChannel]
    >;

  for (const channel of STEM_CHANNELS) {
    const path =
      stems[channel];

    const metadata =
      await stat(path)
        .catch(() => null);

    if (
      metadata === null ||
      !metadata.isFile() ||
      metadata.size <= 0
    ) {
      throw new StemSeparationError(
        "INVALID_PROVIDER_OUTPUT",
        `El stem '${channel}' no es válido.`
      );
    }

    result[channel] = {
      channel,
      path,
      sizeBytes:
        metadata.size,
      modifiedTimeMs:
        metadata.mtimeMs
    };
  }

  return result;
}

interface WavInfo {
  readonly sampleRate: number;
  readonly channels: number;
  readonly durationSeconds: number;
}

async function readWavInfo(
  filePath: string
): Promise<WavInfo> {
  const handle =
    await open(
      filePath,
      "r"
    );

  try {
    const header =
      Buffer.alloc(
        65536
      );

    const {
      bytesRead
    } = await handle.read(
      header,
      0,
      header.length,
      0
    );

    if (bytesRead < 12) {
      throw new StemSeparationError(
        "INVALID_PROVIDER_OUTPUT",
        `El stem no contiene una cabecera WAV válida: ${filePath}`
      );
    }

    if (
      header.toString(
        "ascii",
        0,
        4
      ) !== "RIFF" ||
      header.toString(
        "ascii",
        8,
        12
      ) !== "WAVE"
    ) {
      throw new StemSeparationError(
        "INVALID_PROVIDER_OUTPUT",
        `El stem no es un archivo WAV PCM válido: ${filePath}`
      );
    }

    let offset = 12;
    let channels:
      number | null = null;
    let sampleRate:
      number | null = null;
    let byteRate:
      number | null = null;
    let dataSize:
      number | null = null;

    while (
      offset + 8 <=
      bytesRead
    ) {
      const chunkId =
        header.toString(
          "ascii",
          offset,
          offset + 4
        );

      const chunkSize =
        header.readUInt32LE(
          offset + 4
        );

      const chunkDataStart =
        offset + 8;

      if (
        chunkId === "fmt " &&
        chunkDataStart + 16 <=
          bytesRead
      ) {
        const audioFormat =
          header.readUInt16LE(
            chunkDataStart
          );

        channels =
          header.readUInt16LE(
            chunkDataStart + 2
          );

        sampleRate =
          header.readUInt32LE(
            chunkDataStart + 4
          );

        byteRate =
          header.readUInt32LE(
            chunkDataStart + 8
          );

        if (
          audioFormat !== 1
        ) {
          throw new StemSeparationError(
            "INVALID_PROVIDER_OUTPUT",
            `El stem usa un formato PCM no compatible: ${filePath}`
          );
        }
      }

      if (
        chunkId === "data"
      ) {
        dataSize =
          chunkSize;

        break;
      }

      const paddedSize =
        chunkSize % 2 === 0
          ? chunkSize
          : chunkSize + 1;

      offset =
        chunkDataStart +
        paddedSize;
    }

    if (
      channels === null ||
      sampleRate === null ||
      byteRate === null ||
      dataSize === null
    ) {
      throw new StemSeparationError(
        "INVALID_PROVIDER_OUTPUT",
        `No se pudo validar completamente el WAV generado: ${filePath}`
      );
    }

    return {
      sampleRate,
      channels,
      durationSeconds:
        dataSize /
        byteRate
    };
  } finally {
    await handle.close();
  }
}