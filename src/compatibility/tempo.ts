import type { TempoAnalysis } from "../intelligence/types";
import type { TempoCompatibility } from "./types";

const MAX_REASONABLE_BPM = 300;
const MIN_REASONABLE_BPM = 40;

export function calculateTempoCompatibility(
  tempoA: TempoAnalysis,
  tempoB: TempoAnalysis
): TempoCompatibility {
  const bpmA = normalizeBpm(tempoA.bpm);
  const bpmB = normalizeBpm(tempoB.bpm);

  if (bpmA === null || bpmB === null) {
    return {
      score: 0,
      normalizedDifferenceBpm: null,
      effectiveBpmA: bpmA,
      effectiveBpmB: bpmB,
      ratio: null,
      compatible: false
    };
  }

  const relationship =
    findBestTempoRelationship(
      bpmA,
      bpmB
    );

  const score = scoreTempoDifference(
    relationship.difference,
    relationship.ratio
  );

  return {
    score,
    normalizedDifferenceBpm:
      relationship.difference,
    effectiveBpmA:
      relationship.effectiveBpmA,
    effectiveBpmB:
      relationship.effectiveBpmB,
    ratio: relationship.ratio,
    compatible: score >= 55
  };
}

export function calculateTempoCompatibilityFromTracks(
  tempoA: TempoAnalysis,
  tempoB: TempoAnalysis
): TempoCompatibility {
  return calculateTempoCompatibility(
    tempoA,
    tempoB
  );
}

interface TempoRelationship {
  effectiveBpmA: number;
  effectiveBpmB: number;
  difference: number;
  ratio: number;
}

function findBestTempoRelationship(
  bpmA: number,
  bpmB: number
): TempoRelationship {
  const directDifference = Math.abs(
    bpmA - bpmB
  );

  const directRatio =
    bpmA / bpmB;

  if (directDifference === 0) {
    return {
      effectiveBpmA: bpmA,
      effectiveBpmB: bpmB,
      difference: 0,
      ratio: directRatio
    };
  }

  const relationships: TempoRelationship[] = [
    createRelationship(
      bpmA,
      bpmB,
      bpmA,
      bpmB * 2
    ),

    createRelationship(
      bpmA,
      bpmB,
      bpmA,
      bpmB / 2
    ),

    createRelationship(
      bpmA,
      bpmB,
      bpmA * 2,
      bpmB
    ),

    createRelationship(
      bpmA,
      bpmB,
      bpmA / 2,
      bpmB
    )
  ].filter(
    (
      relationship
    ): relationship is TempoRelationship =>
      relationship !== null
  );

  relationships.push({
    effectiveBpmA: bpmA,
    effectiveBpmB: bpmB,
    difference: directDifference,
    ratio: directRatio
  });

  relationships.sort(
    (a, b) =>
      a.difference - b.difference
  );

  const best = relationships[0];

  if (best === undefined) {
    return {
      effectiveBpmA: bpmA,
      effectiveBpmB: bpmB,
      difference: directDifference,
      ratio: directRatio
    };
  }

  return best;
}

function createRelationship(
  originalA: number,
  originalB: number,
  effectiveA: number,
  effectiveB: number
): TempoRelationship | null {
  if (
    effectiveA < MIN_REASONABLE_BPM ||
    effectiveA > MAX_REASONABLE_BPM ||
    effectiveB < MIN_REASONABLE_BPM ||
    effectiveB > MAX_REASONABLE_BPM
  ) {
    return null;
  }

  const difference = Math.abs(
    effectiveA - effectiveB
  );

  return {
    effectiveBpmA: originalA,
    effectiveBpmB: normalizeToReferenceScale(
      originalA,
      originalB,
      effectiveB
    ),
    difference,
    ratio:
      effectiveA / effectiveB
  };
}

function normalizeToReferenceScale(
  referenceBpm: number,
  originalBpm: number,
  effectiveBpm: number
): number {
  if (
    Math.abs(
      referenceBpm - effectiveBpm
    ) < 0.000001
  ) {
    return referenceBpm;
  }

  if (
    Math.abs(
      referenceBpm - originalBpm
    ) < 0.000001
  ) {
    return originalBpm;
  }

  if (
    Math.abs(
      referenceBpm - originalBpm * 2
    ) < 0.000001
  ) {
    return originalBpm * 2;
  }

  if (
    Math.abs(
      referenceBpm - originalBpm / 2
    ) < 0.000001
  ) {
    return originalBpm / 2;
  }

  return effectiveBpm;
}

function scoreTempoDifference(
  difference: number,
  ratio: number
): number {
  if (difference === 0) {
    return 100;
  }

  const normalizedRatio = Math.max(
    ratio,
    1 / ratio
  );

  if (normalizedRatio <= 1.01) {
    return 100;
  }

  if (normalizedRatio <= 1.02) {
    return 95;
  }

  if (normalizedRatio <= 1.03) {
    return 88;
  }

  if (normalizedRatio <= 1.05) {
    return 75;
  }

  if (normalizedRatio <= 1.08) {
    return 55;
  }

  return 0;
}

function normalizeBpm(
  bpm: number | null
): number | null {
  if (
    bpm === null ||
    !Number.isFinite(bpm) ||
    bpm <= 0 ||
    bpm < MIN_REASONABLE_BPM ||
    bpm > MAX_REASONABLE_BPM
  ) {
    return null;
  }

  return bpm;
}