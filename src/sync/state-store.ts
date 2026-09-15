import {
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";

import {
  join
} from "node:path";

import type {
  SyncSnapshot,
  SyncStateStore
} from "./types";

export class JsonSyncStateStore
  implements SyncStateStore
{
  constructor(
    private readonly rootDirectory:
      string
  ) {}

  async load(
    libraryRoot: string
  ): Promise<SyncSnapshot | null> {
    const statePath =
      this.getStatePath(
        libraryRoot
      );

    try {
      const content =
        await readFile(
          statePath,
          "utf8"
        );

      const parsed =
        JSON.parse(
          content
        ) as SyncSnapshot;

      return validateSnapshot(
        parsed
      )
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  async save(
    snapshot: SyncSnapshot
  ): Promise<void> {
    await mkdir(
      this.rootDirectory,
      {
        recursive: true
      }
    );

    const statePath =
      this.getStatePath(
        snapshot.libraryRoot
      );

    const temporaryPath =
      `${statePath}.tmp`;

    await writeFile(
      temporaryPath,
      `${JSON.stringify(
        snapshot,
        null,
        2
      )}\n`,
      "utf8"
    );

    await rename(
      temporaryPath,
      statePath
    );
  }

  private getStatePath(
    libraryRoot: string
  ): string {
    return join(
      this.rootDirectory,
      createStateFileName(
        libraryRoot
      )
    );
  }
}

function createStateFileName(
  libraryRoot: string
): string {
  return (
    `${hashLibraryRoot(
      libraryRoot
    )}.json`
  );
}

function hashLibraryRoot(
  value: string
): string {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    hash >>> 0
  ).toString(16);
}

function validateSnapshot(
  value: unknown
): value is SyncSnapshot {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<SyncSnapshot>;

  return (
    typeof candidate.libraryRoot ===
      "string" &&
    typeof candidate.generatedAtMs ===
      "number" &&
    Array.isArray(
      candidate.tracks
    ) &&
    candidate.tracks.every(
      isTrack
    )
  );
}

function isTrack(
  value: unknown
): boolean {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<
      SyncSnapshot["tracks"][number]
    >;

  return (
    typeof candidate.trackId ===
      "string" &&
    typeof candidate.absolutePath ===
      "string" &&
    typeof candidate.sizeBytes ===
      "number" &&
    typeof candidate.modifiedTimeMs ===
      "number"
  );
}