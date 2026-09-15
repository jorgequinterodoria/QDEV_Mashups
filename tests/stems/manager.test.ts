import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  StemCacheManager,
  createStemCacheEntry,
  writeCachedManifest,
  type StemManifest
} from "../../src/stems/index.js";

function manifestFor(root: string, cacheKey: string): StemManifest {
  const stemDirectory = join(root, cacheKey, "stems");
  const stem = (channel: "vocals" | "drums" | "bass" | "other") => ({
    channel,
    path: join(stemDirectory, `${channel}.wav`),
    sizeBytes: 8,
    modifiedTimeMs: 1
  });

  return {
    schemaVersion: 1,
    trackId: "track-1",
    sourcePath: "/music/song.mp3",
    sourceSizeBytes: 123,
    sourceModifiedTimeMs: 456,
    sourceSha256: "a".repeat(64),
    provider: "mlx-demucs",
    model: "htdemucs_ft",
    modelVersion: "test-1",
    sampleRate: 44100,
    channels: 2,
    durationSeconds: 120,
    stems: {
      vocals: stem("vocals"),
      drums: stem("drums"),
      bass: stem("bass"),
      other: stem("other")
    },
    createdAtMs: 789
  };
}

async function createEntry(root: string, cacheKey: string, valid: boolean): Promise<void> {
  const entry = createStemCacheEntry({ rootDirectory: root, modelVersion: "test-1" }, cacheKey);
  await mkdir(entry.stemDirectory, { recursive: true });
  const manifest = manifestFor(root, cacheKey);
  if (valid) {
    for (const item of Object.values(manifest.stems)) {
      await writeFile(item.path, Buffer.from("wav-data"));
    }
  }
  await writeCachedManifest(entry, manifest);
}

describe("StemCacheManager", () => {
  it("lista entradas y calcula su tamaño", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-stems-manager-"));
    const key = "a".repeat(64);
    await createEntry(root, key, true);

    const records = await new StemCacheManager({ rootDirectory: root }).list();
    expect(records).toHaveLength(1);
    expect(records[0].cacheKey).toBe(key);
    expect(records[0].usable).toBe(true);
    expect(records[0].sizeBytes).toBe(32);
  });

  it("detecta entradas inválidas", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-stems-manager-"));
    await createEntry(root, "b".repeat(64), false);

    const summary = await new StemCacheManager({ rootDirectory: root }).summarize();
    expect(summary.entries).toBe(1);
    expect(summary.usableEntries).toBe(0);
    expect(summary.invalidEntries).toBe(1);
  });

  it("inspecciona una entrada concreta", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-stems-manager-"));
    const key = "c".repeat(64);
    await createEntry(root, key, true);

    const record = await new StemCacheManager({ rootDirectory: root }).inspect(key);
    expect(record?.manifest.trackId).toBe("track-1");
    expect(record?.manifest.model).toBe("htdemucs_ft");
  });

  it("elimina una entrada concreta", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-stems-manager-"));
    const key = "d".repeat(64);
    await createEntry(root, key, true);
    const manager = new StemCacheManager({ rootDirectory: root });

    expect(await manager.remove(key)).toBe(true);
    await expect(stat(join(root, key))).rejects.toThrow();
    expect(await manager.remove(key)).toBe(false);
  });

  it("limpia solamente entradas inválidas", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-stems-manager-"));
    const validKey = "e".repeat(64);
    const invalidKey = "f".repeat(64);
    await createEntry(root, validKey, true);
    await createEntry(root, invalidKey, false);

    const manager = new StemCacheManager({ rootDirectory: root });
    const result = await manager.pruneInvalid();
    expect(result.scannedEntries).toBe(2);
    expect(result.removedEntries).toBe(1);
    expect((await manager.inspect(validKey))?.usable).toBe(true);
    expect(await manager.inspect(invalidKey)).toBeNull();
  });

  it("rechaza claves de caché manipuladas", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-stems-manager-"));
    const manager = new StemCacheManager({ rootDirectory: root });
    await expect(manager.inspect("../outside")).rejects.toMatchObject({ code: "CACHE_FAILED" });
  });
});
