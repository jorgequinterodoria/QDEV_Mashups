import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";
import {
  DjExportPackageService,
  DjPrepService
} from "../../src/dj/index.js";

const plan = {
  schemaVersion: 1 as const,
  primaryTrackId: "track-a",
  secondaryTrackId: "track-b",
  bpmRatio: 1,
  bpmCompatible: true,
  selectedChannels: [],
  transitionSeconds: 8,
  durationSeconds: 120
};

const primary = {
  trackId: "track-a",
  sourcePath: "/music/a.wav",
  bpm: 128,
  durationSeconds: 180,
  firstBeatSeconds: 0.25,
  beatgridConfidence: 0.98,
  previewPath: "/preview/a.wav"
};

const secondary = {
  trackId: "track-b",
  sourcePath: "/music/b.wav",
  bpm: 126,
  durationSeconds: 160,
  firstBeatSeconds: 0.1,
  beatgridConfidence: 0.91,
  previewPath: "/preview/b.wav"
};

async function makePrep() {
  return new DjPrepService().prepare(plan, primary, secondary);
}

describe("DJ Export Package", () => {
  it("crea manifest, cues y beatgrids", async () => {
    const root = join(tmpdir(), `qdev-dj-export-${Date.now()}`);
    await mkdir(root, { recursive: true });

    const result = await new DjExportPackageService().export(
      await makePrep(),
      {
        outputRoot: root,
        packageName: "Mi Mashup DJ"
      }
    );

    const manifest = JSON.parse(
      await readFile(result.manifestPath, "utf8")
    ) as {
      schemaVersion: number;
      packageName: string;
      mashupPlanFingerprint: string;
      tracks: unknown[];
    };

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.packageName).toBe("Mi Mashup DJ");
    expect(manifest.mashupPlanFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(manifest.tracks).toHaveLength(2);

    const cues = JSON.parse(
      await readFile(result.cuesPath, "utf8")
    ) as { primary: unknown[]; secondary: unknown[] };

    expect(cues.primary).toHaveLength(5);
    expect(cues.secondary).toHaveLength(5);

    const beatgrids = JSON.parse(
      await readFile(result.beatgridsPath, "utf8")
    ) as { primary: { bpm: number }; secondary: { bpm: number } };

    expect(beatgrids.primary.bpm).toBe(128);
    expect(beatgrids.secondary.bpm).toBe(126);

    await rm(root, { recursive: true, force: true });
  });

  it("rechaza sobrescritura cuando se solicita", async () => {
    const root = join(tmpdir(), `qdev-dj-export-existing-${Date.now()}`);
    await mkdir(join(root, "Existing"), { recursive: true });
    await writeFile(join(root, "Existing", "existing.txt"), "existing");

    await expect(
      new DjExportPackageService().export(await makePrep(), {
        outputRoot: root,
        packageName: "Existing",
        overwrite: false
      })
    ).rejects.toMatchObject({ code: "OUTPUT_EXISTS" });

    await rm(root, { recursive: true, force: true });
  });

  it("rechaza audio de exportación inexistente", async () => {
    const root = join(tmpdir(), `qdev-dj-export-audio-${Date.now()}`);
    await mkdir(root, { recursive: true });

    await expect(
      new DjExportPackageService().export(await makePrep(), {
        outputRoot: root,
        audioPath: join(root, "missing.wav")
      })
    ).rejects.toThrow("El audio exportado no existe");

    await rm(root, { recursive: true, force: true });
  });

  it("sanitiza nombres con traversal y mantiene la salida dentro del root", async () => {
    const root = join(tmpdir(), `qdev-dj-export-safe-${Date.now()}`);

    const result = await new DjExportPackageService().export(
      await makePrep(),
      {
        outputRoot: root,
        packageName: "../escape"
      }
    );

    expect(result.packageDirectory).toBe(join(root, "..-escape"));
    expect(result.packageDirectory.startsWith(`${root}/`)).toBe(true);

    await rm(root, { recursive: true, force: true });
  });
});
