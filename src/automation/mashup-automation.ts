import type {
  LibraryTrackRecord,
  LibraryTrackRelation,
  SmartLibraryService,
  SmartLibrarySearchResult
} from "../library/intelligence.js";

export type AutomationTrigger =
  | "library-updated"
  | "manual"
  | "scheduled";

export type AutomationAction =
  | "discover"
  | "prepare"
  | "render"
  | "export";

export type AutomationRunStatus =
  | "planned"
  | "skipped"
  | "completed"
  | "failed";

export interface MashupAutomationRule {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly trigger: AutomationTrigger;
  readonly actions: readonly AutomationAction[];
  readonly minCompatibilityScore: number;
  readonly minAnalysisCompleteness: number;
  readonly maxCandidates: number;
  readonly cooldownMs: number;
  readonly requireDifferentTracks: boolean;
}

export interface MashupAutomationContext {
  readonly nowMs: number;
  readonly libraryRevision: string;
  readonly tracks: readonly LibraryTrackRecord[];
}

export interface MashupAutomationCandidate {
  readonly baseTrackId: string;
  readonly secondaryTrackId: string;
  readonly compatibility: LibraryTrackRelation;
  readonly reason: string;
}

export interface MashupAutomationPlan {
  readonly schemaVersion: 1;
  readonly ruleId: string;
  readonly libraryRevision: string;
  readonly createdAtMs: number;
  readonly trigger: AutomationTrigger;
  readonly candidates: readonly MashupAutomationCandidate[];
  readonly actions: readonly AutomationAction[];
}

export interface MashupAutomationRun {
  readonly runId: string;
  readonly ruleId: string;
  readonly startedAtMs: number;
  readonly finishedAtMs: number | null;
  readonly status: AutomationRunStatus;
  readonly trigger: AutomationTrigger;
  readonly plan: MashupAutomationPlan;
  readonly error: string | null;
}

export interface MashupAutomationDecision {
  readonly status: "ready" | "cooldown" | "disabled" | "no-candidates";
  readonly nextEligibleAtMs: number | null;
  readonly plan: MashupAutomationPlan | null;
  readonly reason: string;
}

export class MashupAutomationError extends Error {
  readonly code:
    | "INVALID_RULE"
    | "INVALID_CONTEXT"
    | "INVALID_ACTION"
    | "UNKNOWN_RULE"
    | "INVALID_RUN";

  constructor(
    code: MashupAutomationError["code"],
    message: string
  ) {
    super(message);
    this.name = "MashupAutomationError";
    this.code = code;
  }
}

const ACTION_ORDER: readonly AutomationAction[] = [
  "discover",
  "prepare",
  "render",
  "export"
];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function uniqueActions(
  actions: readonly AutomationAction[]
): readonly AutomationAction[] {
  const known = new Set<AutomationAction>();
  const result: AutomationAction[] = [];

  for (const action of actions) {
    if (!ACTION_ORDER.includes(action)) {
      throw new MashupAutomationError(
        "INVALID_ACTION",
        `Acción de automatización desconocida: ${action}.`
      );
    }

    if (!known.has(action)) {
      known.add(action);
      result.push(action);
    }
  }

  return [...result].sort(
    (a, b) =>
      ACTION_ORDER.indexOf(a) -
      ACTION_ORDER.indexOf(b)
  );
}

function validateRule(rule: MashupAutomationRule): void {
  if (!rule.id.trim() || !rule.name.trim()) {
    throw new MashupAutomationError(
      "INVALID_RULE",
      "id y name son obligatorios."
    );
  }

  if (!rule.actions.length) {
    throw new MashupAutomationError(
      "INVALID_RULE",
      "La regla debe contener al menos una acción."
    );
  }

  uniqueActions(rule.actions);

  if (
    !Number.isFinite(rule.minCompatibilityScore) ||
    rule.minCompatibilityScore < 0 ||
    rule.minCompatibilityScore > 1
  ) {
    throw new MashupAutomationError(
      "INVALID_RULE",
      "minCompatibilityScore debe estar entre 0 y 1."
    );
  }

  if (
    !Number.isFinite(rule.minAnalysisCompleteness) ||
    rule.minAnalysisCompleteness < 0 ||
    rule.minAnalysisCompleteness > 1
  ) {
    throw new MashupAutomationError(
      "INVALID_RULE",
      "minAnalysisCompleteness debe estar entre 0 y 1."
    );
  }

  if (
    !Number.isInteger(rule.maxCandidates) ||
    rule.maxCandidates < 1 ||
    rule.maxCandidates > 1000
  ) {
    throw new MashupAutomationError(
      "INVALID_RULE",
      "maxCandidates debe ser un entero entre 1 y 1000."
    );
  }

  if (
    !Number.isFinite(rule.cooldownMs) ||
    rule.cooldownMs < 0
  ) {
    throw new MashupAutomationError(
      "INVALID_RULE",
      "cooldownMs no puede ser negativo."
    );
  }
}

function validateContext(
  context: MashupAutomationContext
): void {
  if (
    !Number.isFinite(context.nowMs) ||
    context.nowMs < 0
  ) {
    throw new MashupAutomationError(
      "INVALID_CONTEXT",
      "nowMs no es válido."
    );
  }

  if (!context.libraryRevision.trim()) {
    throw new MashupAutomationError(
      "INVALID_CONTEXT",
      "libraryRevision es obligatorio."
    );
  }

  const ids = new Set<string>();

  for (const track of context.tracks) {
    if (!track.id.trim() || ids.has(track.id)) {
      throw new MashupAutomationError(
        "INVALID_CONTEXT",
        "La biblioteca contiene IDs inválidos o duplicados."
      );
    }

    ids.add(track.id);
  }
}

function deterministicRunId(
  ruleId: string,
  libraryRevision: string,
  nowMs: number
): string {
  const seed = `${ruleId}:${libraryRevision}:${nowMs}`;
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `run-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function candidateReason(
  relation: LibraryTrackRelation
): string {
  const components = [
    `tempo ${Math.round(relation.components.tempo * 100)}%`,
    `armonía ${Math.round(
      relation.components.harmonic * 100
    )}%`,
    `energía ${Math.round(
      relation.components.energy * 100
    )}%`,
    `voces ${Math.round(
      relation.components.vocals * 100
    )}%`
  ];

  return `Compatibilidad ${Math.round(
    relation.score * 100
  )}% · ${components.join(" · ")}`;
}

export class MashupAutomationService {
  private readonly rules = new Map<
    string,
    MashupAutomationRule
  >();

  private readonly runs = new Map<
    string,
    MashupAutomationRun
  >();

  constructor(
    private readonly library: SmartLibraryService
  ) {}

  addRule(rule: MashupAutomationRule): void {
    validateRule(rule);

    if (this.rules.has(rule.id)) {
      throw new MashupAutomationError(
        "INVALID_RULE",
        `La regla ya existe: ${rule.id}.`
      );
    }

    this.rules.set(rule.id, structuredClone(rule));
  }

  upsertRule(rule: MashupAutomationRule): void {
    validateRule(rule);
    this.rules.set(rule.id, structuredClone(rule));
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): MashupAutomationRule | null {
    const rule = this.rules.get(ruleId);
    return rule ? structuredClone(rule) : null;
  }

  listRules(): readonly MashupAutomationRule[] {
    return [...this.rules.values()]
      .map((rule) => structuredClone(rule))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "es-CO")
      );
  }

  listRuns(): readonly MashupAutomationRun[] {
    return [...this.runs.values()]
      .map((run) => structuredClone(run))
      .sort((a, b) => b.startedAtMs - a.startedAtMs);
  }

  private requireRule(
    ruleId: string
  ): MashupAutomationRule {
    const rule = this.rules.get(ruleId);

    if (!rule) {
      throw new MashupAutomationError(
        "UNKNOWN_RULE",
        `Regla desconocida: ${ruleId}.`
      );
    }

    return rule;
  }

  private findCandidates(
    rule: MashupAutomationRule,
    context: MashupAutomationContext
  ): readonly MashupAutomationCandidate[] {
    const tracks = context.tracks;

    const complete = tracks.filter((track) => {
      const profile = this.library.profile(track.id);
      return (
        profile !== null &&
        profile.analysisCompleteness >=
          rule.minAnalysisCompleteness
      );
    });

    const candidates: MashupAutomationCandidate[] = [];

    for (const base of complete) {
      const relations = this.library.related(
        base.id,
        Math.max(complete.length - 1, 1)
      );

      for (const relation of relations) {
        if (
          relation.score <
          rule.minCompatibilityScore
        ) {
          continue;
        }

        if (
          rule.requireDifferentTracks &&
          relation.sourceId === relation.targetId
        ) {
          continue;
        }

        if (
          !complete.some(
            (track) => track.id === relation.targetId
          )
        ) {
          continue;
        }

        candidates.push({
          baseTrackId: relation.sourceId,
          secondaryTrackId: relation.targetId,
          compatibility: relation,
          reason: candidateReason(relation)
        });
      }
    }

    candidates.sort(
      (a, b) =>
        b.compatibility.score -
          a.compatibility.score ||
        a.baseTrackId.localeCompare(
          b.baseTrackId
        ) ||
        a.secondaryTrackId.localeCompare(
          b.secondaryTrackId
        )
    );

    const seen = new Set<string>();
    const unique: MashupAutomationCandidate[] = [];

    for (const candidate of candidates) {
      const key = `${candidate.baseTrackId}:${candidate.secondaryTrackId}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(candidate);

      if (unique.length >= rule.maxCandidates) {
        break;
      }
    }

    return unique;
  }

  plan(
    ruleId: string,
    context: MashupAutomationContext
  ): MashupAutomationPlan {
    const rule = this.requireRule(ruleId);

    validateContext(context);

    if (!rule.enabled) {
      throw new MashupAutomationError(
        "INVALID_RULE",
        `La regla está deshabilitada: ${rule.id}.`
      );
    }

    if (rule.trigger !== contextTrigger(context)) {
      // A context can be generated for manual or scheduled runs.
      // Trigger validation remains explicit through decide().
    }

    const candidates = this.findCandidates(
      rule,
      context
    );

    return {
      schemaVersion: 1,
      ruleId: rule.id,
      libraryRevision: context.libraryRevision,
      createdAtMs: context.nowMs,
      trigger: rule.trigger,
      candidates: structuredClone(candidates),
      actions: uniqueActions(rule.actions)
    };
  }

  decide(
    ruleId: string,
    context: MashupAutomationContext
  ): MashupAutomationDecision {
    const rule = this.requireRule(ruleId);

    validateContext(context);

    if (!rule.enabled) {
      return {
        status: "disabled",
        nextEligibleAtMs: null,
        plan: null,
        reason: "La regla está deshabilitada."
      };
    }

    const latestRun = this.listRuns().find(
      (run) =>
        run.ruleId === rule.id &&
        run.status === "completed"
    );

    if (latestRun) {
      const nextEligibleAtMs =
        latestRun.startedAtMs + rule.cooldownMs;

      if (context.nowMs < nextEligibleAtMs) {
        return {
          status: "cooldown",
          nextEligibleAtMs,
          plan: null,
          reason: "La regla está en periodo de cooldown."
        };
      }
    }

    const plan = this.plan(ruleId, context);

    if (!plan.candidates.length) {
      return {
        status: "no-candidates",
        nextEligibleAtMs: null,
        plan,
        reason:
          "No hay candidatos que cumplan los criterios de automatización."
      };
    }

    return {
      status: "ready",
      nextEligibleAtMs: null,
      plan,
      reason:
        "Hay candidatos compatibles y la automatización puede ejecutarse."
    };
  }

  startRun(
    decision: MashupAutomationDecision
  ): MashupAutomationRun {
    if (
      decision.status !== "ready" ||
      decision.plan === null
    ) {
      throw new MashupAutomationError(
        "INVALID_RUN",
        "Solo se puede iniciar una ejecución con decisión ready."
      );
    }

    const runId = deterministicRunId(
      decision.plan.ruleId,
      decision.plan.libraryRevision,
      decision.plan.createdAtMs
    );

    const run: MashupAutomationRun = {
      runId,
      ruleId: decision.plan.ruleId,
      startedAtMs: decision.plan.createdAtMs,
      finishedAtMs: null,
      status: "planned",
      trigger: decision.plan.trigger,
      plan: structuredClone(decision.plan),
      error: null
    };

    this.runs.set(runId, run);
    return structuredClone(run);
  }

  completeRun(
    runId: string,
    finishedAtMs: number
  ): MashupAutomationRun {
    const run = this.requireRun(runId);

    if (
      !Number.isFinite(finishedAtMs) ||
      finishedAtMs < run.startedAtMs
    ) {
      throw new MashupAutomationError(
        "INVALID_RUN",
        "finishedAtMs no es válido."
      );
    }

    const completed: MashupAutomationRun = {
      ...run,
      status: "completed",
      finishedAtMs,
      error: null
    };

    this.runs.set(runId, completed);

    return structuredClone(completed);
  }

  failRun(
    runId: string,
    finishedAtMs: number,
    error: string
  ): MashupAutomationRun {
    const run = this.requireRun(runId);

    if (
      !Number.isFinite(finishedAtMs) ||
      finishedAtMs < run.startedAtMs ||
      !error.trim()
    ) {
      throw new MashupAutomationError(
        "INVALID_RUN",
        "Los datos de fallo de ejecución no son válidos."
      );
    }

    const failed: MashupAutomationRun = {
      ...run,
      status: "failed",
      finishedAtMs,
      error: error.trim()
    };

    this.runs.set(runId, failed);

    return structuredClone(failed);
  }

  skipRun(
    runId: string,
    finishedAtMs: number,
    reason: string
  ): MashupAutomationRun {
    const run = this.requireRun(runId);

    if (
      !Number.isFinite(finishedAtMs) ||
      finishedAtMs < run.startedAtMs ||
      !reason.trim()
    ) {
      throw new MashupAutomationError(
        "INVALID_RUN",
        "Los datos de ejecución omitida no son válidos."
      );
    }

    const skipped: MashupAutomationRun = {
      ...run,
      status: "skipped",
      finishedAtMs,
      error: reason.trim()
    };

    this.runs.set(runId, skipped);

    return structuredClone(skipped);
  }

  private requireRun(
    runId: string
  ): MashupAutomationRun {
    const run = this.runs.get(runId);

    if (!run) {
      throw new MashupAutomationError(
        "INVALID_RUN",
        `Ejecución desconocida: ${runId}.`
      );
    }

    return run;
  }
}

function contextTrigger(
  context: MashupAutomationContext
): AutomationTrigger {
  return context.libraryRevision.startsWith("manual:")
    ? "manual"
    : "library-updated";
}

export function createDefaultMashupAutomationRule(): MashupAutomationRule {
  return {
    id: "auto-strong-mashups",
    name: "Mashups compatibles fuertes",
    enabled: true,
    trigger: "library-updated",
    actions: [
      "discover",
      "prepare"
    ],
    minCompatibilityScore: 0.78,
    minAnalysisCompleteness: 0.75,
    maxCandidates: 10,
    cooldownMs: 15 * 60 * 1000,
    requireDifferentTracks: true
  };
}

export function automationSearchPreview(
  library: SmartLibraryService,
  query: string
): readonly SmartLibrarySearchResult[] {
  return library.search(query, {
    limit: 20,
    minScore: 0.5
  });
}

export function normalizeAutomationScore(
  score: number
): number {
  return Math.round(clamp01(score) * 1000) / 1000;
}
