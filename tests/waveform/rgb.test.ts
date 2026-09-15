import { describe, expect, it } from "vitest";
import { buildRgbWaveform, rgbCss } from "../../src/waveform/rgb";

function createBuffer(): AudioBuffer {
  const frames = 8000;
  const low = new Float32Array(frames);
  const high = new Float32Array(frames);

  for (let index = 0; index < frames; index += 1) {
    low[index] = Math.sin((index / 8000) * Math.PI * 2 * 4);
    high[index] = Math.sin((index / 8000) * Math.PI * 2 * 1200);
  }

  return {
    length: frames,
    duration: 1,
    sampleRate: 8000,
    numberOfChannels: 2,
    getChannelData(channel: number) {
      return channel === 0 ? low : high;
    }
  } as AudioBuffer;
}

describe("waveform RGB", () => {
  it("genera exactamente el número de barras solicitado", () => {
    const result = buildRgbWaveform(createBuffer(), { bars: 64 });
    expect(result.points).toHaveLength(64);
    expect(result.durationSeconds).toBe(1);
  });

  it("normaliza los tres componentes entre 0 y 1", () => {
    const result = buildRgbWaveform(createBuffer(), { bars: 32 });
    for (const point of result.points) {
      expect(point.red).toBeGreaterThanOrEqual(0);
      expect(point.red).toBeLessThanOrEqual(1);
      expect(point.green).toBeGreaterThanOrEqual(0);
      expect(point.green).toBeLessThanOrEqual(1);
      expect(point.blue).toBeGreaterThanOrEqual(0);
      expect(point.blue).toBeLessThanOrEqual(1);
      expect(point.amplitude).toBeGreaterThanOrEqual(0);
      expect(point.amplitude).toBeLessThanOrEqual(1);
    }
  });

  it("produce un color CSS RGB", () => {
    expect(rgbCss({ red: 1, green: 0.5, blue: 0, amplitude: 1 }, 0.8)).toBe(
      "rgba(255, 128, 0, 0.8)"
    );
  });
});
