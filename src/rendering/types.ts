import type {
  MashupBuildPlan
} from "../builder/types";

export type RenderMode =
  | "preview"
  | "full";

export interface RenderOptions {
  mode?: RenderMode;
  previewDurationSeconds?: number;
  outputPath: string;
  baseGainDb?: number;
  secondaryGainDb?: number;
  normalize?: boolean;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}

export interface RenderInput {
  plan: MashupBuildPlan;
  baseTrackPath: string;
  secondaryTrackPath: string;
}

export interface RenderResult {
  outputPath: string;
  mode: RenderMode;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  baseTrackId: string;
  secondaryTrackId: string;
  tempoApplied: boolean;
  pitchApplied: boolean;
  normalized: boolean;
}

export interface MashupRenderer {
  render(
    input: RenderInput,
    options: RenderOptions
  ): Promise<RenderResult>;
}