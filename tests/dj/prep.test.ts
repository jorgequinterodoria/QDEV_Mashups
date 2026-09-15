import { describe, expect, it } from "vitest";
import { DjPrepError, DjPrepService } from "../../src/dj/index.js";

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
  beatgridConfidence: 0.98
};

const secondary = {
  trackId: "track-b",
  sourcePath: "/music/b.wav",
  bpm: 126,
  durationSeconds: 160,
  firstBeatSeconds: 0.1,
  beatgridConfidence: 0.91
};

describe("DJ Prep", () => {
  it("genera beatgrid y cinco cues por track", () => {
    const result = new DjPrepService().prepare(plan, primary, secondary);
    expect(result.primary.beatgrid).toEqual({
      bpm: 128,
      firstBeatSeconds: 0.25,
      beatsPerBar: 4,
      confidence: 0.98
    });
    expect(result.primary.cues).toHaveLength(5);
    expect(result.secondary.cues).toHaveLength(5);
    expect(result.mashupPlanFingerprint).toMatch(/^[0-9a-f]{8}$/);
  });

  it("mantiene todos los cues dentro de la duración", () => {
    const result = new DjPrepService({
      introBars: 32,
      mixInBars: 32,
      transitionBars: 32,
      mixOutBars: 32,
      outroBars: 32
    }).prepare(plan, { ...primary, durationSeconds: 30 }, { ...secondary, durationSeconds: 30 });

    for (const track of [result.primary, result.secondary]) {
      for (const cue of track.cues) {
        expect(cue.positionSeconds).toBeGreaterThanOrEqual(track.beatgrid.firstBeatSeconds);
        expect(cue.positionSeconds).toBeLessThanOrEqual(track.durationSeconds);
      }
    }
  });

  it("conserva preview y valida errores", () => {
    const service = new DjPrepService();
    const result = service.prepare(
      plan,
      { ...primary, previewPath: "/preview/a.wav" },
      secondary
    );
    expect(result.primary.previewPath).toBe("/preview/a.wav");
    expect(DjPrepService.validate(result)).toEqual(result);

    expect(() => service.prepare(plan, { ...primary, bpm: 0 }, secondary))
      .toThrow(DjPrepError);
    expect(() => service.prepare(plan, primary, { ...secondary, trackId: primary.trackId }))
      .toThrow(DjPrepError);
  });
});
