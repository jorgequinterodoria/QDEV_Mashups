import {
  mkdir,
  readFile,
  rename,
  writeFile
} from "node:fs/promises";
import { dirname } from "node:path";

import type {
  MusicIntelligenceResult
} from "./types";

export interface MusicIntelligenceRepository {
  get(
    trackId: string
  ): Promise<MusicIntelligenceResult | null>;

  save(
    result: MusicIntelligenceResult
  ): Promise<void>;

  list(): Promise<MusicIntelligenceResult[]>;
}

interface IntelligenceDatabase {
  version: 1;
  results: Record<
    string,
    MusicIntelligenceResult
  >;
}

export class JsonMusicIntelligenceRepository
  implements MusicIntelligenceRepository
{
  constructor(
    private readonly filePath: string
  ) {}

  async get(
    trackId: string
  ): Promise<MusicIntelligenceResult | null> {
    const database = await this.load();

    return (
      database.results[trackId] ?? null
    );
  }

  async save(
    result: MusicIntelligenceResult
  ): Promise<void> {
    const database = await this.load();

    database.results[result.trackId] =
      result;

    await this.persist(database);
  }

  async list(): Promise<
    MusicIntelligenceResult[]
  > {
    const database = await this.load();

    return Object.values(
      database.results
    ).sort((a, b) =>
      a.trackId.localeCompare(
        b.trackId
      )
    );
  }

  private async load(): Promise<IntelligenceDatabase> {
    try {
      const content = await readFile(
        this.filePath,
        "utf8"
      );

      return validateDatabase(
        JSON.parse(content)
      );
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return {
          version: 1,
          results: {}
        };
      }

      throw error;
    }
  }

  private async persist(
    database: IntelligenceDatabase
  ): Promise<void> {
    await mkdir(
      dirname(this.filePath),
      {
        recursive: true
      }
    );

    const temporaryPath =
      `${this.filePath}.tmp`;

    await writeFile(
      temporaryPath,
      JSON.stringify(
        database,
        null,
        2
      ),
      "utf8"
    );

    await rename(
      temporaryPath,
      this.filePath
    );
  }
}

function validateDatabase(
  value: unknown
): IntelligenceDatabase {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    !("results" in value)
  ) {
    throw new Error(
      "Invalid music intelligence database."
    );
  }

  const database = value as {
    version: unknown;
    results: unknown;
  };

  if (
    database.version !== 1 ||
    typeof database.results !==
      "object" ||
    database.results === null ||
    Array.isArray(database.results)
  ) {
    throw new Error(
      "Invalid music intelligence database schema."
    );
  }

  return {
    version: 1,
    results:
      database.results as Record<
        string,
        MusicIntelligenceResult
      >
  };
}

function isFileNotFoundError(
  error: unknown
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException)
      .code === "ENOENT"
  );
}