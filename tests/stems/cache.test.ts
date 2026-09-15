import {
  mkdtemp,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildStemCacheKey,
  fingerprintSource
} from "../../src/stems/index.js";

describe("stem cache", () => {
  it("genera claves deterministas y diferentes por modelo", async () => {
    const a = buildStemCacheKey({
      sourceSha256: "abc",
      provider: "mlx-demucs",
      model: "htdemucs_ft",
      modelVersion: "1"
    });
    const b = buildStemCacheKey({
      sourceSha256: "abc",
      provider: "mlx-demucs",
      model: "htdemucs_ft",
      modelVersion: "1"
    });
    const c = buildStemCacheKey({
      sourceSha256: "abc",
      provider: "mlx-demucs",
      model: "htdemucs",
      modelVersion: "1"
    });

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("detecta cambios de contenido mediante SHA-256", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "qdev-stems-cache-test-")
    );
    const source = join(root, "song.wav");

    await writeFile(source, Buffer.from("A"));
    const first = await fingerprintSource(source);

    await writeFile(source, Buffer.from("B"));
    const second = await fingerprintSource(source);

    expect(first.sha256).not.toBe(second.sha256);
    expect(first.sizeBytes).toBe(second.sizeBytes);
  });
});
