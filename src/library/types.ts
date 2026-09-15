export type SupportedAudioExtension =
  | ".mp3"
  | ".flac"
  | ".wav"
  | ".aiff"
  | ".aif"
  | ".m4a"
  | ".aac"
  | ".ogg"
  | ".opus";

export type LibraryTrackStatus = "active" | "missing";

export interface LibraryFolder {
  id: string;
  relativePath: string;
  absolutePath: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export interface LibraryTrack {
  id: string;
  relativePath: string;
  absolutePath: string;
  fileName: string;
  extension: SupportedAudioExtension;
  folderId: string;
  sizeBytes: number;
  modifiedTimeMs: number;
  status: LibraryTrackStatus;
}

export interface LibrarySnapshot {
  rootPath: string;
  scannedAtMs: number;
  folders: LibraryFolder[];
  tracks: LibraryTrack[];
}

export interface LibraryScanResult {
  snapshot: LibrarySnapshot;
  addedTracks: LibraryTrack[];
  modifiedTracks: LibraryTrack[];
  removedTracks: LibraryTrack[];
  unchangedTracks: LibraryTrack[];
  addedFolders: LibraryFolder[];
  removedFolders: LibraryFolder[];
}

export interface LibraryRepository {
  load(): Promise<LibrarySnapshot | null>;
  save(snapshot: LibrarySnapshot): Promise<void>;
  clear(): Promise<void>;
}

export interface LibraryScannerOptions {
  supportedExtensions?: readonly SupportedAudioExtension[];
  followSymbolicLinks?: boolean;
}