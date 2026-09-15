export const STEM_CHANNELS = [
  "vocals",
  "drums",
  "bass",
  "other"
] as const;

export type StemChannel = (typeof STEM_CHANNELS)[number];

export type StemJobStatus =
  | "pending"
  | "running"
  | "ready"
  | "failed"
  | "cancelled";

export type StemProviderName = "mlx-demucs";
export type StemModelName = "htdemucs" | "htdemucs_ft";

export interface StemFile {
  readonly channel: StemChannel;
  readonly path: string;
  readonly sizeBytes: number;
  readonly modifiedTimeMs: number;
}

export interface StemManifest {
  readonly schemaVersion: 1;
  readonly trackId: string;
  readonly sourcePath: string;
  readonly sourceSizeBytes: number;
  readonly sourceModifiedTimeMs: number;
  readonly sourceSha256: string;
  readonly provider: StemProviderName;
  readonly model: StemModelName;
  readonly modelVersion: string;
  readonly sampleRate: number;
  readonly channels: number;
  readonly durationSeconds: number;
  readonly stems: Readonly<Record<StemChannel, StemFile>>;
  readonly createdAtMs: number;
}

export interface StemSeparationProgress {
  readonly trackId: string;
  readonly status: StemJobStatus;
  readonly progress01: number;
  readonly message: string;
}

export interface StemSeparationRequest {
  readonly trackId: string;
  readonly sourcePath: string;
  readonly model?: StemModelName;
  readonly outputDirectory?: string;
  readonly force?: boolean;
  readonly onProgress?: (progress: StemSeparationProgress) => void;
  readonly signal?: AbortSignal;
}

export interface StemSeparationResult {
  readonly cacheHit: boolean;
  readonly manifest: StemManifest;
}

export interface StemSeparationProviderRequest {
  readonly sourcePath: string;
  readonly destinationDirectory: string;
  readonly model: StemModelName;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress01: number, message: string) => void;
}

export interface StemSeparationProviderResult {
  readonly provider: StemProviderName;
  readonly model: StemModelName;
  readonly modelVersion: string;
  readonly stems: Record<StemChannel, string>;
}

export interface StemSeparationProvider {
  readonly name: StemProviderName;
  separate(
    request: StemSeparationProviderRequest
  ): Promise<StemSeparationProviderResult>;
}

export interface StemCacheOptions {
  readonly rootDirectory: string;
  readonly modelVersion: string;
}

export interface StemCacheEntry {
  readonly cacheKey: string;
  readonly manifestPath: string;
  readonly stemDirectory: string;
}

export class StemSeparationError extends Error {
  readonly code:
    | "INVALID_SOURCE"
    | "INVALID_PROVIDER_OUTPUT"
    | "PROVIDER_UNAVAILABLE"
    | "PROVIDER_FAILED"
    | "CACHE_FAILED"
    | "CANCELLED";

  constructor(
    code: StemSeparationError["code"],
    message: string
  ) {
    super(message);
    this.name = "StemSeparationError";
    this.code = code;
  }
}

export function isStemChannel(value: string): value is StemChannel {
  return (STEM_CHANNELS as readonly string[]).includes(value);
}

export function assertFourStemChannels(
  stems: Readonly<Record<StemChannel, string>>
): void {
  const keys = Object.keys(stems).sort();
  const expected = [...STEM_CHANNELS].sort();

  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    throw new StemSeparationError(
      "INVALID_PROVIDER_OUTPUT",
      `La separación debe producir exactamente 4 stems: ${STEM_CHANNELS.join(", ")}.`
    );
  }
}
