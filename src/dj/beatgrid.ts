import type {
  MusicIntelligenceResult
} from "../intelligence/types";

import type {
  DJBeatGrid
} from "./types";

const MIN_BPM =
  40;

const MAX_BPM =
  240;

const MAX_GRID_BEATS =
  20000;

export function createBeatGrid(
  track: MusicIntelligenceResult
): DJBeatGrid | null {
  const bpm =
    normalizeBpm(
      track.tempo.bpm
    );

  if (bpm === null) {
    return null;
  }

  const detectedBeats =
    normalizeBeatTimes(
      track.tempo.beatTimes,
      track.durationSeconds
    );

  if (
    detectedBeats.length >= 2
  ) {
    const firstBeat =
      detectedBeats[0];

    const interval =
      estimateBeatInterval(
        detectedBeats,
        bpm
      );

    const confidence =
      calculateDetectedConfidence(
        detectedBeats,
        bpm
      );

    return {
      bpm,
      firstBeatSeconds:
        firstBeat,
      beatIntervalSeconds:
        interval,
      phaseOffsetSeconds:
        normalizePhaseOffset(
          firstBeat,
          interval
        ),
      beatTimes:
        limitBeatTimes(
          detectedBeats
        ),
      confidence,
      estimated: false
    };
  }

  const firstBeat =
    determineFirstBeat(
      track.tempo.onsetTimes,
      track.durationSeconds
    );

  const interval =
    60 / bpm;

  const generated =
    generateBeatTimes(
      firstBeat,
      interval,
      track.durationSeconds
    );

  return {
    bpm,
    firstBeatSeconds:
      firstBeat,
    beatIntervalSeconds:
      interval,
    phaseOffsetSeconds:
      normalizePhaseOffset(
        firstBeat,
        interval
      ),
    beatTimes:
      generated,
    confidence: 0.45,
    estimated: true
  };
}

function normalizeBpm(
  value: number | null
): number | null {
  if (
    value === null ||
    !Number.isFinite(value) ||
    value < MIN_BPM ||
    value > MAX_BPM
  ) {
    return null;
  }

  return value;
}

function normalizeBeatTimes(
  values: number[],
  durationSeconds:
    | number
    | null
): number[] {
  return values
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value >= 0 &&
        (
          durationSeconds === null ||
          value <=
            durationSeconds
        )
    )
    .sort(
      (a, b) => a - b
    )
    .filter(
      (value, index, items) =>
        index === 0 ||
        Math.abs(
          value -
            items[index - 1]
        ) > 0.001
    );
}

function estimateBeatInterval(
  beatTimes: number[],
  bpm: number
): number {
  if (
    beatTimes.length < 2
  ) {
    return 60 / bpm;
  }

  const intervals: number[] = [];

  for (
    let index = 1;
    index < beatTimes.length;
    index += 1
  ) {
    const interval =
      beatTimes[index] -
      beatTimes[index - 1];

    if (
      interval > 0 &&
      Number.isFinite(interval)
    ) {
      intervals.push(
        interval
      );
    }
  }

  if (
    intervals.length === 0
  ) {
    return 60 / bpm;
  }

  intervals.sort(
    (a, b) => a - b
  );

  const middle =
    Math.floor(
      intervals.length / 2
    );

  const median =
    intervals.length % 2 === 0
      ? (
        intervals[middle - 1] +
        intervals[middle]
      ) / 2
      : intervals[middle];

  return (
    median > 0
      ? median
      : 60 / bpm
  );
}

function calculateDetectedConfidence(
  beatTimes: number[],
  bpm: number
): number {
  const expected =
    60 / bpm;

  const comparisons: number[] = [];

  for (
    let index = 1;
    index < beatTimes.length;
    index += 1
  ) {
    const interval =
      beatTimes[index] -
      beatTimes[index - 1];

    if (
      interval <= 0
    ) {
      continue;
    }

    const error =
      Math.abs(
        interval -
          expected
      ) / expected;

    comparisons.push(
      Math.max(
        0,
        1 - error
      )
    );
  }

  if (
    comparisons.length === 0
  ) {
    return 0.5;
  }

  const average =
    comparisons.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    comparisons.length;

  return clamp(
    average,
    0,
    1
  );
}

function determineFirstBeat(
  onsets: number[],
  durationSeconds:
    | number
    | null
): number {
  const candidate =
    onsets.find(
      (value) =>
        Number.isFinite(value) &&
        value >= 0 &&
        (
          durationSeconds === null ||
          value <= durationSeconds
        )
    );

  return candidate ?? 0;
}

function generateBeatTimes(
  firstBeat: number,
  interval: number,
  durationSeconds:
    | number
    | null
): number[] {
  const limit =
    durationSeconds === null
      ? MAX_GRID_BEATS
      : Math.min(
        MAX_GRID_BEATS,
        Math.ceil(
          (
            durationSeconds -
            firstBeat
          ) /
          interval
        ) + 1
      );

  const result: number[] = [];

  for (
    let index = 0;
    index < limit;
    index += 1
  ) {
    const time =
      firstBeat +
      index * interval;

    if (
      durationSeconds !== null &&
      time > durationSeconds
    ) {
      break;
    }

    result.push(
      time
    );
  }

  return result;
}

function limitBeatTimes(
  beatTimes: number[]
): number[] {
  if (
    beatTimes.length <=
    MAX_GRID_BEATS
  ) {
    return beatTimes;
  }

  return beatTimes.slice(
    0,
    MAX_GRID_BEATS
  );
}

function normalizePhaseOffset(
  firstBeat: number,
  interval: number
): number {
  if (
    interval <= 0
  ) {
    return 0;
  }

  let offset =
    firstBeat %
    interval;

  if (
    offset < 0
  ) {
    offset += interval;
  }

  return offset;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
}