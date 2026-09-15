import type {
  KeyAnalysis
} from "../intelligence/types";

import type {
  HarmonicCompatibility
} from "./types";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B"
] as const;

const CAMELOT_MAJOR: Record<
  number,
  string
> = {
  0: "8B",
  1: "3B",
  2: "10B",
  3: "5B",
  4: "12B",
  5: "7B",
  6: "2B",
  7: "9B",
  8: "4B",
  9: "11B",
  10: "6B",
  11: "1B"
};

const CAMELOT_MINOR: Record<
  number,
  string
> = {
  0: "5A",
  1: "12A",
  2: "7A",
  3: "2A",
  4: "9A",
  5: "4A",
  6: "11A",
  7: "6A",
  8: "1A",
  9: "8A",
  10: "3A",
  11: "10A"
};

export function calculateHarmonicCompatibility(
  keyA: KeyAnalysis,
  keyB: KeyAnalysis
): HarmonicCompatibility {
  const tonicA = normalizeTonic(keyA);
  const tonicB = normalizeTonic(keyB);

  if (
    tonicA === null ||
    tonicB === null ||
    keyA.mode === "unknown" ||
    keyB.mode === "unknown"
  ) {
    return {
      score: 0,
      keyA: keyA.label,
      keyB: keyB.label,
      camelotA: toCamelot(keyA),
      camelotB: toCamelot(keyB),
      semitoneDistance: null,
      compatible: false
    };
  }

  const camelotA = toCamelot(keyA);
  const camelotB = toCamelot(keyB);

  const semitoneDistance =
    circularDistance(
      tonicA,
      tonicB
    );

  const sameKey =
    tonicA === tonicB &&
    keyA.mode === keyB.mode;

  const relativeKey =
    isRelativeKey(
      tonicA,
      keyA.mode,
      tonicB,
      keyB.mode
    );

  const compatibleCamelot =
    areCamelotNeighbors(
      camelotA,
      camelotB
    );

  let score = 0;

  if (sameKey) {
    score = 100;
  } else if (compatibleCamelot) {
    score = 92;
  } else if (relativeKey) {
    score = 88;
  } else if (semitoneDistance === 1) {
    score = 70;
  } else if (semitoneDistance === 2) {
    score = 45;
  } else if (semitoneDistance === 3) {
    score = 25;
  } else {
    score = 0;
  }

  return {
    score,
    keyA: keyA.label,
    keyB: keyB.label,
    camelotA,
    camelotB,
    semitoneDistance,
    compatible: score >= 70
  };
}

export function keyToCamelot(
  key: KeyAnalysis
): string | null {
  return toCamelot(key);
}

export function parseKeyLabel(
  label: string | null
): {
  tonic: number;
  mode: "major" | "minor";
} | null {
  if (!label) {
    return null;
  }

  const normalized = label
    .trim()
    .replace("♯", "#")
    .replace("♭", "b");

  const minor =
    normalized.endsWith("m") ||
    normalized.endsWith("min") ||
    normalized.endsWith("minor");

  const tonicLabel = minor
    ? normalized
        .replace(/minor$/i, "")
        .replace(/min$/i, "")
        .replace(/m$/i, "")
    : normalized
        .replace(/major$/i, "")
        .replace(/maj$/i, "");

  const tonic = parsePitchClass(
    tonicLabel
  );

  if (tonic === null) {
    return null;
  }

  return {
    tonic,
    mode: minor ? "minor" : "major"
  };
}

function toCamelot(
  key: KeyAnalysis
): string | null {
  const tonic = normalizeTonic(key);

  if (
    tonic === null ||
    key.mode === "unknown"
  ) {
    return null;
  }

  return key.mode === "major"
    ? CAMELOT_MAJOR[tonic]
    : CAMELOT_MINOR[tonic];
}

function normalizeTonic(
  key: KeyAnalysis
): number | null {
  if (
    typeof key.tonic === "number" &&
    Number.isFinite(key.tonic)
  ) {
    return normalizePitchClass(
      key.tonic
    );
  }

  const parsed = parseKeyLabel(
    key.label
  );

  return parsed?.tonic ?? null;
}

function parsePitchClass(
  value: string
): number | null {
  const normalized =
    value
      .trim()
      .replace("♯", "#")
      .replace("♭", "b");

  const index =
    NOTE_NAMES.indexOf(
      normalized as
        (typeof NOTE_NAMES)[number]
    );

  if (index >= 0) {
    return index;
  }

  const flatMap: Record<
    string,
    number
  > = {
    Db: 1,
    Eb: 3,
    Gb: 6,
    Ab: 8,
    Bb: 10
  };

  return flatMap[normalized] ?? null;
}

function normalizePitchClass(
  tonic: number
): number {
  const value = tonic % 12;

  return value < 0
    ? value + 12
    : value;
}

function circularDistance(
  a: number,
  b: number
): number {
  const distance = Math.abs(a - b);

  return Math.min(
    distance,
    12 - distance
  );
}

function isRelativeKey(
  tonicA: number,
  modeA: KeyAnalysis["mode"],
  tonicB: number,
  modeB: KeyAnalysis["mode"]
): boolean {
  if (
    modeA === "unknown" ||
    modeB === "unknown"
  ) {
    return false;
  }

  if (modeA === modeB) {
    return false;
  }

  if (modeA === "major") {
    return tonicA ===
      normalizePitchClass(
        tonicB + 3
      );
  }

  return tonicB ===
    normalizePitchClass(
      tonicA + 3
    );
}

function areCamelotNeighbors(
  a: string | null,
  b: string | null
): boolean {
  if (!a || !b) {
    return false;
  }

  const numberA = Number(
    a.slice(0, -1)
  );

  const numberB = Number(
    b.slice(0, -1)
  );

  const letterA = a.at(-1);
  const letterB = b.at(-1);

  if (
    !Number.isFinite(numberA) ||
    !Number.isFinite(numberB) ||
    !letterA ||
    !letterB
  ) {
    return false;
  }

  if (letterA === letterB) {
    const distance = Math.abs(
      numberA - numberB
    );

    return (
      distance === 1 ||
      distance === 11
    );
  }

  return (
    numberA === numberB
  );
}