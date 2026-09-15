import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { JsonAnalysisRepository } from "../../src/analysis/analysis-repository";
import type { AudioAnalysisResult } from "../../src/analysis/types";

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const directory = await mkdtemp(
    join(
      tmpdir(),
      "mashup-assistant-analysis-db-"
    )
  );

  temporaryDirectories.push(directory);

  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(
      (directory) =>
        rm(directory, {
          recursive: true,
          force: true
        })
    )
  );
});

const result: AudioAnalysisResult = {
  trackId: "track-1",
  analyzedAtMs: 1000,
  sourceSizeBytes: 2000,
  sourceModifiedTimeMs: 3000,
  status: "complete",
  durationSeconds: 240,
  format: {
    container: "MPEG",
    codec: "MPEG 1 Layer 3",
    codecProfile: null,
    bitrate: 320000,
    sampleRate: 44100,
    bitsPerSample: null,
    numberOfChannels: 2,
    lossless: false
  },
  tags: {
    title: "Test Track",
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

describe("JsonAnalysisRepository", () => {
  it("returns null for an unknown track", async () => {
    const directory = await createFixture();

    const repository =
      new JsonAnalysisRepository(
        join(directory, "analysis.json")
      );

    await expect(
      repository.get("unknown")
    ).resolves.toBeNull();
  });

  it("persists and retrieves an analysis", async () => {
    const directory = await createFixture();

    const repository =
      new JsonAnalysisRepository(
        join(directory, "analysis.json")
      );

    await repository.save(result);

    await expect(
      repository.get("track-1")
    ).resolves.toEqual(result);
  });

  it("persists multiple analyses", async () => {
    const directory = await createFixture();

    const repository =
      new JsonAnalysisRepository(
        join(directory, "analysis.json")
      );

    const second = {
      ...result,
      trackId: "track-2"
    };

    await repository.saveMany([
      result,
      second
    ]);

    const values = await repository.list();

    expect(values).toHaveLength(2);
    expect(
      values.map((item) => item.trackId)
    ).toEqual([
      "track-1",
      "track-2"
    ]);
  });

  it("creates parent directories automatically", async () => {
    const directory = await createFixture();

    const repository =
      new JsonAnalysisRepository(
        join(
          directory,
          "nested",
          "analysis.json"
        )
      );

    await repository.save(result);

    await expect(
      repository.get("track-1")
    ).resolves.toEqual(result);
  });
});