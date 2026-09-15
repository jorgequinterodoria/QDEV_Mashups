import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  cacheEntryIsUsable,
  createStemCacheEntry,
  readCachedManifest,
} from "./cache.js";
import {
  StemSeparationError,
  type StemCacheEntry,
  type StemManifest
} from "./types.js";

export interface StemCacheManagerOptions {
  readonly rootDirectory: string;
}

export interface StemCacheRecord {
  readonly cacheKey: string;
  readonly manifestPath: string;
  readonly stemDirectory: string;
  readonly manifest: StemManifest;
  readonly usable: boolean;
  readonly sizeBytes: number;
}

export interface StemCacheSummary {
  readonly rootDirectory: string;
  readonly entries: number;
  readonly usableEntries: number;
  readonly invalidEntries: number;
  readonly totalSizeBytes: number;
}

export interface StemCacheCleanupResult {
  readonly scannedEntries: number;
  readonly removedEntries: number;
  readonly freedBytes: number;
}

export class StemCacheManager {
  constructor(private readonly options: StemCacheManagerOptions) {}

  async list(): Promise<readonly StemCacheRecord[]> {
    const entries = await this.discoverEntries();
    const records: StemCacheRecord[] = [];

    for (const entry of entries) {
      const manifest = await readCachedManifest(entry);
      if (manifest === null) continue;

      records.push({
        cacheKey: entry.cacheKey,
        manifestPath: entry.manifestPath,
        stemDirectory: entry.stemDirectory,
        manifest,
        usable: await cacheEntryIsUsable(entry, manifest),
        sizeBytes: await directorySize(entry.stemDirectory)
      });
    }

    return records;
  }

  async inspect(cacheKey: string): Promise<StemCacheRecord | null> {
    const normalized = normalizeCacheKey(cacheKey);
    const entry = createStemCacheEntry(
      { rootDirectory: this.options.rootDirectory, modelVersion: "" },
      normalized
    );
    const manifest = await readCachedManifest(entry);
    if (manifest === null) return null;

    return {
      cacheKey: normalized,
      manifestPath: entry.manifestPath,
      stemDirectory: entry.stemDirectory,
      manifest,
      usable: await cacheEntryIsUsable(entry, manifest),
      sizeBytes: await directorySize(entry.stemDirectory)
    };
  }

  async summarize(): Promise<StemCacheSummary> {
    const records = await this.list();
    return {
      rootDirectory: this.options.rootDirectory,
      entries: records.length,
      usableEntries: records.filter((record) => record.usable).length,
      invalidEntries: records.filter((record) => !record.usable).length,
      totalSizeBytes: records.reduce((total, record) => total + record.sizeBytes, 0)
    };
  }

  async remove(cacheKey: string): Promise<boolean> {
    const normalized = normalizeCacheKey(cacheKey);
    const target = join(this.options.rootDirectory, normalized);

    try {
      await stat(target);
    } catch (cause) {
      if (isNotFound(cause)) return false;
      throw new StemSeparationError(
        "CACHE_FAILED",
        `No se pudo inspeccionar la entrada de caché '${normalized}'.`
      );
    }

    try {
      await rm(target, { recursive: true, force: true });
      return true;
    } catch (cause) {
      throw new StemSeparationError(
        "CACHE_FAILED",
        `No se pudo eliminar la entrada de caché '${normalized}': ${errorMessage(cause)}`
      );
    }
  }

  async pruneInvalid(): Promise<StemCacheCleanupResult> {
    const records = await this.list();
    let removedEntries = 0;
    let freedBytes = 0;

    for (const record of records) {
      if (record.usable) continue;
      if (await this.remove(record.cacheKey)) {
        removedEntries += 1;
        freedBytes += record.sizeBytes;
      }
    }

    return { scannedEntries: records.length, removedEntries, freedBytes };
  }

  async clear(): Promise<StemCacheCleanupResult> {
    const records = await this.list();
    let removedEntries = 0;
    let freedBytes = 0;

    for (const record of records) {
      if (await this.remove(record.cacheKey)) {
        removedEntries += 1;
        freedBytes += record.sizeBytes;
      }
    }

    return { scannedEntries: records.length, removedEntries, freedBytes };
  }

  private async discoverEntries(): Promise<readonly StemCacheEntry[]> {
    let entries;
    try {
      entries = await readdir(this.options.rootDirectory, { withFileTypes: true });
    } catch (cause) {
      if (isNotFound(cause)) return [];
      throw new StemSeparationError(
        "CACHE_FAILED",
        `No se pudo leer la caché de stems: ${errorMessage(cause)}`
      );
    }

    return entries
      .filter((entry) => entry.isDirectory() && /^[a-f0-9]{64}$/.test(entry.name))
      .map((entry) =>
        createStemCacheEntry(
          { rootDirectory: this.options.rootDirectory, modelVersion: "" },
          entry.name
        )
      )
      .sort((a, b) => a.cacheKey.localeCompare(b.cacheKey));
  }
}

function normalizeCacheKey(cacheKey: string): string {
  const normalized = cacheKey.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new StemSeparationError(
      "CACHE_FAILED",
      "La clave de caché debe ser un SHA-256 hexadecimal de 64 caracteres."
    );
  }
  return normalized;
}

async function directorySize(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) total += await directorySize(path);
      else if (entry.isFile()) total += (await stat(path)).size;
    }
    return total;
  } catch (cause) {
    if (isNotFound(cause)) return 0;
    throw new StemSeparationError(
      "CACHE_FAILED",
      `No se pudo calcular el tamaño de una entrada de caché: ${errorMessage(cause)}`
    );
  }
}

function isNotFound(cause: unknown): boolean {
  return (
    cause !== null &&
    typeof cause === "object" &&
    "code" in cause &&
    (cause as { code?: string }).code === "ENOENT"
  );
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
