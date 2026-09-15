import type {
  MashupBuildPlan
} from "../builder/types";

import {
  AudioMashupRenderer
} from "./renderer";

import type {
  MashupRenderer,
  RenderOptions,
  RenderResult
} from "./types";

export interface MashupRenderService {
  preview(
    plan: MashupBuildPlan,
    baseTrackPath: string,
    secondaryTrackPath: string,
    outputPath: string,
    options?: Omit<
      RenderOptions,
      "mode" | "outputPath"
    >
  ): Promise<RenderResult>;

  render(
    plan: MashupBuildPlan,
    baseTrackPath: string,
    secondaryTrackPath: string,
    outputPath: string,
    options?: Omit<
      RenderOptions,
      "mode" | "outputPath"
    >
  ): Promise<RenderResult>;
}

export class MashupRenderServiceImpl
  implements MashupRenderService
{
  constructor(
    private readonly renderer:
      MashupRenderer =
      new AudioMashupRenderer()
  ) {}

  async preview(
    plan: MashupBuildPlan,
    baseTrackPath: string,
    secondaryTrackPath: string,
    outputPath: string,
    options: Omit<
      RenderOptions,
      "mode" | "outputPath"
    > = {}
  ): Promise<RenderResult> {
    assertPreviewReady(plan);

    return this.renderer.render(
      {
        plan,
        baseTrackPath,
        secondaryTrackPath
      },
      {
        ...options,
        mode: "preview",
        outputPath
      }
    );
  }

  async render(
    plan: MashupBuildPlan,
    baseTrackPath: string,
    secondaryTrackPath: string,
    outputPath: string,
    options: Omit<
      RenderOptions,
      "mode" | "outputPath"
    > = {}
  ): Promise<RenderResult> {
    assertPreviewReady(plan);

    return this.renderer.render(
      {
        plan,
        baseTrackPath,
        secondaryTrackPath
      },
      {
        ...options,
        mode: "full",
        outputPath
      }
    );
  }
}

function assertPreviewReady(
  plan: MashupBuildPlan
): void {
  if (!plan.readyForPreview) {
    throw new Error(
      "The mashup build plan is not ready for rendering."
    );
  }
}