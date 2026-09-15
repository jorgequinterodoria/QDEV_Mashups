import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  StemRenderer,
  StemRendererError
} from "../../src/rendering/index.js";

function createWavLikeFile(path: string): Promise<void> {
  return writeFile(path, Buffer.from("RIFFFAKEWAVE"));
}

function createPlan(
  vocalsPath: string,
  drumsPath: string
) {
  return {
    schemaVersion: 1 as const,
    primaryTrackId: vocalsPath,
    secondaryTrackId: drumsPath,
    bpmRatio: 1,
    bpmCompatible: true,
    selectedChannels: [
      {
        channel: "vocals" as const,
        sourceTrackId: vocalsPath,
        action: "include" as const,
        gainDb: 0,
        pan: 0,
        offsetSeconds: 0,
        startSeconds: 0,
        durationSeconds: 1
      },
      {
        channel: "drums" as const,
        sourceTrackId: drumsPath,
        action: "include" as const,
        gainDb: -3,
        pan: 0,
        offsetSeconds: 0,
        startSeconds: 0,
        durationSeconds: 1
      }
    ],
    transitionSeconds: 0,
    durationSeconds: 1
  };
}

describe("StemRenderer", () => {
  it("rechaza un plan sin stems incluidos", async () => {
    const renderer = new StemRenderer({
      ffmpegExecutable: "missing-ffmpeg-for-test"
    });

    await expect(
      renderer.render({
        plan: {
          ...createPlan("/tmp/vocals.wav", "/tmp/drums.wav"),
          selectedChannels: [
            {
              ...createPlan("/tmp/vocals.wav", "/tmp/drums.wav")
                .selectedChannels[0],
              action: "exclude"
            }
          ]
        },
        outputPath: join(tmpdir(), "qdev-empty.wav")
      })
    ).rejects.toThrow(StemRendererError);
  });

  it("rechaza stems de origen inexistentes antes de invocar ffmpeg", async () => {
    const renderer = new StemRenderer({
      ffmpegExecutable: "missing-ffmpeg-for-test"
    });

    await expect(
      renderer.render({
        plan: createPlan(
          "/tmp/qdev-no-vocals.wav",
          "/tmp/qdev-no-drums.wav"
        ),
        outputPath: join(tmpdir(), "qdev-invalid.wav")
      })
    ).rejects.toThrow(StemRendererError);
  });

  it("ejecuta el flujo de render hasta la invocación del binario", async () => {
    const root = join(
      tmpdir(),
      `qdev-stem-renderer-${Date.now()}`
    );
    await mkdir(root, { recursive: true });

    const vocals = join(root, "vocals.wav");
    const drums = join(root, "drums.wav");
    const output = join(root, "result.wav");

    await createWavLikeFile(vocals);
    await createWavLikeFile(drums);

    const renderer = new StemRenderer({
      ffmpegExecutable: "missing-ffmpeg-for-test"
    });

    await expect(
      renderer.render({
        plan: createPlan(vocals, drums),
        outputPath: output
      })
    ).rejects.toMatchObject({
      name: "StemRendererError",
      code: "FFMPEG_UNAVAILABLE"
    });

    await rm(root, { recursive: true, force: true });
  });

  it("rechaza sample rates y número de canales inválidos", async () => {
    const renderer = new StemRenderer();

    const plan = createPlan("/tmp/vocals.wav", "/tmp/drums.wav");

    await expect(
      renderer.render({
        plan,
        outputPath: join(tmpdir(), "qdev-invalid-rate.wav"),
        sampleRate: 0
      })
    ).rejects.toThrow(StemRendererError);

    await expect(
      renderer.render({
        plan,
        outputPath: join(tmpdir(), "qdev-invalid-channels.wav"),
        channels: 3
      })
    ).rejects.toThrow(StemRendererError);
  });
});
