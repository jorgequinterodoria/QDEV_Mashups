export interface SyncTrack {
  trackId: string;
  absolutePath: string;
  sizeBytes: number;
  modifiedTimeMs: number;
}

export interface SyncSnapshot {
  libraryRoot: string;
  generatedAtMs: number;
  tracks: SyncTrack[];
}

export interface SyncChanges {
  added: SyncTrack[];
  modified: SyncTrack[];
  removed: SyncTrack[];
  unchanged: SyncTrack[];
}

export interface SyncStatistics {
  discovered: number;
  added: number;
  modified: number;
  removed: number;
  unchanged: number;
  analysisInvalidated: number;
  intelligenceInvalidated: number;
}

export interface SyncResult {
  snapshot: SyncSnapshot;
  changes: SyncChanges;
  statistics: SyncStatistics;
}

export interface LibrarySyncProvider {
  scan(
    libraryRoot: string
  ): Promise<SyncSnapshot>;
}

export interface SyncInvalidator {
  invalidateAnalysis(
    trackIds: string[]
  ): Promise<void>;

  invalidateIntelligence(
    trackIds: string[]
  ): Promise<void>;
}

export interface SyncStateStore {
  load(
    libraryRoot: string
  ): Promise<SyncSnapshot | null>;

  save(
    snapshot: SyncSnapshot
  ): Promise<void>;
}

export interface LibrarySyncService {
  synchronize(
    libraryRoot: string
  ): Promise<SyncResult>;
}