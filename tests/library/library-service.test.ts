import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { JsonLibraryRepository } from "../../src/library/json-repository";
import { LibraryScanner } from "../../src/library/scanner";
import { LibraryService } from "../../src/library/library-service";

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), "mashup-assistant-service-")
  );

  temporaryDirectories.push(directory);

  return directory;
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

describe("LibraryService", () => {
  it("synchronizes and persists the library", async () => {
    const root = await createFixture();
    const databasePath = join(
      root,
      ".mashup",
      "library.json"
    );

    await mkdir(join(root, "House"), {
      recursive: true
    });

    await writeFile(
      join(root, "House", "Track.mp3"),
      "audio"
    );

    const repository = new JsonLibraryRepository(
      databasePath
    );

    const service = new LibraryService(
      new LibraryScanner(),
      repository
    );

    const result = await service.synchronize(root);

    expect(result.addedTracks).toHaveLength(1);
    expect(result.snapshot.rootPath).toBe(root);

    const persisted = await repository.load();

    expect(persisted?.tracks).toHaveLength(1);
  });

  it("does not re-add unchanged tracks", async () => {
    const root = await createFixture();

    await writeFile(
      join(root, "Track.mp3"),
      "audio"
    );

    const repository = new JsonLibraryRepository(
      join(root, "library.json")
    );

    const service = new LibraryService(
      new LibraryScanner(),
      repository
    );

    const first = await service.synchronize(root);
    const second = await service.synchronize(root);

    expect(first.addedTracks).toHaveLength(1);
    expect(second.addedTracks).toHaveLength(0);
    expect(second.modifiedTracks).toHaveLength(0);
    expect(second.unchangedTracks).toHaveLength(1);
  });

  it("rejects synchronization against a different root", async () => {
    const rootA = await createFixture();
    const rootB = await createFixture();

    const repository = new JsonLibraryRepository(
      join(rootA, "library.json")
    );

    const service = new LibraryService(
      new LibraryScanner(),
      repository
    );

    await service.synchronize(rootA);

    await expect(
      service.synchronize(rootB)
    ).rejects.toThrow("Library root mismatch");
  });
});