import { describe, expect, it, vi } from "vitest";

import { AudioAnalysisService } from "../../src/analysis/analysis-service";
import type { AnalysisRepository } from "../../src/analysis/analysis-repository";
import type {
  AudioAnalysisResult,
  AudioAnalyzer
} from "../../src/analysis/types";
import type { LibraryTrack } from "../../src/library/types";

const track: LibraryTrack = {
  id: "track-1",
  relativePath: "House/Track.mp3",
  absolutePath:
    "/Volumes/Test/House/Track.mp3",
  fileName: "Track.mp3",
  extension: ".mp3",
  folderId: "folder-1",
  sizeBytes: 1000,
  modifiedTimeMs: 2000,
  status: "active"
};

const result: AudioAnalysisResult = {
  trackId: "track-1",
  analyzedAtMs: 3000,
  sourceSizeBytes: 1000,
  sourceModifiedTimeMs: 2000,
  status: "complete",
  durationSeconds: 180,
  format: {
    container: "FLAC",
    codec: "FLAC",
    codecProfile: null,
    bitrate: null,
    sampleRate: 44100,
    bitsPerSample: 24,
    numberOfChannels: 2,
    lossless: true
  },
  tags: {
    title: "Track",
    artists: ["Artist"],
    album: "Album",
    albumArtist: "Artist",
    genres: ["House"],
    year: 2026,
    trackNumber: 1,
    discNumber: 1,
    composer: [],
    comment: []
  },
  error: null
};

function createRepository(
  cached: AudioAnalysisResult | null
): AnalysisRepository {
  return {
    get: vi.fn(async () => cached),
    save: vi.fn(async () => undefined),
    saveMany: vi.fn(async () => undefined),
    list: vi.fn(async () => [])
  };
}

function createAnalyzer(): AudioAnalyzer {
  return {
    analyze: vi.fn(async () => result)
  };
}

describe("AudioAnalysisService", () => {
  it("reuses valid cached analysis", async () => {
    const repository =
      createRepository(result);
    const analyzer = createAnalyzer();

    const service =
      new AudioAnalysisService(
        analyzer,
        repository
      );

    const value =
      await service.analyzeTrack(track);

    expect(value).toEqual(result);
    expect(analyzer.analyze).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("re-analyzes a changed source file", async () => {
    const repository =
      createRepository(result);
    const analyzer = createAnalyzer();

    const service =
      new AudioAnalysisService(
        analyzer,
        repository
      );

    const changedTrack = {
      ...track,
      sizeBytes: 2000
    };

    await service.analyzeTrack(
      changedTrack
    );

    expect(analyzer.analyze).toHaveBeenCalledTimes(
      1
    );

    expect(repository.save).toHaveBeenCalledTimes(
      1
    );
  });

  it("re-analyzes when forced", async () => {
    const repository =
      createRepository(result);
    const analyzer = createAnalyzer();

    const service =
      new AudioAnalysisService(
        analyzer,
        repository
      );

    await service.analyzeTrack(
      track,
      true
    );

    expect(analyzer.analyze).toHaveBeenCalledTimes(
      1
    );
  });

  it("analyzes tracks sequentially", async () => {
    const repository =
      createRepository(null);
    const analyzer = createAnalyzer();

    const service =
      new AudioAnalysisService(
        analyzer,
        repository
      );

    const tracks = [
      track,
      {
        ...track,
        id: "track-2",
        relativePath: "House/Track-2.mp3"
      },
      {
        ...track,
        id: "track-3",
        relativePath: "House/Track-3.mp3"
      }
    ];

    const values =
      await service.analyzeTracks(
        tracks
      );

    expect(values).toHaveLength(3);
    expect(
      analyzer.analyze
    ).toHaveBeenCalledTimes(3);
  });
});