import { describe, expect, it } from "vitest";
import type {
  PreviewResult,
  QdevDesktopApi
} from "../../src/desktop/types";

describe("full mashup desktop contract", () => {
  it("exposes a stable plan id and full-output operation", () => {
    const preview: PreviewResult = {
      outputPath:
        "/Users/test/Music/QDEV Mashups/Previews/qdev-preview-test.wav",
      planId: "plan-test",
      kind: "preview",
      score: 89,
      grade: "Excellent",
      confidence: "high",
      targetBpm: 128,
      targetKey: "F",
      durationSeconds: 30
    };

    const api = {
      getRuntimeInfo: async () => ({
        appVersion: "0.1.0",
        electronVersion: "44.3.0",
        nodeVersion: "24.19.0",
        chromeVersion: "130.0.0.0",
        platform: "darwin",
        arch: "arm64"
      }),
      chooseLibrary: async () => null,
      scanLibrary: async () => ({
        root: "/Music",
        tracks: 0,
        totalBytes: 0,
        scannedAtMs: Date.now(),
        discoveryCandidates: [],
        discoveryPairsEvaluated: 0,
        discoveryTracksAnalyzed: 0
      }),
      chooseAudioFiles: async () => [],
      createPreview: async () => preview,
      createFullMashup: async () => ({
        ...preview,
        outputPath:
          "/Users/test/Music/QDEV Mashups/Mashups/QDEV - full.wav",
        kind: "full",
        durationSeconds: 210
      }),
      revealOutput: async () => undefined,
      getAudioUrl: async () =>
        "file:///Users/test/Music/QDEV%20Mashups/Previews/test.wav"
    } satisfies QdevDesktopApi;

    expect(api.createFullMashup).toBeTypeOf(
      "function"
    );
    expect(preview.planId).toBe("plan-test");
    expect(api).toBeDefined();
  });
});
