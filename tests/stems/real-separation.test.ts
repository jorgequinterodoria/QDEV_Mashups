import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  MLX_DEMUCS_ENGINE_VERSION,
  MlxDemucsProvider,
  STEM_CHANNELS,
  StemSeparationService
} from "../../src/stems/index.js";

describe("separación real de cuatro stems", () => {
  const enabled =
    process.env.QDEV_STEMS_REAL_TEST === "1";
  const sourcePath =
    process.env.QDEV_STEMS_REAL_SOURCE ?? "";
  const cacheRoot =
    process.env.QDEV_STEMS_REAL_CACHE ?? "";
  const model =
    (process.env.QDEV_STEMS_REAL_MODEL as "htdemucs" | "htdemucs_ft" | undefined) ??
    "htdemucs_ft";

  it.skipIf(!enabled)(
    "separa una canción real en exactamente cuatro stems mediante la API MLX directa",
    async () => {
      if (!sourcePath.trim()) {
        throw new Error(
          "QDEV_STEMS_REAL_SOURCE es obligatorio para la prueba real."
        );
      }

      if (!cacheRoot.trim()) {
        throw new Error(
          "QDEV_STEMS_REAL_CACHE es obligatorio para la prueba real."
        );
      }

      const provider = new MlxDemucsProvider();

      const service = new StemSeparationService(
        provider,
        cacheRoot,
        MLX_DEMUCS_ENGINE_VERSION
      );

      const result = await service.separate({
        trackId: "real-test",
        sourcePath,
        model,
        force: true
      });

      expect(result.manifest.provider).toBe(
        "mlx-demucs"
      );
      expect(result.manifest.model).toBe(model);
      expect(result.manifest.modelVersion).toBe(
        MLX_DEMUCS_ENGINE_VERSION
      );
      expect(
        Object.keys(result.manifest.stems).sort()
      ).toEqual([...STEM_CHANNELS].sort());
      expect(result.manifest.sampleRate).toBeGreaterThan(0);
      expect(result.manifest.channels).toBeGreaterThan(0);
      expect(result.manifest.durationSeconds).toBeGreaterThan(0);

      for (const channel of STEM_CHANNELS) {
        await access(
          result.manifest.stems[channel].path
        );
      }
    },
    45 * 60 * 1000
  );
});
