import {
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";
import { dirname } from "node:path";

import type { AudioAnalysisResult } from "./types";

export interface AnalysisRepository {
  get(trackId: string): Promise<AudioAnalysisResult | null>;
  save(result: AudioAnalysisResult): Promise<void>;
  saveMany(results: AudioAnalysisResult[]): Promise<void>;
  list(): Promise<AudioAnalysisResult[]>;
}

interface AnalysisDatabase {
  version: 1;
  analyses: Record<string, AudioAnalysisResult>;
}

export class JsonAnalysisRepository
  implements AnalysisRepository
{
  constructor(private readonly filePath: string) {}

  async get(
    trackId: string
  ): Promise<AudioAnalysisResult | null> {
    const database = await this.load();

    return database.analyses[trackId] ?? null;
  }

  async save(result: AudioAnalysisResult): Promise<void> {
    const database = await this.load();

    database.analyses[result.trackId] = result;

    await this.persist(database);
  }

  async saveMany(
    results: AudioAnalysisResult[]
  ): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const database = await this.load();

    for (const result of results) {
      database.analyses[result.trackId] = result;
    }

    await this.persist(database);
  }

  async list(): Promise<AudioAnalysisResult[]> {
    const database = await this.load();

    return Object.values(database.analyses).sort((a, b) =>
      a.trackId.localeCompare(b.trackId)
    );
  }

  private async load(): Promise<AnalysisDatabase> {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(content);

      return validateDatabase(parsed);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return emptyDatabase();
      }

      throw error;
    }
  }

  private async persist(
    database: AnalysisDatabase
  ): Promise<void> {
    const directory = dirname(this.filePath);

    await mkdir(directory, {
      recursive: true
    });

    const temporaryPath = `${this.filePath}.tmp`;

    await writeFile(
      temporaryPath,
      JSON.stringify(database, null, 2),
      "utf8"
    );

    await rename(
      temporaryPath,
      this.filePath
    );
  }
}

function emptyDatabase(): AnalysisDatabase {
  return {
    version: 1,
    analyses: {}
  };
}

function validateDatabase(
  value: unknown
): AnalysisDatabase {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    !("analyses" in value)
  ) {
    throw new Error(
      "Invalid audio analysis database."
    );
  }

  const database = value as {
    version: unknown;
    analyses: unknown;
  };

  if (
    database.version !== 1 ||
    typeof database.analyses !== "object" ||
    database.analyses === null ||
    Array.isArray(database.analyses)
  ) {
    throw new Error(
      "Invalid audio analysis database schema."
    );
  }

  return {
    version: 1,
    analyses:
      database.analyses as Record<
        string,
        AudioAnalysisResult
      >
  };
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