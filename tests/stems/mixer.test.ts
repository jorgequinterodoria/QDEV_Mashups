import { describe, expect, it } from "vitest";

import {
  STEM_MIXER_MAX_GAIN_DB,
  STEM_MIXER_MIN_GAIN_DB,
  StemMixer,
  StemMixerError
} from "../../src/stems/index.js";

describe("StemMixer", () => {
  it("crea exactamente los cuatro canales", () => {
    const mixer = new StemMixer();
    const state = mixer.getState();

    expect(Object.keys(state.channels).sort()).toEqual([
      "bass",
      "drums",
      "other",
      "vocals"
    ]);
    expect(state.masterGainDb).toBe(0);
  });

  it("permite controlar ganancia, panorama y mute por canal", () => {
    const mixer = new StemMixer();

    mixer.setChannel("vocals", {
      gainDb: -3,
      pan: -0.25,
      muted: true
    });

    expect(mixer.getChannel("vocals")).toEqual({
      channel: "vocals",
      gainDb: -3,
      pan: -0.25,
      muted: true
    });
  });

  it("valida los límites de ganancia y panorama", () => {
    const mixer = new StemMixer();

    mixer.setGain("bass", STEM_MIXER_MIN_GAIN_DB);
    mixer.setGain("drums", STEM_MIXER_MAX_GAIN_DB);

    expect(() =>
      mixer.setGain("other", STEM_MIXER_MIN_GAIN_DB - 0.1)
    ).toThrow(StemMixerError);
    expect(() =>
      mixer.setGain("other", STEM_MIXER_MAX_GAIN_DB + 0.1)
    ).toThrow(StemMixerError);
    expect(() => mixer.setPan("other", -1.1)).toThrow(StemMixerError);
    expect(() => mixer.setPan("other", 1.1)).toThrow(StemMixerError);
  });

  it("calcula correctamente mute, solo y ganancia master", () => {
    const mixer = new StemMixer();

    mixer.setGain("vocals", -3);
    mixer.setGain("drums", -6);
    mixer.setMuted("bass", true);
    mixer.setMasterGain(-2);

    const effective = mixer.getEffectiveChannels(["vocals"]);

    expect(effective.find((item) => item.channel === "vocals")).toEqual({
      channel: "vocals",
      audible: true,
      gainDb: -5,
      pan: 0
    });

    expect(effective.find((item) => item.channel === "drums")?.audible).toBe(
      false
    );
    expect(effective.find((item) => item.channel === "bass")?.audible).toBe(
      false
    );
    expect(effective.find((item) => item.channel === "other")?.audible).toBe(
      false
    );
  });

  it("permite snapshots, restauración y eliminación", () => {
    const mixer = new StemMixer();

    mixer.setGain("vocals", -8);
    mixer.saveSnapshot("Vocal Lead");

    mixer.setGain("vocals", 4);
    mixer.loadSnapshot("Vocal Lead");

    expect(mixer.getChannel("vocals").gainDb).toBe(-8);
    expect(mixer.listSnapshots()).toEqual(["Vocal Lead"]);
    expect(mixer.deleteSnapshot("Vocal Lead")).toBe(true);
    expect(mixer.listSnapshots()).toEqual([]);
  });

  it("rechaza snapshots vacíos o inexistentes", () => {
    const mixer = new StemMixer();

    expect(() => mixer.saveSnapshot("   ")).toThrow(StemMixerError);
    expect(() => mixer.loadSnapshot("missing")).toThrow(StemMixerError);
  });

  it("restaura un canal o todo el mezclador a valores neutros", () => {
    const mixer = new StemMixer();

    mixer.setChannel("drums", {
      gainDb: 5,
      pan: 0.5,
      muted: true
    });
    mixer.setMasterGain(6);

    mixer.resetChannel("drums");
    expect(mixer.getChannel("drums")).toEqual({
      channel: "drums",
      gainDb: 0,
      pan: 0,
      muted: false
    });

    mixer.reset();
    expect(mixer.getState().masterGainDb).toBe(0);
  });

  it("protege el estado recibido de mutaciones externas", () => {
    const mixer = new StemMixer();
    const state = mixer.getState();

    const externallyMutable = {
      ...state,
      channels: {
        ...state.channels,
        vocals: {
          ...state.channels.vocals
        }
      }
    };

    externallyMutable.channels.vocals.gainDb = -10;

    expect(mixer.getChannel("vocals").gainDb).toBe(0);
  });

  it("rechaza un estado que no tenga exactamente cuatro stems", () => {
    const mixer = new StemMixer();
    const state = mixer.getState();

    const invalid = {
      ...state,
      channels: {
        vocals: state.channels.vocals,
        drums: state.channels.drums,
        bass: state.channels.bass
      }
    };

    expect(() => new StemMixer(invalid as never)).toThrow(StemMixerError);
  });
});
