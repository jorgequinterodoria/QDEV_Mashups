import { describe, expect, it } from "vitest";

import {
  STEM_MIXER_UI_LABELS,
  getStemMixerUiSummary,
  renderStemMixerPanel,
  StemMixerPanelController
} from "../../src/ui/stem-mixer-panel.js";
import { StemMixer } from "../../src/stems/mixer.js";

describe("StemMixerPanel", () => {
  it("genera una interfaz en español con exactamente cuatro canales", () => {
    const mixer = new StemMixer();
    const html = renderStemMixerPanel({
      mixer: mixer.getState(),
      soloChannels: [],
      selectedSnapshot: null
    });

    expect(html).toContain("Mezclador de stems");
    expect(html).toContain("Voces");
    expect(html).toContain("Batería");
    expect(html).toContain("Bajo");
    expect(html).toContain("Otros");

    const channelCards = [
      ...html.matchAll(/<article class="qdev-stem-channel" data-stem-channel="([^"]+)"/g)
    ].map((match) => match[1]);

    expect(channelCards).toEqual([
      "vocals",
      "drums",
      "bass",
      "other"
    ]);
    expect(channelCards).toHaveLength(4);

    expect(html).not.toContain("Guitar");
    expect(html).not.toContain("Piano");
  });

  it("expone todos los controles profesionales principales", () => {
    const html = renderStemMixerPanel({
      mixer: new StemMixer().getState(),
      soloChannels: [],
      selectedSnapshot: null
    });

    expect(html).toContain('data-action="gain"');
    expect(html).toContain('data-action="pan"');
    expect(html).toContain('data-action="mute"');
    expect(html).toContain('data-action="solo"');
    expect(html).toContain('data-action="reset-channel"');
    expect(html).toContain('data-action="master"');
    expect(html).toContain('data-action="save-snapshot"');
    expect(html).toContain('data-action="load-snapshot"');
    expect(html).toContain('data-action="reset-all"');
  });

  it("refleja correctamente mute y solo en el resumen de UI", () => {
    const mixer = new StemMixer();
    mixer.setMuted("bass", true);

    const summary = getStemMixerUiSummary({
      mixer: mixer.getState(),
      soloChannels: ["vocals"],
      selectedSnapshot: null
    });

    expect(summary.channels).toEqual([
      "vocals",
      "drums",
      "bass",
      "other"
    ]);
    expect(summary.audibleChannels).toEqual(["vocals"]);
    expect(summary.mutedChannels).toEqual(["drums", "bass", "other"]);
  });

  it("mantiene el estado reproducible en el controlador", () => {
    const controller = new StemMixerPanelController();

    controller.setGain("vocals", -4);
    controller.setPan("vocals", 0.2);
    controller.setMuted("drums", true);
    controller.setSolo("vocals", true);

    expect(controller.getState().mixer.channels.vocals.gainDb).toBe(-4);
    expect(controller.getState().mixer.channels.vocals.pan).toBe(0.2);
    expect(controller.getState().mixer.channels.drums.muted).toBe(true);
    expect(controller.getState().soloChannels).toEqual(["vocals"]);
  });

  it("permite snapshots desde el controlador", () => {
    const controller = new StemMixerPanelController();

    controller.setGain("vocals", -8);
    controller.saveSnapshot("Voz principal");
    controller.setGain("vocals", 2);
    controller.loadSnapshot("Voz principal");

    expect(controller.getState().mixer.channels.vocals.gainDb).toBe(-8);
    expect(controller.getState().selectedSnapshot).toBe("Voz principal");
  });

  it("mantiene etiquetas principales en español", () => {
    expect(STEM_MIXER_UI_LABELS.title).toBe("Mezclador de stems");
    expect(STEM_MIXER_UI_LABELS.channels.vocals).toBe("Voces");
    expect(STEM_MIXER_UI_LABELS.channels.drums).toBe("Batería");
    expect(STEM_MIXER_UI_LABELS.channels.bass).toBe("Bajo");
    expect(STEM_MIXER_UI_LABELS.channels.other).toBe("Otros");
  });
});
