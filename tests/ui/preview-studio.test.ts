import { describe, expect, it } from "vitest";

import {
  PreviewStudioController,
  renderPreviewStudio
} from "../../src/ui/preview-studio.js";
import { StemMixerPanelController } from "../../src/ui/stem-mixer-panel.js";

const plan = {
  schemaVersion: 1 as const,
  primaryTrackId: "track-a",
  secondaryTrackId: "track-b",
  bpmRatio: 1.015625,
  bpmCompatible: true,
  selectedChannels: [
    {
      channel: "vocals" as const,
      sourceTrackId: "track-a",
      action: "include" as const,
      gainDb: -2,
      pan: 0,
      offsetSeconds: 0,
      startSeconds: 0,
      durationSeconds: 64
    },
    {
      channel: "drums" as const,
      sourceTrackId: "track-b",
      action: "include" as const,
      gainDb: -4,
      pan: 0,
      offsetSeconds: 0,
      startSeconds: 0,
      durationSeconds: 64
    }
  ],
  transitionSeconds: 8,
  durationSeconds: 64
};

describe("PreviewStudio", () => {
  it("genera una vista profesional en español", () => {
    const mixer = new StemMixerPanelController();

    const html = renderPreviewStudio(
      {
        status: "idle",
        currentTimeSeconds: 0,
        durationSeconds: 64,
        outputPath: null,
        errorMessage: null,
        renderProgress01: 0
      },
      plan,
      mixer.getState().mixer
    );

    expect(html).toContain("Estudio de previsualización");
    expect(html).toContain("Reproducir");
    expect(html).toContain("Detener");
    expect(html).toContain("Renderizar preview");
    expect(html).toContain("Fuentes");
    expect(html).toContain("Stems incluidos");
    expect(html).not.toContain("Guitar");
    expect(html).not.toContain("Piano");
  });

  it("presenta el progreso temporal correcto", () => {
    const html = renderPreviewStudio(
      {
        status: "playing",
        currentTimeSeconds: 32,
        durationSeconds: 64,
        outputPath: null,
        errorMessage: null,
        renderProgress01: 0
      },
      plan,
      new StemMixerPanelController().getState().mixer
    );

    expect(html).toContain("0:32");
    expect(html).toContain("1:04");
    expect(html).toContain('style="width: 50%"');
  });

  it("integra el estado del mezclador y permite renderizar mediante callback", async () => {
    const mixer = new StemMixerPanelController();
    mixer.setGain("vocals", -6);

    let receivedMixerGain = 0;

    const controller = new PreviewStudioController(
      plan,
      mixer,
      {
        onRenderPreview: async (_plan, state) => {
          receivedMixerGain = state.channels.vocals.gainDb;
          return {
            outputPath: "/tmp/qdev-preview.wav",
            durationSeconds: 48
          };
        }
      }
    );

    await controller.renderPreview();

    expect(receivedMixerGain).toBe(-6);
    expect(controller.getState().outputPath).toBe(
      "/tmp/qdev-preview.wav"
    );
    expect(controller.getState().durationSeconds).toBe(48);
    expect(controller.getState().renderProgress01).toBe(1);
  });

  it("gestiona playback sin depender de un elemento de audio", async () => {
    const controller = new PreviewStudioController(plan);

    await controller.togglePlayback();
    expect(controller.getState().status).toBe("playing");

    await controller.togglePlayback();
    expect(controller.getState().status).toBe("paused");

    controller.stop();
    expect(controller.getState().status).toBe("idle");
    expect(controller.getState().currentTimeSeconds).toBe(0);
  });

  it("expone un error claro cuando no existe renderer", async () => {
    const controller = new PreviewStudioController(plan);

    await controller.renderPreview();

    expect(controller.getState().status).toBe("error");
    expect(controller.getState().errorMessage).toContain(
      "renderer de preview"
    );
  });
});
