import type { LibraryTrack } from "../library/types";

export type AnalysisStatus = "complete" | "failed";

export interface AudioFormatAnalysis {
  container: string | null;
  codec: string | null;
  codecProfile: string | null;
  bitrate: number | null;
  sampleRate: number | null;
  bitsPerSample: number | null;
  numberOfChannels: number | null;
  lossless: boolean | null;
}

export interface AudioTagAnalysis {
  title: string | null;
  artists: string[];
  album: string | null;
  albumArtist: string | null;
  genres: string[];
  year: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  composer: string[];
  comment: string[];
}

export interface AudioAnalysisResult {
  trackId: string;
  analyzedAtMs: number;
  sourceSizeBytes: number;
  sourceModifiedTimeMs: number;
  status: AnalysisStatus;
  durationSeconds: number | null;
  format: AudioFormatAnalysis;
  tags: AudioTagAnalysis;
  error: string | null;
}

export interface AudioAnalyzer {
  analyze(track: LibraryTrack): Promise<AudioAnalysisResult>;
}