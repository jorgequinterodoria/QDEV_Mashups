import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { JsonLibraryRepository } from "../../src/library/json-repository";
import type { LibrarySnapshot } from "../../src/library/types";

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const directory = await mkdtemp(
    join(tmpdir(), "mashup-assistant-db-")
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

describe("JsonLibraryRepository", () => {
  const snapshot: LibrarySnapshot = {
    rootPath: "/Volumes/Respaldo Mac/MUSICA/Deemix",
    scannedAtMs: 123456789,
    folders: [],
    tracks: []
  };

  it("returns null when the database does not exist", async () => {
    const directory = await createFixture();

    const repository = new JsonLibraryRepository(
      join(directory, "library.json")
    );

    await expect(repository.load()).resolves.toBeNull();
  });

  it("persists and reloads a snapshot", async () => {
    const directory = await createFixture();

    const repository = new JsonLibraryRepository(
      join(directory, "library.json")
    );

    await repository.save(snapshot);

    await expect(repository.load()).resolves.toEqual(
      snapshot
    );
  });

  it("creates parent directories automatically", async () => {
    const directory = await createFixture();

    const repository = new JsonLibraryRepository(
      join(directory, "nested", "library.json")
    );

    await repository.save(snapshot);

    await expect(repository.load()).resolves.toEqual(
      snapshot
    );
  });

  it("clears the database to an empty snapshot", async () => {
    const directory = await createFixture();

    const repository = new JsonLibraryRepository(
      join(directory, "library.json")
    );

    await repository.save(snapshot);
    await repository.clear();

    await expect(repository.load()).resolves.toEqual({
      rootPath: "",
      scannedAtMs: 0,
      folders: [],
      tracks: []
    });
  });
});