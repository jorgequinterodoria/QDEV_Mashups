import type {
  MusicIntelligenceResult
} from "../intelligence/types";

import type {
  CompatibilityEngine,
  CompatibilityWeights,
  MashupCompatibilityResult
} from "./types";

import {
  calculateHarmonicCompatibility
} from "./harmonic";

import {
  calculateTempoCompatibilityFromTracks
} from "./tempo";

import {
  calculateEnergyCompatibility,
  calculateStructureCompatibility,
  calculateVocalCompatibility
} from "./scoring";

const DEFAULT_WEIGHTS: CompatibilityWeights = {
  tempo: 0.25,
  harmonic: 0.3,
  energy: 0.15,
  vocal: 0.15,
  structure: 0.15
};

export class MashupCompatibilityEngine
  implements CompatibilityEngine
{
  private readonly weights: CompatibilityWeights;

  constructor(
    weights: CompatibilityWeights = DEFAULT_WEIGHTS
  ) {
    validateWeights(weights);

    this.weights = {
      ...weights
    };
  }

  compare(
    trackA: MusicIntelligenceResult,
    trackB: MusicIntelligenceResult
  ): MashupCompatibilityResult {
    const tempo =
      calculateTempoCompatibilityFromTracks(
        trackA.tempo,
        trackB.tempo
      );

    const harmonic =
      calculateHarmonicCompatibility(
        trackA.key,
        trackB.key
      );

    const energy =
      calculateEnergyCompatibility(
        trackA.energy,
        trackB.energy
      );

    const vocal =
      calculateVocalCompatibility(
        trackA.vocalProfile,
        trackB.vocalProfile
      );

    const structure =
      calculateStructureCompatibility(
        trackA,
        trackB
      );

    const overallScore = clampScore(
      Math.round(
        tempo.score * this.weights.tempo +
          harmonic.score *
            this.weights.harmonic +
          energy.score * this.weights.energy +
          vocal.score * this.weights.vocal +
          structure.score *
            this.weights.structure
      )
    );

    return {
      trackAId: trackA.trackId,
      trackBId: trackB.trackId,
      calculatedAtMs: Date.now(),

      overallScore,

      grade:
        calculateGrade(overallScore),

      confidence:
        calculateConfidence({
          tempo,
          harmonic,
          energy,
          vocal,
          structure
        }),

      tempo,
      harmonic,
      energy,
      vocal,
      structure,

      weights: {
        ...this.weights
      }
    };
  }
}

function validateWeights(
  weights: CompatibilityWeights
): void {
  const values = [
    weights.tempo,
    weights.harmonic,
    weights.energy,
    weights.vocal,
    weights.structure
  ];

  if (
    values.some(
      (value) =>
        !Number.isFinite(value) ||
        value < 0
    )
  ) {
    throw new Error(
      "Compatibility weights must be finite and non-negative."
    );
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  if (Math.abs(total - 1) > 0.000001) {
    throw new Error(
      "Compatibility weights must sum to 1."
    );
  }
}

function calculateGrade(
  score: number
) {
  if (score >= 90) {
    return "exceptional" as const;
  }

  if (score >= 80) {
    return "excellent" as const;
  }

  if (score >= 70) {
    return "good" as const;
  }

  if (score >= 55) {
    return "possible" as const;
  }

  if (score >= 35) {
    return "weak" as const;
  }

  return "incompatible" as const;
}

function calculateConfidence(
  components: {
    tempo: {
      effectiveBpmA: number | null;
      effectiveBpmB: number | null;
    };
    harmonic: {
      semitoneDistance: number | null;
    };
    energy: {
      distance: number | null;
    };
    vocal: {
      score: number;
    };
    structure: {
      durationDifferenceSeconds:
        | number
        | null;
    };
  }
) {
  let available = 0;

  if (
    components.tempo.effectiveBpmA !==
      null &&
    components.tempo.effectiveBpmB !== null
  ) {
    available += 2;
  }

  if (
    components.harmonic.semitoneDistance !==
    null
  ) {
    available += 2;
  }

  if (
    components.energy.distance !== null
  ) {
    available += 2;
  }

  available += 2;

  if (
    components.structure
      .durationDifferenceSeconds !== null
  ) {
    available += 2;
  }

  if (available >= 9) {
    return "high" as const;
  }

  if (available >= 6) {
    return "medium" as const;
  }

  return "low" as const;
}

function clampScore(
  score: number
): number {
  return Math.max(
    0,
    Math.min(100, score)
  );
}