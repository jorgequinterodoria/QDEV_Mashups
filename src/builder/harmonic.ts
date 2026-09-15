import type {
  KeyAnalysis
} from "../intelligence/types";

export interface PitchAdjustment {
  semitones: number;
  cents: number;
}

export function chooseTargetKey(
  keyA: KeyAnalysis,
  keyB: KeyAnalysis
): KeyAnalysis {
  if (
    keyA.label !== null &&
    keyA.mode !== "unknown"
  ) {
    return {
      ...keyA
    };
  }

  return {
    ...keyB
  };
}

export function calculatePitchAdjustment(
  source: KeyAnalysis,
  target: KeyAnalysis
): PitchAdjustment {
  if (
    source.tonic === null ||
    target.tonic === null ||
    !Number.isFinite(source.tonic) ||
    !Number.isFinite(target.tonic)
  ) {
    return {
      semitones: 0,
      cents: 0
    };
  }

  const distance =
    shortestSemitoneDistance(
      source.tonic,
      target.tonic
    );

  return {
    semitones: distance,
    cents: 0
  };
}

function shortestSemitoneDistance(
  source: number,
  target: number
): number {
  const normalizedSource =
    normalizePitch(source);

  const normalizedTarget =
    normalizePitch(target);

  let distance =
    normalizedTarget -
    normalizedSource;

  if (distance > 6) {
    distance -= 12;
  }

  if (distance < -6) {
    distance += 12;
  }

  return distance;
}

function normalizePitch(
  value: number
): number {
  const normalized =
    value % 12;

  return normalized < 0
    ? normalized + 12
    : normalized;
}