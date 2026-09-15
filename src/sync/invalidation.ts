import type {
  SyncInvalidator
} from "./types";

export interface TrackCacheInvalidator {
  invalidate(
    trackIds: string[]
  ): Promise<void>;
}

export class AnalysisIntelligenceInvalidator
  implements SyncInvalidator
{
  constructor(
    private readonly analysis:
      TrackCacheInvalidator,
    private readonly intelligence:
      TrackCacheInvalidator
  ) {}

  async invalidateAnalysis(
    trackIds: string[]
  ): Promise<void> {
    if (
      trackIds.length === 0
    ) {
      return;
    }

    await this.analysis.invalidate(
      uniqueSorted(
        trackIds
      )
    );
  }

  async invalidateIntelligence(
    trackIds: string[]
  ): Promise<void> {
    if (
      trackIds.length === 0
    ) {
      return;
    }

    await this.intelligence.invalidate(
      uniqueSorted(
        trackIds
      )
    );
  }
}

function uniqueSorted(
  values: string[]
): string[] {
  return [
    ...new Set(
      values
    )
  ].sort();
}