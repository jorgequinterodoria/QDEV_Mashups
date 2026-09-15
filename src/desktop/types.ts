export interface DesktopRuntimeInfo {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  platform: string;
  arch: string;
}

export interface DiscoveryCandidate {
  baseTrackPath: string;
  secondaryTrackPath: string;
  title: string;
  artist: string;
  secondaryTitle: string;
  secondaryArtist: string;
  score: number;
  bpm: string;
  secondaryBpm: string;
  key: string;
  secondaryKey: string;
  targetBpm: number | null;
  targetKey: string | null;
  grade: string;
  confidence: string;
  type:
    | "vocal"
    | "instrumental"
    | "hybrid";
}

export interface LibraryScanResult {
  root: string;
  tracks: number;
  totalBytes: number;
  scannedAtMs: number;
  discoveryCandidates: DiscoveryCandidate[];
  discoveryPairsEvaluated: number;
  discoveryTracksAnalyzed: number;
}

export type MashupOutputKind =
  | "preview"
  | "full";

export interface PreviewResult {
  outputPath: string;
  planId: string;
  kind: MashupOutputKind;
  score: number;
  grade: string;
  confidence: string;
  targetBpm: number | null;
  targetKey: string | null;
  durationSeconds: number;
}

export interface QdevDesktopApi {
  getRuntimeInfo(): Promise<DesktopRuntimeInfo>;
  chooseLibrary(): Promise<string | null>;
  scanLibrary(libraryRoot: string): Promise<LibraryScanResult>;
  chooseAudioFiles(): Promise<string[]>;
  createPreview(baseTrackPath: string, secondaryTrackPath: string): Promise<PreviewResult>;
  createFullMashup(planId: string): Promise<PreviewResult>;
  revealOutput(outputPath: string): Promise<void>;
  getAudioUrl(outputPath: string): Promise<string>;
}
