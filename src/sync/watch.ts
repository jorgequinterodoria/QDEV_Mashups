import {
  watch
} from "node:fs";

import type {
  LibrarySyncService
} from "./types";

export interface SyncWatcherOptions {
  debounceMs?: number;
}

export class LibrarySyncWatcher {
  private watcher:
    ReturnType<
      typeof watch
    > | null = null;

  private timer:
    ReturnType<
      typeof setTimeout
    > | null = null;

  private running =
    false;

  constructor(
    private readonly syncService:
      LibrarySyncService,
    private readonly options:
      SyncWatcherOptions = {}
  ) {}

  start(
    libraryRoot: string,
    onSync?: (
      error: Error | null
    ) => void
  ): void {
    if (
      this.watcher !== null
    ) {
      return;
    }

    const debounceMs =
      this.options.debounceMs ??
      1500;

    this.watcher =
      watch(
        libraryRoot,
        {
          recursive: true
        },
        () => {
          if (
            this.timer !== null
          ) {
            clearTimeout(
              this.timer
            );
          }

          this.timer =
            setTimeout(
              () => {
                void this.run(
                  libraryRoot,
                  onSync
                );
              },
              debounceMs
            );
        }
      );
  }

  stop(): void {
    if (
      this.timer !== null
    ) {
      clearTimeout(
        this.timer
      );

      this.timer = null;
    }

    this.watcher?.close();
    this.watcher = null;
  }

  private async run(
    libraryRoot: string,
    onSync?: (
      error: Error | null
    ) => void
  ): Promise<void> {
    if (
      this.running
    ) {
      return;
    }

    this.running = true;

    try {
      await this.syncService.synchronize(
        libraryRoot
      );

      onSync?.(
        null
      );
    } catch (
      error
    ) {
      onSync?.(
        error instanceof Error
          ? error
          : new Error(
              String(error)
            )
      );
    } finally {
      this.running = false;
    }
  }
}