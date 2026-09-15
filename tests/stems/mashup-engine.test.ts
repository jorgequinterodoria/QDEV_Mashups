import { describe, expect, it } from "vitest";

import {
  MashupEngineError,
  MashupStemEngine
} from "../../src/stems/index.js";

const primary = {
  trackId: "track-a",
  title: "Track A",
  bpm: 128,
  key: "Am",
  durationSeconds: 300,
  stems: {
    vocals: "/stems/a/vocals.wav",
    drums: "/stems/a/drums.wav",
    bass: "/stems/a/bass.wav",
    other: "/stems/a/other.wav"
  }
} as const;

const secondary = {
  trackId: "track-b",
  title: "Track B",
  bpm: 130,
  key: "Am",
  durationSeconds: 280,
  stems: {
    vocals: "/stems/b/vocals.wav",
    drums: "/stems/b/drums.wav",
    bass: "/stems/b/bass.wav",
    other: "/stems/b/other.wav"
  }
} as const;

describe("MashupStemEngine", () => {
  it("construye un plan usando exclusivamente los cuatro stems", () => {
    const engine = new MashupStemEngine();
    const plan = engine.build({
      primary,
      secondary,
      selectedChannels: ["vocals", "drums"],
      secondaryChannels: ["bass"]
    });

    expect(plan.schemaVersion).toBe(1);
    expect(plan.bpmCompatible).toBe(true);
    expect(plan.selectedChannels).toHaveLength(3);
    expect(plan.selectedChannels.map((item) => item.channel)).toEqual([
      "vocals",
      "drums",
      "bass"
    ]);
    expect(plan.durationSeconds).toBe(280);
  });

  it("aplica ganancias independientes al origen de cada stem", () => {
    const engine = new MashupStemEngine();
    const plan = engine.build({
      primary,
      secondary,
      selectedChannels: ["vocals"],
      secondaryChannels: ["drums", "bass"],
      primaryGainDb: -3,
      secondaryGainDb: -6
    });

    expect(plan.selectedChannels).toEqual([
      expect.objectContaining({
        sourceTrackId: "track-a",
        channel: "vocals",
        gainDb: -3
      }),
      expect.objectContaining({
        sourceTrackId: "track-b",
        channel: "drums",
        gainDb: -6
      }),
      expect.objectContaining({
        sourceTrackId: "track-b",
        channel: "bass",
        gainDb: -6
      })
    ]);
  });

  it("rechaza tracks iguales y BPM incompatibles", () => {
    const engine = new MashupStemEngine();

    expect(() =>
      engine.build({ primary, secondary: { ...secondary, trackId: "track-a" } })
    ).toThrow(MashupEngineError);

    expect(() =>
      engine.build({
        primary,
        secondary: { ...secondary, bpm: 150 }
      })
    ).toThrow(MashupEngineError);
  });

  it("rechaza canales inválidos y parámetros de mezcla inválidos", () => {
    const engine = new MashupStemEngine();

    expect(() =>
      engine.build({
        primary,
        secondary,
        selectedChannels: ["vocals", "guitar" as never]
      })
    ).toThrow(MashupEngineError);

    expect(() =>
      engine.build({
        primary,
        secondary,
        primaryGainDb: 20
      })
    ).toThrow(MashupEngineError);

    expect(() =>
      engine.build({
        primary,
        secondary,
        transitionSeconds: 999
      })
    ).toThrow(MashupEngineError);
  });

  it("permite excluir un stem sin alterar los demás", () => {
    const engine = new MashupStemEngine();
    const plan = engine.build({
      primary,
      secondary,
      selectedChannels: ["vocals", "drums"],
      secondaryChannels: ["bass"]
    });

    const updated = MashupStemEngine.exclude(plan, "track-b", "bass");

    expect(updated.selectedChannels.find(
      (item) => item.sourceTrackId === "track-b" && item.channel === "bass"
    )?.action).toBe("exclude");

    expect(updated.selectedChannels.find(
      (item) => item.sourceTrackId === "track-a" && item.channel === "vocals"
    )?.action).toBe("include");
  });

  it("valida planes y conserva sus datos", () => {
    const engine = new MashupStemEngine();
    const plan = engine.build({ primary, secondary });

    const validated = MashupStemEngine.validate(plan);

    expect(validated).toEqual(plan);
    expect(validated.selectedChannels.every((item) =>
      ["vocals", "drums", "bass", "other"].includes(item.channel)
    )).toBe(true);
  });
});
