import type {
  EnergyLevel,
  MusicIntelligenceResult,
  VocalProfile
} from "../intelligence/types";

import type {
  EnergyCompatibility,
  StructureCompatibility,
  VocalCompatibility
} from "./types";

const ENERGY_VALUES: Record<
  EnergyLevel,
  number
> = {
  "very-low": 0,
  low: 1,
  medium: 2,
  high: 3,
  "very-high": 4,
  unknown: -1
};

export function calculateEnergyCompatibility(
  energyA: EnergyLevel,
  energyB: EnergyLevel
): EnergyCompatibility {
  const valueA =
    ENERGY_VALUES[energyA];

  const valueB =
    ENERGY_VALUES[energyB];

  if (
    valueA < 0 ||
    valueB < 0
  ) {
    return {
      score: 0,
      energyA,
      energyB,
      distance: null
    };
  }

  const distance = Math.abs(
    valueA - valueB
  );

  const score =
    distance === 0
      ? 100
      : distance === 1
        ? 85
        : distance === 2
          ? 60
          : distance === 3
            ? 30
            : 10;

  return {
    score,
    energyA,
    energyB,
    distance
  };
}

export function calculateVocalCompatibility(
  profileA: VocalProfile,
  profileB: VocalProfile
): VocalCompatibility {
  if (
    profileA === "unknown" ||
    profileB === "unknown"
  ) {
    return {
      score: 50,
      profileA,
      profileB,
      roleCompatible: true
    };
  }

  if (
    profileA === "likely-vocal" &&
    profileB === "likely-vocal"
  ) {
    return {
      score: 45,
      profileA,
      profileB,
      roleCompatible: false
    };
  }

  if (
    profileA === "likely-instrumental" &&
    profileB === "likely-instrumental"
  ) {
    return {
      score: 75,
      profileA,
      profileB,
      roleCompatible: true
    };
  }

  return {
    score: 100,
    profileA,
    profileB,
    roleCompatible: true
  };
}

export function calculateStructureCompatibility(
  trackA: MusicIntelligenceResult,
  trackB: MusicIntelligenceResult
): StructureCompatibility {
  const durationA =
    trackA.durationSeconds;

  const durationB =
    trackB.durationSeconds;

  if (
    durationA === null ||
    durationB === null ||
    durationA <= 0 ||
    durationB <= 0
  ) {
    return {
      score: 50,
      durationDifferenceSeconds: null,
      normalizedDurationDifference:
        null
    };
  }

  const difference = Math.abs(
    durationA - durationB
  );

  const normalized =
    difference /
    Math.max(
      durationA,
      durationB
    );

  const score =
    normalized <= 0.05
      ? 100
      : normalized <= 0.1
        ? 90
        : normalized <= 0.2
          ? 75
          : normalized <= 0.35
            ? 55
            : normalized <= 0.5
              ? 35
              : 15;

  return {
    score,
    durationDifferenceSeconds:
      difference,
    normalizedDurationDifference:
      normalized
  };
}