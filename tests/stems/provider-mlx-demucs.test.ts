import {
  chmod,
  mkdir,
  mkdtemp,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MLX_DEMUCS_ENGINE_VERSION,
  MlxDemucsProvider
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
  buffer.writeUInt32LE(
    sampleRate * channels * (bitsPerSample / 8),
    28
  );
  buffer.writeUInt16LE(
    channels * (bitsPerSample / 8),
    32
  );
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

async function fixture(): Promise<{
  root: string;
  source: string;
  worker: string;
}> {
  const root = await mkdtemp(
    join(tmpdir(), "qdev-mlx-provider-test-")
  );
  const source = join(root, "song.wav");
  const worker = join(root, "worker.mjs");

  await writeFile(source, Buffer.from("source"));

  return { root, source, worker };
}

async function writeWorker(
  worker: string,
  body: string
): Promise<void> {
  await writeFile(
    worker,
    `#!/usr/bin/env node\n${body}\n`
  );
  await chmod(worker, 0o755);
}

describe("MlxDemucsProvider", () => {
  it("resuelve exactamente cuatro stems y no recorre salidas externas", async () => {
    const { root, source, worker } = await fixture();
    const output = join(root, "output");
    const external = join(root, "external");

    await mkdir(external, { recursive: true });
    await writeFile(
      join(external, "vocals.wav"),
      createPcmWavBuffer()
    );

    await writeWorker(
      worker,
      [
        "const fs = await import('node:fs/promises');",
        "const path = await import('node:path');",
        "const args = process.argv.slice(2);",
        "const out = args[args.indexOf('--output') + 1];",
        "await fs.mkdir(out, { recursive: true });",
        "const wav = Buffer.from(" +
          JSON.stringify(createPcmWavBuffer().toString("base64")) +
          ", 'base64');",
        "for (const name of ['vocals','drums','bass','other']) await fs.writeFile(path.join(out, `${name}.wav`), wav);",
        "await fs.writeFile(path.join(out, 'guitar.wav'), wav);",
        "console.log(JSON.stringify({event:'complete',progress:1,message:'Completado'}));"
      ].join("\n")
    );

    const provider = new MlxDemucsProvider({
      pythonExecutable: process.execPath,
      workerScript: worker,
      modelVersion: "test"
    });

    await expect(
      provider.separate({
        sourcePath: source,
        destinationDirectory: output,
        model: "htdemucs"
      })
    ).rejects.toMatchObject({
      code: "INVALID_PROVIDER_OUTPUT"
    });

    expect(MLX_DEMUCS_ENGINE_VERSION).toBe(
      "mlx-demucs-direct-v1"
    );
  });

  it("rechaza salida incompleta del worker", async () => {
    const { root, source, worker } = await fixture();
    const output = join(root, "output");

    await writeWorker(
      worker,
      [
        "const fs = await import('node:fs/promises');",
        "const args = process.argv.slice(2);",
        "const out = args[args.indexOf('--output') + 1];",
        "await fs.mkdir(out, { recursive: true });",
        "console.log(JSON.stringify({event:'complete',progress:1}));"
      ].join("\n")
    );

    const provider = new MlxDemucsProvider({
      pythonExecutable: process.execPath,
      workerScript: worker,
      modelVersion: "test"
    });

    await expect(
      provider.separate({
        sourcePath: source,
        destinationDirectory: output,
        model: "htdemucs"
      })
    ).rejects.toMatchObject({
      code: "INVALID_PROVIDER_OUTPUT"
    });
  });
});
