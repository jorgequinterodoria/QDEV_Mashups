import {
  mkdtemp,
  mkdir,
  rm,
  utimes,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { LibraryScanner } from "../../src/library/scanner";

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "mashup-assistant-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function createFile(
  filePath: string,
  content = "audio"
): Promise<void> {
  await mkdir(join(filePath, ".."), {
    recursive: true
  }).catch(() => undefined);

  await writeFile(filePath, content);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("LibraryScanner", () => {
  it("scans audio files recursively", async () => {
    const root = await createFixture();

    await mkdir(join(root, "House", "Deep"), {
      recursive: true
    });

    await createFile(join(root, "House", "Track A.mp3"));
    await createFile(
      join(root, "House", "Deep", "Track B.flac")
    );
    await createFile(join(root, "cover.jpg"));

    const scanner = new LibraryScanner();
    const result = await scanner.scan(root);

    expect(result.snapshot.tracks).toHaveLength(2);
    expect(result.snapshot.folders).toHaveLength(3);

    expect(
      result.snapshot.tracks.map((track) => track.relativePath)
    ).toEqual([
      "House/Deep/Track B.flac",
      "House/Track A.mp3"
    ]);
  });

  it("detects a new track on a second scan", async () => {
    const root = await createFixture();

    await createFile(join(root, "Track A.mp3"));

    const scanner = new LibraryScanner();
    const first = await scanner.scan(root);

    await createFile(join(root, "Track B.mp3"));

    const second = await scanner.scan(
      root,
      first.snapshot
    );

    expect(second.addedTracks).toHaveLength(1);
    expect(second.addedTracks[0].fileName).toBe("Track B.mp3");
    expect(second.unchangedTracks).toHaveLength(1);
  });

  it("detects a new subfolder", async () => {
    const root = await createFixture();

    const scanner = new LibraryScanner();
    const first = await scanner.scan(root);

    await mkdir(join(root, "Afro House"), {
      recursive: true
    });

    await createFile(
      join(root, "Afro House", "Track.mp3")
    );

    const second = await scanner.scan(
      root,
      first.snapshot
    );

    expect(
      second.addedFolders.map((folder) => folder.relativePath)
    ).toContain("Afro House");

    expect(second.addedTracks).toHaveLength(1);
  });

  it("detects modified files", async () => {
    const root = await createFixture();
    const file = join(root, "Track.mp3");

    await createFile(file, "initial");

    const scanner = new LibraryScanner();
    const first = await scanner.scan(root);

    await new Promise((resolve) => setTimeout(resolve, 10));

    await writeFile(file, "modified-content");
    const newTime = new Date(Date.now() + 2000);
    await utimes(file, newTime, newTime);

    const second = await scanner.scan(
      root,
      first.snapshot
    );

    expect(second.modifiedTracks).toHaveLength(1);
    expect(second.modifiedTracks[0].fileName).toBe(
      "Track.mp3"
    );
  });

  it("detects removed files", async () => {
    const root = await createFixture();
    const file = join(root, "Track.mp3");

    await createFile(file);

    const scanner = new LibraryScanner();
    const first = await scanner.scan(root);

    await rm(file);

    const second = await scanner.scan(
      root,
      first.snapshot
    );

    expect(second.removedTracks).toHaveLength(1);
    expect(second.removedTracks[0].status).toBe("missing");
  });

  it("does not duplicate tracks across repeated scans", async () => {
    const root = await createFixture();

    await createFile(join(root, "Track.mp3"));

    const scanner = new LibraryScanner();

    const first = await scanner.scan(root);
    const second = await scanner.scan(
      root,
      first.snapshot
    );

    expect(second.snapshot.tracks).toHaveLength(1);
    expect(second.addedTracks).toHaveLength(0);
    expect(second.modifiedTracks).toHaveLength(0);
    expect(second.unchangedTracks).toHaveLength(1);
  });

  it("ignores unsupported files", async () => {
    const root = await createFixture();

    await createFile(join(root, "Track.mp3"));
    await createFile(join(root, "Artwork.png"));
    await createFile(join(root, "Metadata.txt"));

    const scanner = new LibraryScanner();
    const result = await scanner.scan(root);

    expect(result.snapshot.tracks).toHaveLength(1);
  });
});