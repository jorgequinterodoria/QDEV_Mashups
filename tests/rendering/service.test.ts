import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  MashupRenderServiceImpl
} from "../../src/rendering/service";

import type {
  MashupRenderer,
  RenderResult
} from "../../src/rendering/types";

import type {
  MashupBuildPlan
} from "../../src/builder/types";

function createRenderer(): {
  renderer: MashupRenderer;
  result: RenderResult;
} {
  const result: RenderResult = {
    outputPath:
      "/output/mashup.wav",
    mode: "preview",
    durationSeconds: 30,
    sampleRate: 44100,
    channels: 2,
    baseTrackId: "a",
    secondaryTrackId: "b",
    tempoApplied: false,
    pitchApplied: false,
    normalized: true
  };

  const render =
    vi.fn<
      MashupRenderer["render"]
    >()
      .mockResolvedValue(
        result
      );

  return {
    renderer: {
      render
    },
    result
  };
}

function createPlan(
  readyForPreview = true
): MashupBuildPlan {
  return {
    planId:
      "a::b::124::Am",

    sourceCandidate: {
      trackAId: "a",
      trackBId: "b",
      score: 95,
      grade: "exceptional",
      confidence: "high",
      compatibility: {} as never
    },

    baseTrack: {
      trackId: "a",
      role: "base",
      originalBpm: 124,
      targetBpm: 124,
      tempoRatio: 1,
      tempoPercentChange: 0,
      originalKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 0.9
      },
      targetKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 0.9
      },
      pitchAdjustment: {
        semitones: 0,
        cents: 0
      },
      durationSeconds: 240
    },

    secondaryTrack: {
      trackId: "b",
      role: "vocal",
      originalBpm: 124,
      targetBpm: 124,
      tempoRatio: 1,
      tempoPercentChange: 0,
      originalKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 0.9
      },
      targetKey: {
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 0.9
      },
      pitchAdjustment: {
        semitones: 0,
        cents: 0
      },
      durationSeconds: 240
    },

    targetBpm: 124,

    targetKey: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 0.9
    },

    estimatedDurationSeconds:
      240,

    readyForPreview,

    warnings: [],

    createdAtMs: 1
  };
}

describe(
  "MashupRenderServiceImpl",
  () => {
    it(
      "creates a preview through the renderer",
      async () => {
        const {
          renderer,
          result
        } = createRenderer();

        const service =
          new MashupRenderServiceImpl(
            renderer
          );

        const output =
          await service.preview(
            createPlan(),
            "/music/base.wav",
            "/music/vocal.wav",
            "/output/mashup.wav"
          );

        expect(
          output
        ).toEqual(result);

        expect(
          renderer.render
        ).toHaveBeenCalledWith(
          {
            plan: createPlan(),
            baseTrackPath:
              "/music/base.wav",
            secondaryTrackPath:
              "/music/vocal.wav"
          },
          expect.objectContaining({
            mode: "preview",
            outputPath:
              "/output/mashup.wav"
          })
        );
      }
    );

    it(
      "creates a full render through the renderer",
      async () => {
        const {
          renderer
        } = createRenderer();

        const fullResult:
          RenderResult = {
          outputPath:
            "/output/final.wav",
          mode: "full",
          durationSeconds: 240,
          sampleRate: 44100,
          channels: 2,
          baseTrackId: "a",
          secondaryTrackId: "b",
          tempoApplied: false,
          pitchApplied: false,
          normalized: true
        };

        vi.mocked(
          renderer.render
        ).mockResolvedValue(
          fullResult
        );

        const service =
          new MashupRenderServiceImpl(
            renderer
          );

        const output =
          await service.render(
            createPlan(),
            "/music/base.wav",
            "/music/vocal.wav",
            "/output/final.wav"
          );

        expect(
          output.mode
        ).toBe("full");

        expect(
          output.durationSeconds
        ).toBe(240);
      }
    );

    it(
      "rejects plans that are not ready",
      async () => {
        const {
          renderer
        } = createRenderer();

        const service =
          new MashupRenderServiceImpl(
            renderer
          );

        await expect(
          service.preview(
            createPlan(false),
            "/music/base.wav",
            "/music/vocal.wav",
            "/output/mashup.wav"
          )
        ).rejects.toThrow(
          "The mashup build plan is not ready for rendering."
        );

        expect(
          renderer.render
        ).not.toHaveBeenCalled();
      }
    );
  }
);