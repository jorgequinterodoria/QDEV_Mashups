import {
  describe,
  expect,
  it
} from "vitest";

import {
  classifyEnergy,
  classifyVocalProfile
} from "../../src/intelligence/classification";

describe("classifyEnergy", () => {
  it("classifies very low RMS", () => {
    expect(
      classifyEnergy({
        rms: 0.02,
        loudnessLufs: -40,
        spectralCentroidHz: 500,
        spectralFlatness: 0.1,
        spectralRolloffHz: 1000,
        zeroCrossingRate: 0.02
      })
    ).toBe("very-low");
  });

  it("classifies medium RMS", () => {
    expect(
      classifyEnergy({
        rms: 0.2,
        loudnessLufs: -20,
        spectralCentroidHz: 1500,
        spectralFlatness: 0.2,
        spectralRolloffHz: 3000,
        zeroCrossingRate: 0.05
      })
    ).toBe("medium");
  });

  it("classifies very high RMS", () => {
    expect(
      classifyEnergy({
        rms: 0.7,
        loudnessLufs: -5,
        spectralCentroidHz: 2500,
        spectralFlatness: 0.4,
        spectralRolloffHz: 6000,
        zeroCrossingRate: 0.1
      })
    ).toBe("very-high");
  });

  it("returns unknown without RMS", () => {
    expect(
      classifyEnergy({
        rms: null,
        loudnessLufs: null,
        spectralCentroidHz: null,
        spectralFlatness: null,
        spectralRolloffHz: null,
        zeroCrossingRate: null
      })
    ).toBe("unknown");
  });
});

describe("classifyVocalProfile", () => {
  it("identifies a likely vocal profile", () => {
    expect(
      classifyVocalProfile({
        rms: 0.2,
        loudnessLufs: -20,
        spectralCentroidHz: 2200,
        spectralFlatness: 0.3,
        spectralRolloffHz: 5000,
        zeroCrossingRate: 0.1
      })
    ).toBe("likely-vocal");
  });

  it("identifies a likely instrumental profile", () => {
    expect(
      classifyVocalProfile({
        rms: 0.2,
        loudnessLufs: -20,
        spectralCentroidHz: 900,
        spectralFlatness: 0.1,
        spectralRolloffHz: 2500,
        zeroCrossingRate: 0.04
      })
    ).toBe("likely-instrumental");
  });

  it("returns unknown for ambiguous material", () => {
    expect(
      classifyVocalProfile({
        rms: 0.2,
        loudnessLufs: -20,
        spectralCentroidHz: 1500,
        spectralFlatness: 0.2,
        spectralRolloffHz: 3500,
        zeroCrossingRate: 0.06
      })
    ).toBe("unknown");
  });
});