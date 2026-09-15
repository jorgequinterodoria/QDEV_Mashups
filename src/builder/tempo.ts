export interface TempoAdjustment {
  originalBpm: number | null;
  targetBpm: number | null;
  ratio: number | null;
  percentChange: number | null;
}

export function calculateTempoAdjustment(
  originalBpm: number | null,
  targetBpm: number | null
): TempoAdjustment {
  if (
    originalBpm === null ||
    targetBpm === null ||
    !Number.isFinite(originalBpm) ||
    !Number.isFinite(targetBpm) ||
    originalBpm <= 0 ||
    targetBpm <= 0
  ) {
    return {
      originalBpm,
      targetBpm,
      ratio: null,
      percentChange: null
    };
  }

  const ratio =
    targetBpm / originalBpm;

  return {
    originalBpm,
    targetBpm,
    ratio,
    percentChange:
      (ratio - 1) * 100
  };
}

export function chooseTargetBpm(
  bpmA: number | null,
  bpmB: number | null
): number | null {
  if (
    bpmA === null ||
    bpmB === null
  ) {
    return bpmA ?? bpmB;
  }

  if (
    !Number.isFinite(bpmA) ||
    !Number.isFinite(bpmB) ||
    bpmA <= 0 ||
    bpmB <= 0
  ) {
    return null;
  }

  const candidates = [
    bpmA,
    bpmB,
    bpmA / 2,
    bpmB / 2,
    bpmA * 2,
    bpmB * 2
  ].filter(
    (value) =>
      value >= 40 &&
      value <= 200
  );

  const target =
    candidates.reduce(
      (best, current) => {
        const currentDistance =
          Math.abs(
            current -
              ((bpmA + bpmB) / 2)
          );

        const bestDistance =
          Math.abs(
            best -
              ((bpmA + bpmB) / 2)
          );

        return currentDistance <
          bestDistance
          ? current
          : best;
      }
    );

  return target;
}