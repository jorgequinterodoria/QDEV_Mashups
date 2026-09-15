import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  STEM_CHANNELS,
  StemSeparationService,
  type StemSeparationProvider,
  type StemSeparationProviderRequest
} from "../../src/stems/index.js";

function createPcmWavBuffer(): Buffer {
  const sampleRate = 8000;
  const channels = 1;
  const bitsPerSample = 16;
  const frameCount = 80;
  const dataSize = frameCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function fixture(): Promise<{
  root: string;
  source: string;
}> {
  const root = await mkdtemp(
    join(tmpdir(), "qdev-stems-test-")
  );
  const source = join(root, "song.wav");
  await writeFile(source, Buffer.alloc(512, 7));
  return { root, source };
}

class FakeProvider implements StemSeparationProvider {
  readonly name = "mlx-demucs" as const;
  calls = 0;

  async separate(
    request: StemSeparationProviderRequest
  ) {
    this.calls += 1;
    await mkdir(request.destinationDirectory, {
      recursive: true
    });

    const stems = {} as Record<
      (typeof STEM_CHANNELS)[number],
      string
    >;

    for (const channel of STEM_CHANNELS) {
      const path = join(
        request.destinationDirectory,
        `${channel}.wav`
      );
      await writeFile(
        path,
        createPcmWavBuffer()
      );
      stems[channel] = path;
    }

    request.onProgress?.(1, "Completado");

    return {
      provider: this.name,
      model: request.model,
      modelVersion: "test-1",
      stems
    };
  }
}

describe("StemSeparationService", () => {
  it("separa exactamente cuatro stems y crea un manifest", async () => {
    const { root, source } = await fixture();
    const provider = new FakeProvider();
    const service = new StemSeparationService(
      provider,
      join(root, "cache"),
      "test-1"
    );

    const result = await service.separate({
      trackId: "track-1",
      sourcePath: source
    });

    expect(result.cacheHit).toBe(false);
    expect(
      Object.keys(result.manifest.stems).sort()
    ).toEqual([...STEM_CHANNELS].sort());
    expect(
      result.manifest.model
    ).toBe("htdemucs_ft");
  });

  it("reutiliza la caché cuando la fuente no cambió", async () => {
    const { root, source } = await fixture();
    const provider = new FakeProvider();
    const service = new StemSeparationService(
      provider,
      join(root, "cache"),
      "test-1"
    );

    const first = await service.separate({
      trackId: "track-1",
      sourcePath: source
    });
    const second = await service.separate({
      trackId: "track-1",
      sourcePath: source
    });

    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(provider.calls).toBe(1);
  });

  it("invalida la caché cuando cambia el contenido de la fuente", async () => {
    const { root, source } = await fixture();
    const provider = new FakeProvider();
    const service = new StemSeparationService(
      provider,
      join(root, "cache"),
      "test-1"
    );

    await service.separate({
      trackId: "track-1",
      sourcePath: source
    });

    await writeFile(
      source,
      Buffer.alloc(513, 8)
    );

    const second = await service.separate({
      trackId: "track-1",
      sourcePath: source
    });

    expect(second.cacheHit).toBe(false);
    expect(provider.calls).toBe(2);
  });

  it("permite forzar una nueva separación", async () => {
    const { root, source } = await fixture();
    const provider = new FakeProvider();
    const service = new StemSeparationService(
      provider,
      join(root, "cache"),
      "test-1"
    );

    await service.separate({
      trackId: "track-1",
      sourcePath: source
    });

    const result = await service.separate({
      trackId: "track-1",
      sourcePath: source,
      force: true
    });

    expect(result.cacheHit).toBe(false);
    expect(provider.calls).toBe(2);
  });

  it("rechaza una fuente inexistente", async () => {
    const root = await mkdtemp(
      join(tmpdir(), "qdev-stems-test-")
    );
    const provider = new FakeProvider();
    const service = new StemSeparationService(
      provider,
      join(root, "cache"),
      "test-1"
    );

    await expect(
      service.separate({
        trackId: "missing",
        sourcePath: join(root, "missing.wav")
      })
    ).rejects.toMatchObject({
      code: "INVALID_SOURCE"
    });
  });

  it("persiste un JSON legible para diagnóstico", async () => {
    const { root, source } = await fixture();
    const provider = new FakeProvider();
    const service = new StemSeparationService(
      provider,
      join(root, "cache"),
      "test-1"
    );

    await service.separate({
      trackId: "track-1",
      sourcePath: source
    });

    const manifestFiles = await collectJsonFiles(
      join(root, "cache")
    );

    expect(manifestFiles).toHaveLength(1);
    const parsed = JSON.parse(
      await readFile(manifestFiles[0], "utf8")
    ) as { schemaVersion: number };
    expect(parsed.schemaVersion).toBe(1);
  });
});

async function collectJsonFiles(
  directory: string
): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, {
    withFileTypes: true
  });
  const results: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectJsonFiles(path));
    } else if (entry.name === "manifest.json") {
      results.push(path);
    }
  }

  return results;
}
