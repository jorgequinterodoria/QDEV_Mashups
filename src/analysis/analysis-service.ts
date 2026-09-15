import type { LibraryTrack } from "../library/types";
import type { AnalysisRepository } from "./analysis-repository";
import type {
  AudioAnalysisResult,
  AudioAnalyzer
} from "./types";

export class AudioAnalysisService {
  constructor(
    private readonly analyzer: AudioAnalyzer,
    private readonly repository: AnalysisRepository
  ) {}

  async analyzeTrack(
    track: LibraryTrack,
    force = false
  ): Promise<AudioAnalysisResult> {
    if (!force) {
      const cached = await this.repository.get(track.id);

      if (
        cached &&
        cached.sourceSizeBytes === track.sizeBytes &&
        cached.sourceModifiedTimeMs ===
          track.modifiedTimeMs
      ) {
        return cached;
      }
    }

    const result = await this.analyzer.analyze(track);

    await this.repository.save(result);

    return result;
  }

  async analyzeTracks(
    tracks: LibraryTrack[],
    force = false
  ): Promise<AudioAnalysisResult[]> {
    const results: AudioAnalysisResult[] = [];

    for (const track of tracks) {
      results.push(
        await this.analyzeTrack(track, force)
      );
    }

    return results;
  }
}