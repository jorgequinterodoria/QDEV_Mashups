import type {
  MusicIntelligenceResult
} from "../intelligence/types";

import type {
  DJBeatGrid,
  DJCuePoint,
  DJLoop
} from "./types";

const DEFAULT_MAX_CUES =
  16;

const DEFAULT_MAX_LOOPS =
  8;

const DEFAULT_PHRASE_BEATS =
  32;

const DEFAULT_MIN_CUE_SPACING =
  2;

const DEFAULT_LOOP_BEATS =
  [8, 16, 32];

export function createCuePoints(
  track: MusicIntelligenceResult,
  beatGrid: DJBeatGrid,
  options: {
    maxCuePoints?: number;
    phraseBeats?: number;
    minimumCueSpacingSeconds?: number;
  } = {}
): DJCuePoint[] {
  const maxCuePoints =
    options.maxCuePoints ??
    DEFAULT_MAX_CUES;

  const phraseBeats =
    options.phraseBeats ??
    DEFAULT_PHRASE_BEATS;

  const minimumSpacing =
    options.minimumCueSpacingSeconds ??
    DEFAULT_MIN_CUE_SPACING;

  const candidates =
    buildCueCandidates(
      track,
      beatGrid,
      phraseBeats
    );

  const selected: DJCuePoint[] = [];

  for (
    const candidate of candidates
  ) {
    if (
      selected.length >=
      Math.min(
        maxCuePoints,
        DEFAULT_MAX_CUES
      )
    ) {
      break;
    }

    const tooClose =
      selected.some(
        (existing) =>
          Math.abs(
            existing.timeSeconds -
              candidate.timeSeconds
          ) <
          minimumSpacing
      );

    if (!tooClose) {
      selected.push(
        candidate
      );
    }
  }

  return selected
    .map(
      (
        cue,
        index
      ) => ({
        ...cue,
        id: index + 1
      })
    );
}

export function createLoopPoints(
  track: MusicIntelligenceResult,
  beatGrid: DJBeatGrid,
  options: {
    maxLoops?: number;
    loopBeats?: number[];
  } = {}
): DJLoop[] {
  const maxLoops =
    options.maxLoops ??
    DEFAULT_MAX_LOOPS;

  const requestedBeats =
    options.loopBeats ??
    DEFAULT_LOOP_BEATS;

  const duration =
    track.durationSeconds;

  if (
    duration === null ||
    duration <= 0
  ) {
    return [];
  }

  const loops: DJLoop[] = [];

  const safeBeatCounts =
    requestedBeats
      .filter(
        (beats) =>
          Number.isInteger(beats) &&
          beats > 0 &&
          beats <= 32
      )
      .slice(
        0,
        DEFAULT_MAX_LOOPS
      );

  for (
    const beats of safeBeatCounts
  ) {
    if (
      loops.length >=
      maxLoops
    ) {
      break;
    }

    const endBeat =
      findBeatAtOrBefore(
        beatGrid.beatTimes,
        Math.max(
          0,
          duration -
            (
              beats *
              beatGrid.beatIntervalSeconds
            )
        )
      );

    const endTime =
      beatGrid.beatTimes[
        endBeat
      ];

    if (
      endTime === undefined
    ) {
      continue;
    }

    const startTime =
      endTime -
      beats *
      beatGrid.beatIntervalSeconds;

    if (
      startTime < 0
    ) {
      continue;
    }

    loops.push({
      id:
        loops.length + 1,

      label:
        `${beats}-beat outro loop`,

      startSeconds:
        roundTime(
          startTime
        ),

      endSeconds:
        roundTime(
          endTime
        ),

      beats,

      estimated: true
    });
  }

  return loops;
}

function buildCueCandidates(
  track: MusicIntelligenceResult,
  beatGrid: DJBeatGrid,
  phraseBeats: number
): DJCuePoint[] {
  const candidates: DJCuePoint[] = [];

  const firstBeat =
    beatGrid.beatTimes[0] ??
    beatGrid.firstBeatSeconds;

  candidates.push({
    id: 0,
    type: "start",
    label: "Start",
    timeSeconds:
      roundTime(
        firstBeat
      ),
    beatNumber: 1,
    color: "green",
    estimated:
      beatGrid.estimated
  });

  const duration =
    track.durationSeconds;

  if (
    duration !== null &&
    duration > 0
  ) {
    const mixIn =
      Math.max(
        firstBeat,
        firstBeat +
          phraseBeats *
          beatGrid.beatIntervalSeconds
      );

    candidates.push({
      id: 0,
      type: "mix-in",
      label: "Mix In",
      timeSeconds:
        roundTime(
          Math.min(
            mixIn,
            duration
          )
        ),
      beatNumber:
        phraseBeats + 1,
      color: "blue",
      estimated: true
    });
  }

  if (
    track.vocalProfile ===
    "likely-vocal"
  ) {
    const vocalEntry =
      detectVocalEntry(
        track,
        beatGrid
      );

    if (
      vocalEntry !== null
    ) {
      candidates.push({
        id: 0,
        type: "vocal-entry",
        label: "Vocal Entry",
        timeSeconds:
          roundTime(
            vocalEntry.timeSeconds
          ),
        beatNumber:
          vocalEntry.beatNumber,
        color: "purple",
        estimated:
          vocalEntry.estimated
      });
    }
  }

  const phraseCues =
    createPhraseCues(
      beatGrid,
      duration,
      phraseBeats
    );

  candidates.push(
    ...phraseCues
  );

  if (
    duration !== null &&
    duration > 0
  ) {
    const mixOut =
      Math.max(
        0,
        duration -
          phraseBeats *
            beatGrid.beatIntervalSeconds
      );

    candidates.push({
      id: 0,
      type: "mix-out",
      label: "Mix Out",
      timeSeconds:
        roundTime(
          mixOut
        ),
      beatNumber:
        estimateBeatNumber(
          beatGrid,
          mixOut
        ),
      color: "orange",
      estimated: true
    });

    candidates.push({
      id: 0,
      type: "outro",
      label: "Outro",
      timeSeconds:
        roundTime(
          Math.max(
            firstBeat,
            duration -
              phraseBeats *
                2 *
                beatGrid.beatIntervalSeconds
          )
        ),
      beatNumber:
        estimateBeatNumber(
          beatGrid,
          Math.max(
            firstBeat,
            duration -
              phraseBeats *
                2 *
                beatGrid.beatIntervalSeconds
          )
        ),
      color: "red",
      estimated: true
    });
  }

  return candidates.sort(
    (a, b) =>
      a.timeSeconds -
      b.timeSeconds
  );
}

function createPhraseCues(
  beatGrid: DJBeatGrid,
  duration:
    | number
    | null,
  phraseBeats: number
): DJCuePoint[] {
  const result: DJCuePoint[] = [];

  const step =
    Math.max(
      1,
      phraseBeats
    );

  for (
    let beatIndex = 0;
    beatIndex <
    beatGrid.beatTimes.length;
    beatIndex += step
  ) {
    const time =
      beatGrid.beatTimes[
        beatIndex
      ];

    if (
      duration !== null &&
      time > duration
    ) {
      break;
    }

    if (
      beatIndex === 0
    ) {
      continue;
    }

    result.push({
      id: 0,
      type: "phrase",
      label:
        `Phrase ${Math.floor(
          beatIndex / step
        ) + 1}`,
      timeSeconds:
        roundTime(
          time
        ),
      beatNumber:
        beatIndex + 1,
      color: "yellow",
      estimated:
        beatGrid.estimated
    });
  }

  return result;
}

function detectVocalEntry(
  track: MusicIntelligenceResult,
  beatGrid: DJBeatGrid
): {
  timeSeconds: number;
  beatNumber: number;
  estimated: boolean;
} | null {
  if (
    track.tempo.onsetTimes.length === 0
  ) {
    if (
      beatGrid.beatTimes.length < 9
    ) {
      return null;
    }

    return {
      timeSeconds:
        beatGrid.beatTimes[8],
      beatNumber: 9,
      estimated: true
    };
  }

  const onset =
    track.tempo.onsetTimes.find(
      (time) =>
        time >=
        beatGrid.firstBeatSeconds +
          4 *
            beatGrid.beatIntervalSeconds
    );

  if (
    onset === undefined
  ) {
    return null;
  }

  const beatNumber =
    findClosestBeatNumber(
      beatGrid.beatTimes,
      onset
    );

  return {
    timeSeconds:
      beatGrid.beatTimes[
        beatNumber - 1
      ] ?? onset,
    beatNumber,
    estimated:
      !track.tempo.onsetTimes.includes(
        beatGrid.beatTimes[
          beatNumber - 1
        ]
      )
  };
}

function findClosestBeatNumber(
  beatTimes: number[],
  time: number
): number {
  if (
    beatTimes.length === 0
  ) {
    return 1;
  }

  let bestIndex = 0;
  let bestDistance =
    Math.abs(
      beatTimes[0] -
        time
    );

  for (
    let index = 1;
    index <
      beatTimes.length;
    index += 1
  ) {
    const distance =
      Math.abs(
        beatTimes[index] -
          time
      );

    if (
      distance <
      bestDistance
    ) {
      bestDistance =
        distance;
      bestIndex =
        index;
    }
  }

  return bestIndex + 1;
}

function findBeatAtOrBefore(
  beatTimes: number[],
  time: number
): number {
  let result = 0;

  for (
    let index = 0;
    index <
      beatTimes.length;
    index += 1
  ) {
    if (
      beatTimes[index] <=
      time
    ) {
      result = index;
      continue;
    }

    break;
  }

  return result;
}

function estimateBeatNumber(
  beatGrid: DJBeatGrid,
  time: number
): number | null {
  if (
    beatGrid.beatTimes.length === 0
  ) {
    return null;
  }

  return findClosestBeatNumber(
    beatGrid.beatTimes,
    time
  );
}

function roundTime(
  value: number
): number {
  return Math.round(
    value * 1000
  ) / 1000;
}