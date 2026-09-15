import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  StemCacheEntry,
  StemCacheOptions,
  StemManifest
} from "./types.js";
import { StemSeparationError } from "./types.js";

export interface StemSourceFingerprint {
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly modifiedTimeMs: number;
}

export async function fingerprintSource(
  sourcePath: string
): Promise<StemSourceFingerprint> {
  let metadata;
  try {
    metadata = await stat(sourcePath);
  } catch (cause) {
    throw new StemSeparationError(
      "INVALID_SOURCE",
      `No se pudo acceder al archivo de audio: ${sourcePath}. ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }

  if (!metadata.isFile()) {
    throw new StemSeparationError(
      "INVALID_SOURCE",
      `La ruta de audio no es un archivo: ${sourcePath}`
    );
  }

  if (metadata.size <= 0) {
    throw new StemSeparationError(
      "INVALID_SOURCE",
      `El archivo de audio está vacío: ${sourcePath}`
    );
  }

  const digest = createHash("sha256");
  const data = await readFile(sourcePath);
  digest.update(data);

  return {
    sha256: digest.digest("hex"),
    sizeBytes: metadata.size,
    modifiedTimeMs: metadata.mtimeMs
  };
}

export function buildStemCacheKey(input: {
  readonly sourceSha256: string;
  readonly provider: string;
  readonly model: string;
  readonly modelVersion: string;
}): string {
  return createHash("sha256")
    .update(
      [
        input.sourceSha256,
        input.provider,
        input.model,
        input.modelVersion
      ].join("\n")
    )
    .digest("hex");
}

export function createStemCacheEntry(
  options: StemCacheOptions,
  cacheKey: string
): StemCacheEntry {
  const stemDirectory = join(
    options.rootDirectory,
    cacheKey,
    "stems"
  );

  return {
    cacheKey,
    manifestPath: join(
      options.rootDirectory,
      cacheKey,
      "manifest.json"
    ),
    stemDirectory
  };
}

export async function readCachedManifest(
  entry: StemCacheEntry
): Promise<StemManifest | null> {
  try {
    const raw = await readFile(
      entry.manifestPath,
      "utf8"
    );
    return JSON.parse(raw) as StemManifest;
  } catch (cause) {
    if (
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      (cause as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }

    throw new StemSeparationError(
      "CACHE_FAILED",
      `No se pudo leer la caché de stems: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

export async function writeCachedManifest(
  entry: StemCacheEntry,
  manifest: StemManifest
): Promise<void> {
  const directory = dirname(entry.manifestPath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = `${entry.manifestPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );
    await rename(
      temporaryPath,
      entry.manifestPath
    );
  } catch (cause) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new StemSeparationError(
      "CACHE_FAILED",
      `No se pudo guardar la caché de stems: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

export async function cacheEntryIsUsable(
  entry: StemCacheEntry,
  manifest: StemManifest
): Promise<boolean> {
  try {
    await access(entry.manifestPath);

    for (const stem of Object.values(manifest.stems)) {
      const metadata = await stat(stem.path);
      if (!metadata.isFile() || metadata.size <= 0) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
