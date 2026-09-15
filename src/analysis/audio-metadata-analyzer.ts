import { parseFile } from "music-metadata";

import type { LibraryTrack } from "../library/types";
import type {
  AudioAnalysisResult,
  AudioAnalyzer,
  AudioFormatAnalysis,
  AudioTagAnalysis
} from "./types";

export class AudioMetadataAnalyzer implements AudioAnalyzer {
  async analyze(track: LibraryTrack): Promise<AudioAnalysisResult> {
    const analyzedAtMs = Date.now();

    try {
      const metadata = await parseFile(track.absolutePath, {
        duration: true,
        skipCovers: true
      });

      const format: AudioFormatAnalysis = {
        container: metadata.format.container ?? null,
        codec: metadata.format.codec ?? null,
        codecProfile: metadata.format.codecProfile ?? null,
        bitrate: metadata.format.bitrate ?? null,
        sampleRate: metadata.format.sampleRate ?? null,
        bitsPerSample: metadata.format.bitsPerSample ?? null,
        numberOfChannels: metadata.format.numberOfChannels ?? null,
        lossless: metadata.format.lossless ?? null
      };

      const tags: AudioTagAnalysis = {
        title: metadata.common.title ?? null,
        artists: normalizeStringArray(
          metadata.common.artist
        ),
        album: metadata.common.album ?? null,
        albumArtist:
          metadata.common.albumartist ?? null,
        genres: normalizeStringArray(
          metadata.common.genre
        ),
        year: metadata.common.year ?? null,
        trackNumber:
          metadata.common.track.no ?? null,
        discNumber:
          metadata.common.disk.no ?? null,
        composer: normalizeStringArray(
          metadata.common.composer
        ),
        comment: normalizeComments(
          metadata.common.comment
        )
      };

      return {
        trackId: track.id,
        analyzedAtMs,
        sourceSizeBytes: track.sizeBytes,
        sourceModifiedTimeMs:
          track.modifiedTimeMs,
        status: "complete",
        durationSeconds:
          normalizePositiveNumber(
            metadata.format.duration
          ),
        format,
        tags,
        error: null
      };
    } catch (error) {
      return {
        trackId: track.id,
        analyzedAtMs,
        sourceSizeBytes: track.sizeBytes,
        sourceModifiedTimeMs:
          track.modifiedTimeMs,
        status: "failed",
        durationSeconds: null,
        format: emptyFormat(),
        tags: emptyTags(),
        error: normalizeError(error)
      };
    }
  }
}

function normalizeStringArray(
  value: string | string[] | undefined
): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0
  );
}

function normalizeComments(
  value:
    | Array<{
        text?: string;
        language?: string;
      }>
    | undefined
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((comment) => comment.text)
    .filter(
      (text): text is string =>
        typeof text === "string" &&
        text.trim().length > 0
    );
}

function normalizePositiveNumber(
  value: number | undefined
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function emptyFormat(): AudioFormatAnalysis {
  return {
    container: null,
    codec: null,
    codecProfile: null,
    bitrate: null,
    sampleRate: null,
    bitsPerSample: null,
    numberOfChannels: null,
    lossless: null
  };
}

function emptyTags(): AudioTagAnalysis {
  return {
    title: null,
    artists: [],
    album: null,
    albumArtist: null,
    genres: [],
    year: null,
    trackNumber: null,
    discNumber: null,
    composer: [],
    comment: []
  };
}

function normalizeError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return String(error);
}