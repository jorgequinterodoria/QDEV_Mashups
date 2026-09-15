import audio from "audio";

import type {
  ChordAnalysis,
  KeyAnalysis,
  MusicIntelligenceAnalysisOptions,
  MusicIntelligenceEngine,
  MusicIntelligenceEngineResult,
  TempoAnalysis
} from "./types";

const DEFAULT_MAX_ANALYSIS_SECONDS =
  60;

export class AudioMusicIntelligenceEngine
  implements MusicIntelligenceEngine
{
  async analyze(
    absolutePath: string,
    options: MusicIntelligenceAnalysisOptions = {}
  ): Promise<MusicIntelligenceEngineResult> {
    const source =
      audio(
        absolutePath
      );

    await source;

    const analysisRange =
      createAnalysisRange(
        source.duration,
        options
      );

    const [
      loudness,
      rms,
      centroid
    ] = await source.stat(
      [
        "loudness",
        "rms",
        "centroid"
      ],
      analysisRange
    );

    const bpm =
      await source.stat(
        "bpm",
        analysisRange
      );

    const beats =
      await source.stat(
        "beats",
        analysisRange
      );

    const onsets =
      await source.stat(
        "onsets",
        analysisRange
      );

    const key =
      await source.stat(
        "key",
        analysisRange
      );

    const chords =
      await source.stat(
        "chords",
        analysisRange
      );

    return {
      durationSeconds:
        normalizePositiveNumber(
          source.duration
        ),

      tempo:
        normalizeTempo(
          bpm,
          beats,
          onsets
        ),

      key:
        normalizeKey(
          key
        ),

      chords:
        normalizeChords(
          chords
        ),

      spectral: {
        rms:
          normalizeFiniteNumber(
            rms
          ),

        loudnessLufs:
          normalizeFiniteNumber(
            loudness
          ),

        spectralCentroidHz:
          normalizeFiniteNumber(
            centroid
          ),

        spectralFlatness:
          null,

        spectralRolloffHz:
          null,

        zeroCrossingRate:
          null
      }
    };
  }
}

interface AnalysisRange {
  at: number;
  duration: number;
}

function createAnalysisRange(
  sourceDuration: number,
  options: MusicIntelligenceAnalysisOptions
): AnalysisRange {
  const requestedStart =
    options.startSeconds ??
    0;

  const safeStart =
    Number.isFinite(
      requestedStart
    ) &&
    requestedStart >= 0
      ? requestedStart
      : 0;

  const requestedDuration =
    options.maxAnalysisSeconds ??
    DEFAULT_MAX_ANALYSIS_SECONDS;

  const safeDuration =
    Number.isFinite(
      requestedDuration
    ) &&
    requestedDuration > 0
      ? requestedDuration
      : DEFAULT_MAX_ANALYSIS_SECONDS;

  if (
    !Number.isFinite(
      sourceDuration
    ) ||
    sourceDuration <= 0
  ) {
    return {
      at: safeStart,
      duration: safeDuration
    };
  }

  if (
    safeStart >=
    sourceDuration
  ) {
    return {
      at: Math.max(
        0,
        sourceDuration - 0.1
      ),
      duration: 0.1
    };
  }

  return {
    at: safeStart,
    duration:
      Math.min(
        safeDuration,
        sourceDuration -
          safeStart
      )
  };
}

function normalizeTempo(
  value: unknown,
  beats: unknown,
  onsets: unknown
): TempoAnalysis {
  const bpm =
    extractBpm(
      value
    );

  return {
    bpm,

    confidence:
      null,

    halfTimeBpm:
      bpm === null
        ? null
        : bpm / 2,

    doubleTimeBpm:
      bpm === null
        ? null
        : bpm * 2,

    beatTimes:
      normalizeNumberArray(
        beats
      ),

    onsetTimes:
      normalizeNumberArray(
        onsets
      )
  };
}

function extractBpm(
  value: unknown
): number | null {
  if (
    typeof value ===
    "number"
  ) {
    return normalizePositiveNumber(
      value
    );
  }

  if (
    typeof value ===
      "object" &&
    value !== null &&
    "bpm" in value
  ) {
    const bpm =
      (
        value as {
          bpm?: unknown;
        }
      ).bpm;

    return typeof bpm ===
      "number"
      ? normalizePositiveNumber(
          bpm
        )
      : null;
  }

  return null;
}

function normalizeKey(
  value: unknown
): KeyAnalysis {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return {
      label: null,
      tonic: null,
      mode: "unknown",
      confidence: null
    };
  }

  const candidate =
    value as {
      label?: unknown;
      tonic?: unknown;
      mode?: unknown;
      confidence?: unknown;
    };

  const mode =
    candidate.mode ===
      "major" ||
    candidate.mode ===
      "minor"
      ? candidate.mode
      : "unknown";

  return {
    label:
      typeof candidate.label ===
      "string"
        ? candidate.label
        : null,

    tonic:
      typeof candidate.tonic ===
        "number" &&
      Number.isFinite(
        candidate.tonic
      )
        ? candidate.tonic
        : null,

    mode,

    confidence:
      typeof candidate.confidence ===
        "number" &&
      Number.isFinite(
        candidate.confidence
      )
        ? candidate.confidence
        : null
  };
}

function normalizeChords(
  value: unknown
): ChordAnalysis[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ): ChordAnalysis | null => {
        if (
          typeof item !==
            "object" ||
          item === null
        ) {
          return null;
        }

        const chord =
          item as {
            time?: unknown;
            duration?: unknown;
            label?: unknown;
            confidence?: unknown;
          };

        if (
          typeof chord.time !==
            "number" ||
          typeof chord.duration !==
            "number" ||
          typeof chord.label !==
            "string"
        ) {
          return null;
        }

        return {
          startTimeSeconds:
            chord.time,

          durationSeconds:
            chord.duration,

          label:
            chord.label,

          confidence:
            typeof chord.confidence ===
              "number" &&
            Number.isFinite(
              chord.confidence
            )
              ? chord.confidence
              : null
        };
      }
    )
    .filter(
      (
        item
      ): item is ChordAnalysis =>
        item !== null
    );
}

function normalizeNumberArray(
  value: unknown
): number[] {
  if (
    !Array.isArray(value) &&
    !ArrayBuffer.isView(
      value
    )
  ) {
    return [];
  }

  return Array.from(
    value as ArrayLike<unknown>
  ).filter(
    (
      item
    ): item is number =>
      typeof item ===
        "number" &&
      Number.isFinite(
        item
      )
  );
}

function normalizePositiveNumber(
  value: unknown
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function normalizeFiniteNumber(
  value: unknown
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  return value;
}