export interface StemConfidence {
  readonly vocals: number;
  readonly drums: number;
  readonly bass: number;
  readonly other: number;
}

export interface LibraryTrackAnalysis {
  readonly bpm: number | null;
  readonly key: string | null;
  readonly energy: number | null;
  readonly loudnessDb: number | null;
  readonly durationSeconds: number | null;
  readonly beatgridConfidence: number | null;
  readonly stemConfidence: StemConfidence | null;
  readonly vocalActivity: number | null;
  readonly instrumentalness: number | null;
  readonly tags: readonly string[];
}

export interface LibraryTrackRecord {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly artist: string;
  readonly album?: string | null;
  readonly analysis: LibraryTrackAnalysis;
}

export interface LibraryTrackProfile {
  readonly id: string;
  readonly displayName: string;
  readonly searchableText: string;
  readonly bpm: number | null;
  readonly key: string | null;
  readonly keyClass: number | null;
  readonly energy: number | null;
  readonly durationSeconds: number | null;
  readonly stemCoverage: number;
  readonly analysisCompleteness: number;
  readonly vocalPresence: number | null;
  readonly instrumentalness: number | null;
  readonly tags: readonly string[];
}

export interface RelationComponents {
  readonly tempo: number;
  readonly harmonic: number;
  readonly energy: number;
  readonly vocals: number;
  readonly duration: number;
}

export interface LibraryTrackRelation {
  readonly sourceId: string;
  readonly targetId: string;
  readonly score: number;
  readonly components: RelationComponents;
}

export interface SmartLibrarySearchFilters {
  readonly bpmMin?: number;
  readonly bpmMax?: number;
  readonly energyMin?: number;
  readonly energyMax?: number;
  readonly key?: string;
  readonly tag?: string;
  readonly vocalOnly?: boolean;
  readonly instrumentalOnly?: boolean;
  readonly minAnalysisCompleteness?: number;
}

export interface SmartLibrarySearchOptions {
  readonly limit?: number;
  readonly minScore?: number;
  readonly filters?: SmartLibrarySearchFilters;
}

export interface SmartLibrarySearchResult {
  readonly track: LibraryTrackRecord;
  readonly profile: LibraryTrackProfile;
  readonly score: number;
}

export interface LibraryClassification {
  readonly primary: string;
  readonly labels: readonly string[];
  readonly confidence: number;
}

export interface SmartLibrarySummary {
  readonly tracks: number;
  readonly analyzed: number;
  readonly withKeys: number;
  readonly withBpm: number;
  readonly withStems: number;
  readonly averageBpm: number | null;
  readonly averageEnergy: number | null;
}

export class SmartLibraryError extends Error {
  readonly code:
    | "INVALID_TRACK"
    | "INVALID_ANALYSIS"
    | "INVALID_QUERY"
    | "DUPLICATE_TRACK";

  constructor(code: SmartLibraryError["code"], message: string) {
    super(message);
    this.name = "SmartLibraryError";
    this.code = code;
  }
}

const KEY_PITCH: Readonly<Record<string, number>> = {
  c: 0,
  "c#": 1,
  db: 1,
  d: 2,
  "d#": 3,
  eb: 3,
  e: 4,
  f: 5,
  "f#": 6,
  gb: 6,
  g: 7,
  "g#": 8,
  ab: 8,
  a: 9,
  "a#": 10,
  bb: 10,
  b: 11
};

const KEY_ALIASES: Readonly<Record<string, string>> = {
  am: "am",
  "a minor": "am",
  cm: "cm",
  "c minor": "cm",
  dm: "dm",
  "d minor": "dm",
  em: "em",
  "e minor": "em",
  fm: "fm",
  "f minor": "fm",
  gm: "gm",
  "g minor": "gm",
  bm: "bm",
  "b minor": "bm"
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizedText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .trim();
}

function assertFiniteRange(
  value: number | null | undefined,
  min: number,
  max: number,
  label: string
): void {
  if (
    value !== null &&
    value !== undefined &&
    (!Number.isFinite(value) || value < min || value > max)
  ) {
    throw new SmartLibraryError(
      "INVALID_ANALYSIS",
      `${label} debe estar entre ${min} y ${max}.`
    );
  }
}

function validateTrack(track: LibraryTrackRecord): void {
  if (
    !track.id.trim() ||
    !track.path.trim() ||
    !track.title.trim() ||
    !track.artist.trim()
  ) {
    throw new SmartLibraryError(
      "INVALID_TRACK",
      "id, path, title y artist son obligatorios."
    );
  }

  const analysis = track.analysis;

  assertFiniteRange(analysis.bpm, 30, 300, "BPM");
  assertFiniteRange(analysis.energy, 0, 1, "Energía");
  assertFiniteRange(
    analysis.beatgridConfidence,
    0,
    1,
    "Confianza del beatgrid"
  );
  assertFiniteRange(analysis.vocalActivity, 0, 1, "Actividad vocal");
  assertFiniteRange(
    analysis.instrumentalness,
    0,
    1,
    "Instrumentalidad"
  );
  assertFiniteRange(
    analysis.durationSeconds,
    0,
    Number.MAX_SAFE_INTEGER,
    "Duración"
  );

  if (analysis.stemConfidence) {
    for (const [channel, confidence] of Object.entries(
      analysis.stemConfidence
    )) {
      assertFiniteRange(
        confidence,
        0,
        1,
        `Confianza de stem ${channel}`
      );
    }
  }

  for (const tag of analysis.tags) {
    if (!tag.trim()) {
      throw new SmartLibraryError(
        "INVALID_ANALYSIS",
        "Las etiquetas no pueden estar vacías."
      );
    }
  }
}

function normalizeKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = normalizedText(value)
    .replace(/\s+/gu, " ")
    .replace(/\s*minor$/u, "m")
    .replace(/\s*major$/u, "")
    .trim();

  if (KEY_ALIASES[normalized]) {
    return KEY_ALIASES[normalized];
  }

  const camelot = normalized.match(/^([0-9]{1,2})(a|b)$/u);
  if (camelot) {
    const number = Number(camelot[1]);
    if (number >= 1 && number <= 12) {
      return `${number}${camelot[2]}`;
    }
  }

  const note = normalized
    .replace(/[−–—]/gu, "-")
    .replace(/\s+/gu, "")
    .replace(/minor$/u, "m");

  if (/^[a-g](#|b)?m?$/u.test(note)) {
    return note;
  }

  return normalized || null;
}

function keyClass(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }

  const camelot = normalized.match(/^([0-9]{1,2})(a|b)$/u);
  if (camelot) {
    return Number(camelot[1]) - 1;
  }

  const minor = normalized.endsWith("m");
  const note = minor ? normalized.slice(0, -1) : normalized;
  return KEY_PITCH[note] ?? null;
}

function harmonicScore(
  first: LibraryTrackProfile,
  second: LibraryTrackProfile
): number {
  if (
    first.key === null ||
    second.key === null ||
    first.keyClass === null ||
    second.keyClass === null
  ) {
    return 0.5;
  }

  const firstCamelot = first.key.match(/^([0-9]{1,2})(a|b)$/u);
  const secondCamelot = second.key.match(/^([0-9]{1,2})(a|b)$/u);

  if (firstCamelot && secondCamelot) {
    const firstNumber = Number(firstCamelot[1]);
    const secondNumber = Number(secondCamelot[1]);
    const sameMode = firstCamelot[2] === secondCamelot[2];
    const distance = Math.min(
      Math.abs(firstNumber - secondNumber),
      12 - Math.abs(firstNumber - secondNumber)
    );

    if (distance === 0 && sameMode) return 1;
    if (distance === 1 && sameMode) return 0.92;
    if (distance === 0 && !sameMode) return 0.86;
    if (distance === 1 && !sameMode) return 0.78;
    return 0.35;
  }

  const distance = Math.min(
    Math.abs(first.keyClass - second.keyClass),
    12 - Math.abs(first.keyClass - second.keyClass)
  );

  if (distance === 0) return 1;
  if (distance === 1) return 0.9;
  if (distance === 5 || distance === 7) return 0.78;
  return 0.35;
}

function numericSimilarity(
  first: number | null,
  second: number | null,
  tolerance: number
): number {
  if (first === null || second === null) {
    return 0.5;
  }

  return clamp01(1 - Math.abs(first - second) / tolerance);
}

function bpmSimilarity(
  first: number | null,
  second: number | null
): number {
  if (first === null || second === null) {
    return 0.5;
  }

  const direct = Math.abs(first - second);
  const half = Math.abs(first - second * 2);
  const double = Math.abs(first * 2 - second);
  const distance = Math.min(direct, half, double);

  return clamp01(1 - distance / 12);
}

function stemCoverage(
  confidence: StemConfidence | null
): number {
  if (!confidence) {
    return 0;
  }

  const values = [
    confidence.vocals,
    confidence.drums,
    confidence.bass,
    confidence.other
  ];

  return values.filter((value) => value >= 0.5).length / 4;
}

function analysisCompleteness(
  analysis: LibraryTrackAnalysis
): number {
  const values = [
    analysis.bpm,
    analysis.key,
    analysis.energy,
    analysis.loudnessDb,
    analysis.durationSeconds,
    analysis.beatgridConfidence,
    analysis.stemConfidence,
    analysis.vocalActivity,
    analysis.instrumentalness
  ];

  return (
    values.filter(
      (value) => value !== null && value !== undefined
    ).length / values.length
  );
}

function profile(track: LibraryTrackRecord): LibraryTrackProfile {
  const searchableText = normalizedText(
    [
      track.id,
      track.title,
      track.artist,
      track.album ?? "",
      track.path,
      ...track.analysis.tags
    ].join(" ")
  );

  return {
    id: track.id,
    displayName: `${track.artist} — ${track.title}`,
    searchableText,
    bpm: track.analysis.bpm,
    key: normalizeKey(track.analysis.key),
    keyClass: keyClass(track.analysis.key),
    energy: track.analysis.energy,
    durationSeconds: track.analysis.durationSeconds,
    stemCoverage: stemCoverage(track.analysis.stemConfidence),
    analysisCompleteness: analysisCompleteness(track.analysis),
    vocalPresence: track.analysis.vocalActivity,
    instrumentalness: track.analysis.instrumentalness,
    tags: track.analysis.tags.map(normalizedText)
  };
}

function relationScore(
  first: LibraryTrackProfile,
  second: LibraryTrackProfile
): LibraryTrackRelation {
  const components: RelationComponents = {
    tempo: bpmSimilarity(first.bpm, second.bpm),
    harmonic: harmonicScore(first, second),
    energy: numericSimilarity(first.energy, second.energy, 1),
    vocals: numericSimilarity(
      first.vocalPresence,
      second.vocalPresence,
      1
    ),
    duration: numericSimilarity(
      first.durationSeconds,
      second.durationSeconds,
      180
    )
  };

  const score =
    components.tempo * 0.28 +
    components.harmonic * 0.32 +
    components.energy * 0.16 +
    components.vocals * 0.14 +
    components.duration * 0.10;

  return {
    sourceId: first.id,
    targetId: second.id,
    score: Math.round(score * 1000) / 1000,
    components
  };
}

function searchTextScore(
  query: string,
  profileValue: LibraryTrackProfile
): number {
  const tokens = normalizedText(query)
    .split(/\s+/u)
    .filter(Boolean);

  if (tokens.length === 0) {
    return 1;
  }

  let matched = 0;
  for (const token of tokens) {
    if (profileValue.searchableText.includes(token)) {
      matched += 1;
    }
  }

  return matched / tokens.length;
}

function matchesTag(
  requestedTag: string,
  profileTags: readonly string[]
): boolean {
  const wanted = normalizedText(requestedTag);
  if (!wanted) {
    return false;
  }

  return profileTags.some((tag) => {
    if (tag === wanted) {
      return true;
    }

    const tokens = tag
      .split(/[\s,;|/_-]+/u)
      .filter(Boolean);

    return (
      tag.includes(wanted) ||
      wanted.includes(tag) ||
      tokens.includes(wanted) ||
      tokens.some(
        (token) =>
          token.includes(wanted) || wanted.includes(token)
      )
    );
  });
}

function passesFilters(
  track: LibraryTrackRecord,
  profileValue: LibraryTrackProfile,
  filters: SmartLibrarySearchFilters | undefined
): boolean {
  if (!filters) {
    return true;
  }

  const bpm = profileValue.bpm;
  if (
    filters.bpmMin !== undefined &&
    (bpm === null || bpm < filters.bpmMin)
  ) {
    return false;
  }

  if (
    filters.bpmMax !== undefined &&
    (bpm === null || bpm > filters.bpmMax)
  ) {
    return false;
  }

  const energy = profileValue.energy;
  if (
    filters.energyMin !== undefined &&
    (energy === null || energy < filters.energyMin)
  ) {
    return false;
  }

  if (
    filters.energyMax !== undefined &&
    (energy === null || energy > filters.energyMax)
  ) {
    return false;
  }

  if (
    filters.key !== undefined &&
    profileValue.key !== normalizeKey(filters.key)
  ) {
    return false;
  }

  if (
    filters.tag !== undefined &&
    !matchesTag(filters.tag, profileValue.tags)
  ) {
    return false;
  }

  if (
    filters.vocalOnly &&
    (profileValue.vocalPresence === null ||
      profileValue.vocalPresence < 0.5)
  ) {
    return false;
  }

  if (
    filters.instrumentalOnly &&
    (profileValue.instrumentalness === null ||
      profileValue.instrumentalness < 0.5)
  ) {
    return false;
  }

  if (
    filters.minAnalysisCompleteness !== undefined &&
    profileValue.analysisCompleteness <
      filters.minAnalysisCompleteness
  ) {
    return false;
  }

  void track;
  return true;
}

export class SmartLibraryService {
  private readonly tracks = new Map<string, LibraryTrackRecord>();
  private readonly profiles = new Map<string, LibraryTrackProfile>();

  upsert(track: LibraryTrackRecord): void {
    validateTrack(track);
    this.tracks.set(track.id, structuredClone(track));
    this.profiles.set(track.id, profile(track));
  }

  add(track: LibraryTrackRecord): void {
    validateTrack(track);

    if (this.tracks.has(track.id)) {
      throw new SmartLibraryError(
        "DUPLICATE_TRACK",
        `El track ya existe: ${track.id}.`
      );
    }

    this.tracks.set(track.id, structuredClone(track));
    this.profiles.set(track.id, profile(track));
  }

  remove(trackId: string): boolean {
    this.profiles.delete(trackId);
    return this.tracks.delete(trackId);
  }

  clear(): void {
    this.tracks.clear();
    this.profiles.clear();
  }

  get(trackId: string): LibraryTrackRecord | null {
    const track = this.tracks.get(trackId);
    return track ? structuredClone(track) : null;
  }

  profile(trackId: string): LibraryTrackProfile | null {
    const value = this.profiles.get(trackId);
    return value ? structuredClone(value) : null;
  }

  search(
    query = "",
    options: SmartLibrarySearchOptions = {}
  ): readonly SmartLibrarySearchResult[] {
    if (
      options.limit !== undefined &&
      (!Number.isInteger(options.limit) || options.limit < 1)
    ) {
      throw new SmartLibraryError(
        "INVALID_QUERY",
        "El límite de búsqueda debe ser un entero positivo."
      );
    }

    if (
      options.minScore !== undefined &&
      (!Number.isFinite(options.minScore) ||
        options.minScore < 0 ||
        options.minScore > 1)
    ) {
      throw new SmartLibraryError(
        "INVALID_QUERY",
        "minScore debe estar entre 0 y 1."
      );
    }

    const rows: SmartLibrarySearchResult[] = [];

    for (const track of this.tracks.values()) {
      const trackProfile = this.profiles.get(track.id);
      if (!trackProfile) {
        continue;
      }

      if (!passesFilters(track, trackProfile, options.filters)) {
        continue;
      }

      const score = searchTextScore(query, trackProfile);

      if (
        options.minScore !== undefined &&
        score < options.minScore
      ) {
        continue;
      }

      rows.push({
        track: structuredClone(track),
        profile: structuredClone(trackProfile),
        score: Math.round(score * 1000) / 1000
      });
    }

    rows.sort(
      (a, b) =>
        b.score - a.score ||
        a.profile.displayName.localeCompare(
          b.profile.displayName,
          "es-CO"
        )
    );

    return rows.slice(0, options.limit ?? 50);
  }

  classify(trackId: string): LibraryClassification {
    const track = this.tracks.get(trackId);
    if (!track) {
      throw new SmartLibraryError(
        "INVALID_TRACK",
        `Track desconocido: ${trackId}.`
      );
    }

    const tags = track.analysis.tags.map(normalizedText);
    const energy = track.analysis.energy ?? 0.5;
    const bpm = track.analysis.bpm ?? 120;
    const vocal = track.analysis.vocalActivity ?? 0.5;
    const instrumental =
      track.analysis.instrumentalness ?? 1 - vocal;

    const labels = new Set<string>();

    if (bpm >= 124 && energy >= 0.65) {
      labels.add("Alta energía");
    } else if (energy <= 0.35) {
      labels.add("Baja energía");
    } else {
      labels.add("Energía media");
    }

    if (vocal >= 0.65) {
      labels.add("Vocal");
    }

    if (instrumental >= 0.65) {
      labels.add("Instrumental");
    }

    const tagHint =
      tags.find((tag) =>
        [
          "house",
          "techno",
          "trance",
          "disco",
          "reggaeton",
          "rap",
          "pop"
        ].includes(tag)
      ) ?? null;

    if (tagHint) {
      labels.add(tagHint);
    }

    const primary =
      tagHint ??
      (bpm >= 128 && energy >= 0.7
        ? "Club"
        : vocal >= 0.65
          ? "Vocal"
          : instrumental >= 0.65
            ? "Instrumental"
            : "General");

    const confidence = clamp01(
      0.45 +
        analysisCompleteness(track.analysis) * 0.35 +
        (tagHint ? 0.2 : 0)
    );

    return {
      primary,
      labels: [...labels].sort((a, b) =>
        a.localeCompare(b, "es-CO")
      ),
      confidence: Math.round(confidence * 1000) / 1000
    };
  }

  relate(
    sourceId: string,
    targetId: string
  ): LibraryTrackRelation {
    const source = this.profiles.get(sourceId);
    const target = this.profiles.get(targetId);

    if (!source || !target) {
      throw new SmartLibraryError(
        "INVALID_TRACK",
        "No se pueden relacionar tracks inexistentes."
      );
    }

    return relationScore(source, target);
  }

  related(
    sourceId: string,
    limit = 10
  ): readonly LibraryTrackRelation[] {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new SmartLibraryError(
        "INVALID_QUERY",
        "El límite de relaciones debe ser un entero positivo."
      );
    }

    const source = this.profiles.get(sourceId);
    if (!source) {
      throw new SmartLibraryError(
        "INVALID_TRACK",
        `Track desconocido: ${sourceId}.`
      );
    }

    return [...this.profiles.values()]
      .filter((candidate) => candidate.id !== sourceId)
      .map((candidate) => relationScore(source, candidate))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.targetId.localeCompare(b.targetId)
      )
      .slice(0, limit);
  }

  summarize(): SmartLibrarySummary {
    const values = [...this.tracks.values()];
    const bpms = values
      .map((track) => track.analysis.bpm)
      .filter((value): value is number => value !== null);
    const energies = values
      .map((track) => track.analysis.energy)
      .filter((value): value is number => value !== null);

    return {
      tracks: values.length,
      analyzed: values.filter(
        (track) =>
          analysisCompleteness(track.analysis) >= 0.5
      ).length,
      withKeys: values.filter(
        (track) => track.analysis.key !== null
      ).length,
      withBpm: bpms.length,
      withStems: values.filter(
        (track) => track.analysis.stemConfidence !== null
      ).length,
      averageBpm:
        bpms.length > 0
          ? Math.round(
              (bpms.reduce((a, b) => a + b, 0) /
                bpms.length) *
                100
            ) / 100
          : null,
      averageEnergy:
        energies.length > 0
          ? Math.round(
              (energies.reduce((a, b) => a + b, 0) /
                energies.length) *
                100
            ) / 100
          : null
    };
  }

  snapshot(): readonly LibraryTrackRecord[] {
    return [...this.tracks.values()].map((track) =>
      structuredClone(track)
    );
  }
}
