import {
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { LibraryTrack } from "../../src/library/types";

vi.mock("music-metadata", () => ({
  parseFile: vi.fn()
}));

import { parseFile } from "music-metadata";
import { AudioMetadataAnalyzer } from "../../src/analysis/audio-metadata-analyzer";

const mockedParseFile = vi.mocked(parseFile);

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const directory = await mkdtemp(
    join(
      tmpdir(),
      "mashup-assistant-analysis-"
    )
  );

  temporaryDirectories.push(directory);

  return directory;
}

afterEach(async () => {
  mockedParseFile.mockReset();

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

function createTrack(
  absolutePath: string
): LibraryTrack {
  return {
    id: "track-test",
    relativePath: "House/Test.mp3",
    absolutePath,
    fileName: "Test.mp3",
    extension: ".mp3",
    folderId: "folder-test",
    sizeBytes: 123,
    modifiedTimeMs: 456,
    status: "active"
  };
}

describe("AudioMetadataAnalyzer", () => {
  it("returns a failed analysis instead of throwing when the metadata provider fails", async () => {
    const directory = await createFixture();
    const filePath = join(
      directory,
      "invalid.mp3"
    );

    await writeFile(
      filePath,
      "test audio fixture"
    );

    mockedParseFile.mockRejectedValueOnce(
      new Error(
        "Unable to parse audio file."
      )
    );

    const analyzer =
      new AudioMetadataAnalyzer();

    const result = await analyzer.analyze(
      createTrack(filePath)
    );

    expect(result.trackId).toBe(
      "track-test"
    );

    expect(result.status).toBe(
      "failed"
    );

    expect(result.error).toBe(
      "Unable to parse audio file."
    );

    expect(
      result.durationSeconds
    ).toBeNull();

    expect(result.tags.title).toBeNull();

    expect(mockedParseFile).toHaveBeenCalledTimes(
      1
    );
  });

  it("keeps the source identity in the analysis result", async () => {
    const directory = await createFixture();
    const filePath = join(
      directory,
      "invalid.mp3"
    );

    await writeFile(
      filePath,
      "invalid"
    );

    mockedParseFile.mockRejectedValueOnce(
      new Error("Invalid audio")
    );

    const track = createTrack(filePath);
    const analyzer =
      new AudioMetadataAnalyzer();

    const result =
      await analyzer.analyze(track);

    expect(
      result.sourceSizeBytes
    ).toBe(track.sizeBytes);

    expect(
      result.sourceModifiedTimeMs
    ).toBe(track.modifiedTimeMs);
  });
});