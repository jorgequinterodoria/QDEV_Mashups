import {
  describe,
  expect,
  it
} from "vitest";

import {
  calculateHarmonicCompatibility,
  keyToCamelot,
  parseKeyLabel
} from "../../src/compatibility/harmonic";

describe("parseKeyLabel", () => {
  it("parses major keys", () => {
    expect(
      parseKeyLabel("C")
    ).toEqual({
      tonic: 0,
      mode: "major"
    });
  });

  it("parses minor keys", () => {
    expect(
      parseKeyLabel("Am")
    ).toEqual({
      tonic: 9,
      mode: "minor"
    });
  });

  it("parses flat keys", () => {
    expect(
      parseKeyLabel("Bb")
    ).toEqual({
      tonic: 10,
      mode: "major"
    });
  });
});

describe("keyToCamelot", () => {
  it("maps C major to 8B", () => {
    expect(
      keyToCamelot({
        label: "C",
        tonic: 0,
        mode: "major",
        confidence: 1
      })
    ).toBe("8B");
  });

  it("maps A minor to 8A", () => {
    expect(
      keyToCamelot({
        label: "Am",
        tonic: 9,
        mode: "minor",
        confidence: 1
      })
    ).toBe("8A");
  });
});

describe("calculateHarmonicCompatibility", () => {
  it("gives maximum score to the same key", () => {
    const result =
      calculateHarmonicCompatibility(
        {
          label: "Am",
          tonic: 9,
          mode: "minor",
          confidence: 1
        },
        {
          label: "Am",
          tonic: 9,
          mode: "minor",
          confidence: 1
        }
      );

    expect(result.score).toBe(100);
    expect(result.compatible).toBe(
      true
    );
  });

  it("recognizes Camelot neighbors", () => {
    const result =
      calculateHarmonicCompatibility(
        {
          label: "Am",
          tonic: 9,
          mode: "minor",
          confidence: 1
        },
        {
          label: "Em",
          tonic: 4,
          mode: "minor",
          confidence: 1
        }
      );

    expect(result.score).toBe(92);
    expect(result.compatible).toBe(
      true
    );
  });

  it("rejects missing tonal information", () => {
    const result =
      calculateHarmonicCompatibility(
        {
          label: null,
          tonic: null,
          mode: "unknown",
          confidence: null
        },
        {
          label: "Am",
          tonic: 9,
          mode: "minor",
          confidence: 1
        }
      );

    expect(result.score).toBe(0);
    expect(result.compatible).toBe(
      false
    );
  });
});