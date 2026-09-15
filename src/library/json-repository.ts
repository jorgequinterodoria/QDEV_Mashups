import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  LibraryRepository,
  LibrarySnapshot
} from "./types";

export class JsonLibraryRepository implements LibraryRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<LibrarySnapshot | null> {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(content);

      return validateSnapshot(parsed);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async save(snapshot: LibrarySnapshot): Promise<void> {
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true });

    const temporaryPath = `${this.filePath}.tmp`;

    await writeFile(
      temporaryPath,
      JSON.stringify(snapshot, null, 2),
      "utf8"
    );

    await rename(temporaryPath, this.filePath);
  }

  async clear(): Promise<void> {
    try {
      const emptySnapshot: LibrarySnapshot = {
        rootPath: "",
        scannedAtMs: 0,
        folders: [],
        tracks: []
      };

      await this.save(emptySnapshot);
    } catch (error) {
      throw new Error(
        `Unable to clear library repository: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

function validateSnapshot(value: unknown): LibrarySnapshot {
  if (!isRecord(value)) {
    throw new Error("Invalid library database: expected an object.");
  }

  if (
    typeof value.rootPath !== "string" ||
    typeof value.scannedAtMs !== "number" ||
    !Array.isArray(value.folders) ||
    !Array.isArray(value.tracks)
  ) {
    throw new Error("Invalid library database schema.");
  }

  return {
    rootPath: value.rootPath,
    scannedAtMs: value.scannedAtMs,
    folders: value.folders as LibrarySnapshot["folders"],
    tracks: value.tracks as LibrarySnapshot["tracks"]
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFileNotFoundError(
  error: unknown
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}