import {
  describe,
  expect,
  it
} from "vitest";

import {
  MashupDiscoveryService
} from "../../src/discovery/service";

import type {
  CompatibilityEngine,
  MashupCompatibilityResult
} from "../../src/compatibility/types";

import type {
  MusicIntelligenceResult
} from "../../src/intelligence/types";

function createTrack(
  trackId: string
): MusicIntelligenceResult {
  return {
    trackId,
    analyzedAtMs: 1000,
    sourceSizeBytes: 1000,
    sourceModifiedTimeMs: 2000,
    durationSeconds: 240,

    tempo: {
      bpm: 124,
      confidence: 0.9,
      halfTimeBpm: 62,
      doubleTimeBpm: 248,
      beatTimes: [],
      onsetTimes: []
    },

    key: {
      label: "Am",
      tonic: 9,
      mode: "minor",
      confidence: 0.9
    },

    chords: [],

    spectral: {
      rms: 0.2,
      loudnessLufs: -14,
      spectralCentroidHz: 1500,
      spectralFlatness: 0.2,
      spectralRolloffHz: 3500,
      zeroCrossingRate: 0.06
    },

    energy: "medium",
    vocalProfile:
      "likely-instrumental",

    analysisVersion: 1,
    error: null
  };
}

function createCompatibility(
  trackAId: string,
  trackBId: string,
  score: number,
  grade:
    MashupCompatibilityResult["grade"] =
    "good",
  confidence:
    MashupCompatibilityResult["confidence"] =
    "high"
): MashupCompatibilityResult {
  return {
    trackAId,
    trackBId,
    calculatedAtMs: 1000,
    overallScore: score,
    grade,
    confidence,

    tempo: {
      score,
      normalizedDifferenceBpm: 0,
      effectiveBpmA: 124,
      effectiveBpmB: 124,
      ratio: 1,
      compatible: true
    },

    harmonic: {
      score,
      keyA: "Am",
      keyB: "Am",
      camelotA: "8A",
      camelotB: "8A",
      semitoneDistance: 0,
      compatible: true
    },

    energy: {
      score,
      energyA: "medium",
      energyB: "medium",
      distance: 0
    },

    vocal: {
      score,
      profileA:
        "likely-instrumental",
      profileB:
        "likely-instrumental",
      roleCompatible: true
    },

    structure: {
      score,
      durationDifferenceSeconds: 0,
      normalizedDurationDifference:
        0
    },

    weights: {
      tempo: 0.25,
      harmonic: 0.3,
      energy: 0.15,
      vocal: 0.15,
      structure: 0.15
    }
  };
}

class FakeCompatibilityEngine
  implements CompatibilityEngine
{
  compareCalls = 0;

  compare(
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult
  ): MashupCompatibilityResult {
    this.compareCalls += 1;

    const scores: Record<
      string,
      number
    > = {
      "a:b": 95,
      "a:c": 72,
      "a:d": 40,
      "b:c": 88,
      "b:d": 40,
      "c:d": 40
    };

    const key =
      `${trackA.trackId}:${trackB.trackId}`;

    const score =
      scores[key] ?? 40;

    const grade =
      score >= 90
        ? "exceptional"
        : score >= 80
          ? "excellent"
          : score >= 70
            ? "good"
            : score >= 55
              ? "possible"
              : score >= 35
                ? "weak"
                : "incompatible";

    return createCompatibility(
      trackA.trackId,
      trackB.trackId,
      score,
      grade
    );
  }
}

describe(
  "MashupDiscoveryService",
  () => {
    it("discovers and ranks compatible pairs", () => {
      const engine =
        new FakeCompatibilityEngine();

      const service =
        new MashupDiscoveryService(
          engine
        );

      const result =
        service.discover([
          createTrack("a"),
          createTrack("b"),
          createTrack("c")
        ]);

      expect(
        result.totalEvaluatedPairs
      ).toBe(3);

      expect(
        result.totalCompatiblePairs
      ).toBe(3);

      expect(
        result.candidates.map(
          (item) => item.score
        )
      ).toEqual([
        95,
        88,
        72
      ]);
    });

    it("excludes weak and incompatible candidates by default", () => {
      const engine =
        new FakeCompatibilityEngine();

      const service =
        new MashupDiscoveryService(
          engine
        );

      const result =
        service.discover([
          createTrack("a"),
          createTrack("b"),
          createTrack("c"),
          createTrack("d")
        ]);

      expect(
        result.candidates.some(
          (item) =>
            item.trackBId === "d"
        )
      ).toBe(false);

      expect(
        result.candidates.some(
          (item) =>
            item.trackAId === "d"
        )
      ).toBe(false);
    });

    it("supports minimum score filtering", () => {
      const service =
        new MashupDiscoveryService(
          new FakeCompatibilityEngine()
        );

      const result =
        service.discover(
          [
            createTrack("a"),
            createTrack("b"),
            createTrack("c")
          ],
          {
            minimumScore: 90
          }
        );

      expect(
        result.candidates.map(
          (item) => item.score
        )
      ).toEqual([95]);
    });

    it("limits the number of results", () => {
      const service =
        new MashupDiscoveryService(
          new FakeCompatibilityEngine()
        );

      const result =
        service.discover(
          [
            createTrack("a"),
            createTrack("b"),
            createTrack("c")
          ],
          {
            maxResults: 1
          }
        );

      expect(
        result.candidates
      ).toHaveLength(1);

      expect(
        result.candidates[0]?.score
      ).toBe(95);
    });

    it("discovers candidates for one source track", () => {
      const engine =
        new FakeCompatibilityEngine();

      const service =
        new MashupDiscoveryService(
          engine
        );

      const source =
        createTrack("a");

      const result =
        service.discoverForTrack(
          source,
          [
            source,
            createTrack("b"),
            createTrack("c"),
            createTrack("d")
          ]
        );

      expect(
        result.sourceTrackId
      ).toBe("a");

      expect(
        result.totalEvaluatedPairs
      ).toBe(3);

      expect(
        result.candidates.map(
          (item) => item.trackBId
        )
      ).toEqual([
        "b",
        "c"
      ]);

      expect(
        result.candidates.some(
          (item) =>
            item.trackBId === "a"
        )
      ).toBe(false);
    });

    it("deduplicates tracks by track ID", () => {
      const engine =
        new FakeCompatibilityEngine();

      const service =
        new MashupDiscoveryService(
          engine
        );

      const result =
        service.discover([
          createTrack("a"),
          createTrack("a"),
          createTrack("b")
        ]);

      expect(
        result.totalEvaluatedPairs
      ).toBe(1);

      expect(
        result.candidates
      ).toHaveLength(1);
    });

    it("rejects invalid maxResults", () => {
      const service =
        new MashupDiscoveryService(
          new FakeCompatibilityEngine()
        );

      expect(() =>
        service.discover(
          [
            createTrack("a"),
            createTrack("b")
          ],
          {
            maxResults: 0
          }
        )
      ).toThrow(
        "Discovery maxResults must be a positive integer."
      );
    });

    it("rejects invalid minimum score", () => {
      const service =
        new MashupDiscoveryService(
          new FakeCompatibilityEngine()
        );

      expect(() =>
        service.discover(
          [
            createTrack("a"),
            createTrack("b")
          ],
          {
            minimumScore: 101
          }
        )
      ).toThrow(
        "Discovery minimumScore must be between 0 and 100."
      );
    });

    it("uses the compatibility engine exactly once per evaluated pair", () => {
      const engine =
        new FakeCompatibilityEngine();

      const service =
        new MashupDiscoveryService(
          engine
        );

      service.discover([
        createTrack("a"),
        createTrack("b"),
        createTrack("c"),
        createTrack("d")
      ]);

      expect(
        engine.compareCalls
      ).toBe(6);
    });
  }
);