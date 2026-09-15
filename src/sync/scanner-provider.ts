import {
  stat
} from "node:fs/promises";

import {
  resolve
} from "node:path";

import type {
  SyncSnapshot,
  LibrarySyncProvider
} from "./types";

export interface SyncScanner {
  scan(
    libraryRoot: string
  ): Promise<
    Array<{
      trackId: string;
      absolutePath: string;
    }>
  >;
}

export class ScannerLibrarySyncProvider
  implements LibrarySyncProvider
{
  constructor(
    private readonly scanner:
      SyncScanner
  ) {}

  async scan(
    libraryRoot: string
  ): Promise<SyncSnapshot> {
    const resolvedRoot =
      resolve(
        libraryRoot
      );

    const discovered =
      await this.scanner.scan(
        resolvedRoot
      );

    const tracks = [];

    for (
      const item of discovered
    ) {
      const absolutePath =
        resolve(
          item.absolutePath
        );

      const metadata =
        await stat(
          absolutePath
        );

      tracks.push({
        trackId:
          item.trackId,

        absolutePath,

        sizeBytes:
          metadata.size,

        modifiedTimeMs:
          metadata.mtimeMs
      });
    }

    return {
      libraryRoot:
        resolvedRoot,

      generatedAtMs:
        Date.now(),

      tracks
    };
  }
}