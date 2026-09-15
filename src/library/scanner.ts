import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";

import {
  createFolder,
  createTrackIdFromFolderAndFile
} from "./identity";
import {
  isSupportedAudioExtension,
  DEFAULT_AUDIO_EXTENSIONS
} from "./extensions";
import { normalizeRelativePath, normalizeRootPath } from "./paths";
import type {
  LibraryFolder,
  LibraryScanResult,
  LibraryScannerOptions,
  LibrarySnapshot,
  LibraryTrack,
  SupportedAudioExtension
} from "./types";

interface ScanState {
  folders: Map<string, LibraryFolder>;
  tracks: Map<string, LibraryTrack>;
}

export class LibraryScanner {
  private readonly supportedExtensions: readonly SupportedAudioExtension[];
  private readonly followSymbolicLinks: boolean;

  constructor(options: LibraryScannerOptions = {}) {
    this.supportedExtensions =
      options.supportedExtensions ?? DEFAULT_AUDIO_EXTENSIONS;
    this.followSymbolicLinks = options.followSymbolicLinks ?? false;
  }

  async scan(
    rootPath: string,
    previousSnapshot: LibrarySnapshot | null = null
  ): Promise<LibraryScanResult> {
    const normalizedRoot = normalizeRootPath(rootPath);
    const state: ScanState = {
      folders: new Map(),
      tracks: new Map()
    };

    await this.walkDirectory(normalizedRoot, normalizedRoot, state);

    const snapshot: LibrarySnapshot = {
      rootPath: normalizedRoot,
      scannedAtMs: Date.now(),
      folders: [...state.folders.values()].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      ),
      tracks: [...state.tracks.values()].sort((a, b) =>
        a.relativePath.localeCompare(b.relativePath)
      )
    };

    return this.createDiff(snapshot, previousSnapshot);
  }

  private async walkDirectory(
    rootPath: string,
    currentPath: string,
    state: ScanState
  ): Promise<void> {
    const relativePath = normalizeRelativePath(rootPath, currentPath);
    const folder = createFolder(rootPath, relativePath);

    state.folders.set(folder.id, folder);

    const entries = await readdir(currentPath, {
      withFileTypes: true
    });

    const sortedEntries = [...entries].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const entry of sortedEntries) {
      const entryPath = join(currentPath, entry.name);

      if (entry.isSymbolicLink()) {
        if (!this.followSymbolicLinks) {
          continue;
        }

        const entryStats = await stat(entryPath);

        if (entryStats.isDirectory()) {
          await this.walkDirectory(rootPath, entryPath, state);
          continue;
        }

        if (entryStats.isFile()) {
          this.addTrack(rootPath, folder, entry.name, entryStats, state);
        }

        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(rootPath, entryPath, state);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = extname(entry.name).toLowerCase();

      if (!isSupportedAudioExtension(extension, this.supportedExtensions)) {
        continue;
      }

      const fileStats = await stat(entryPath);
      this.addTrack(rootPath, folder, entry.name, fileStats, state);
    }
  }

  private addTrack(
    rootPath: string,
    folder: LibraryFolder,
    fileName: string,
    fileStats: {
      size: number;
      mtimeMs: number;
    },
    state: ScanState
  ): void {
    const relativePath = normalizeRelativePath(
      rootPath,
      `${folder.absolutePath}/${fileName}`
    );

    const extension = extname(fileName).toLowerCase() as SupportedAudioExtension;

    const track: LibraryTrack = {
      id: createTrackIdFromFolderAndFile(folder.relativePath, fileName),
      relativePath,
      absolutePath: `${folder.absolutePath}/${fileName}`,
      fileName,
      extension,
      folderId: folder.id,
      sizeBytes: fileStats.size,
      modifiedTimeMs: fileStats.mtimeMs,
      status: "active"
    };

    state.tracks.set(track.id, track);
  }

  private createDiff(
    snapshot: LibrarySnapshot,
    previousSnapshot: LibrarySnapshot | null
  ): LibraryScanResult {
    if (!previousSnapshot) {
      return {
        snapshot,
        addedTracks: snapshot.tracks,
        modifiedTracks: [],
        removedTracks: [],
        unchangedTracks: [],
        addedFolders: snapshot.folders,
        removedFolders: []
      };
    }

    const previousTracks = new Map(
      previousSnapshot.tracks.map((track) => [track.id, track])
    );

    const currentTracks = new Map(
      snapshot.tracks.map((track) => [track.id, track])
    );

    const previousFolders = new Map(
      previousSnapshot.folders.map((folder) => [folder.id, folder])
    );

    const currentFolders = new Map(
      snapshot.folders.map((folder) => [folder.id, folder])
    );

    const addedTracks: LibraryTrack[] = [];
    const modifiedTracks: LibraryTrack[] = [];
    const unchangedTracks: LibraryTrack[] = [];
    const removedTracks: LibraryTrack[] = [];

    for (const track of snapshot.tracks) {
      const previous = previousTracks.get(track.id);

      if (!previous) {
        addedTracks.push(track);
        continue;
      }

      if (
        previous.sizeBytes !== track.sizeBytes ||
        previous.modifiedTimeMs !== track.modifiedTimeMs ||
        previous.relativePath !== track.relativePath
      ) {
        modifiedTracks.push(track);
        continue;
      }

      unchangedTracks.push(track);
    }

    for (const previousTrack of previousSnapshot.tracks) {
      if (!currentTracks.has(previousTrack.id)) {
        removedTracks.push({
          ...previousTrack,
          status: "missing"
        });
      }
    }

    const addedFolders = snapshot.folders.filter(
      (folder) => !previousFolders.has(folder.id)
    );

    const removedFolders = previousSnapshot.folders.filter(
      (folder) => !currentFolders.has(folder.id)
    );

    return {
      snapshot,
      addedTracks,
      modifiedTracks,
      removedTracks,
      unchangedTracks,
      addedFolders,
      removedFolders
    };
  }
}