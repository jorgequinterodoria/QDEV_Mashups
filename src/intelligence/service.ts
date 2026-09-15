import type { LibraryTrack } from "../library/types";

import {
  classifyEnergy,
  classifyVocalProfile
} from "./classification";

import type {
  MusicIntelligenceEngine,
  MusicIntelligenceResult
} from "./types";

import type {
  MusicIntelligenceRepository
} from "./repository";

const ANALYSIS_VERSION = 1;

export class MusicIntelligenceService {
  constructor(
    private readonly engine: MusicIntelligenceEngine,
    private readonly repository: MusicIntelligenceRepository
  ) {}

  async analyzeTrack(
    track: LibraryTrack,
    force = false
  ): Promise<MusicIntelligenceResult> {
    if (!force) {
      const cached =
        await this.repository.get(
          track.id
        );

      if (
        cached &&
        cached.sourceSizeBytes ===
          track.sizeBytes &&
        cached.sourceModifiedTimeMs ===
          track.modifiedTimeMs &&
        cached.analysisVersion ===
          ANALYSIS_VERSION
      ) {
        return cached;
      }
    }

    try {
      const analysis =
        await this.engine.analyze(
          track.absolutePath
        );

      const result: MusicIntelligenceResult =
        {
          trackId: track.id,
          analyzedAtMs: Date.now(),
          sourceSizeBytes:
            track.sizeBytes,
          sourceModifiedTimeMs:
            track.modifiedTimeMs,
          durationSeconds:
            analysis.durationSeconds,
          tempo: analysis.tempo,
          key: analysis.key,
          chords: analysis.chords,
          spectral:
            analysis.spectral,
          energy: classifyEnergy(
            analysis.spectral
          ),
          vocalProfile:
            classifyVocalProfile(
              analysis.spectral
            ),
          analysisVersion:
            ANALYSIS_VERSION,
          error: null
        };

      await this.repository.save(
        result
      );

      return result;
    } catch (error) {
      const result: MusicIntelligenceResult =
        {
          trackId: track.id,
          analyzedAtMs: Date.now(),
          sourceSizeBytes:
            track.sizeBytes,
          sourceModifiedTimeMs:
            track.modifiedTimeMs,
          durationSeconds: null,
          tempo: {
            bpm: null,
            confidence: null,
            halfTimeBpm: null,
            doubleTimeBpm: null,
            beatTimes: [],
            onsetTimes: []
          },
          key: {
            label: null,
            tonic: null,
            mode: "unknown",
            confidence: null
          },
          chords: [],
          spectral: {
            rms: null,
            loudnessLufs: null,
            spectralCentroidHz: null,
            spectralFlatness: null,
            spectralRolloffHz: null,
            zeroCrossingRate: null
          },
          energy: "unknown",
          vocalProfile: "unknown",
          analysisVersion:
            ANALYSIS_VERSION,
          error:
            error instanceof Error
              ? error.message
              : String(error)
        };

      await this.repository.save(
        result
      );

      return result;
    }
  }

  async analyzeTracks(
    tracks: LibraryTrack[],
    force = false
  ): Promise<
    MusicIntelligenceResult[]
  > {
    const results: MusicIntelligenceResult[] =
      [];

    for (const track of tracks) {
      results.push(
        await this.analyzeTrack(
          track,
          force
        )
      );
    }

    return results;
  }
}