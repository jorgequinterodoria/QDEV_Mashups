import { describe, expect, it } from "vitest";

import {
  SmartLibraryService,
  type LibraryTrackRecord
} from "../../src/library/intelligence.js";
import {
  MashupAutomationError,
  MashupAutomationService,
  createDefaultMashupAutomationRule
} from "../../src/automation/index.js";

function track(
  id: string,
  bpm: number,
  key: string,
  energy: number
): LibraryTrackRecord {
  return {
    id,
    path: `/music/${id}.mp3`,
    title: `Track ${id}`,
    artist: `Artist ${id}`,
    analysis: {
      bpm,
      key,
      energy,
      loudnessDb: -8,
      durationSeconds: 210,
      beatgridConfidence: 0.95,
      stemConfidence: {
        vocals: 0.95,
        drums: 0.95,
        bass: 0.95,
        other: 0.95
      },
      vocalActivity: 0.6,
      instrumentalness: 0.2,
      tags: ["house"]
    }
  };
}

function library(): SmartLibraryService {
  const service = new SmartLibraryService();

  service.add(track("a", 128, "8A", 0.82));
  service.add(track("b", 127, "9A", 0.8));
  service.add(track("c", 95, "2C", 0.2));

  return service;
}

describe("MashupAutomationService", () => {
  it("crea una regla predeterminada válida", () => {
    const rule = createDefaultMashupAutomationRule();

    expect(rule.id).toBe("auto-strong-mashups");
    expect(rule.actions).toEqual(["discover", "prepare"]);
    expect(rule.minCompatibilityScore).toBe(0.78);
  });

  it("genera un plan con candidatos compatibles", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule(
      createDefaultMashupAutomationRule()
    );

    const decision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 1_000,
        libraryRevision: "rev-001",
        tracks: library().snapshot()
      }
    );

    expect(decision.status).toBe("ready");
    expect(decision.plan?.schemaVersion).toBe(1);
    expect(decision.plan?.actions).toEqual([
      "discover",
      "prepare"
    ]);
    expect(decision.plan?.candidates.length).toBeGreaterThan(
      0
    );
    expect(
      decision.plan?.candidates[0]?.compatibility.score
    ).toBeGreaterThanOrEqual(0.78);
  });

  it("aplica la completitud mínima antes de crear candidatos", () => {
    const low = library();
    low.upsert({
      ...track("a", 128, "8A", 0.82),
      analysis: {
        ...track("a", 128, "8A", 0.82).analysis,
        key: null,
        beatgridConfidence: null,
        vocalActivity: null,
        instrumentalness: null
      }
    });

    const service = new MashupAutomationService(low);
    service.addRule(
      createDefaultMashupAutomationRule()
    );

    const decision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 1_000,
        libraryRevision: "rev-002",
        tracks: low.snapshot()
      }
    );

    expect(
      decision.plan?.candidates.every(
        (candidate) =>
          candidate.baseTrackId !== "a" &&
          candidate.secondaryTrackId !== "a"
      )
    ).toBe(true);
  });

  it("limita el número de candidatos", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule({
      ...createDefaultMashupAutomationRule(),
      id: "limited",
      name: "Limitada",
      maxCandidates: 1
    });

    const decision = service.decide(
      "limited",
      {
        nowMs: 1_000,
        libraryRevision: "rev-003",
        tracks: library().snapshot()
      }
    );

    expect(decision.plan?.candidates).toHaveLength(1);
  });

  it("bloquea una regla deshabilitada", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule({
      ...createDefaultMashupAutomationRule(),
      enabled: false
    });

    const decision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 1_000,
        libraryRevision: "rev-004",
        tracks: library().snapshot()
      }
    );

    expect(decision.status).toBe("disabled");
  });

  it("registra ciclo planned → completed", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule(
      createDefaultMashupAutomationRule()
    );

    const decision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 2_000,
        libraryRevision: "rev-005",
        tracks: library().snapshot()
      }
    );

    const run = service.startRun(decision);
    const completed = service.completeRun(
      run.runId,
      3_000
    );

    expect(run.status).toBe("planned");
    expect(completed.status).toBe("completed");
    expect(completed.finishedAtMs).toBe(3_000);
    expect(completed.error).toBeNull();
  });

  it("aplica cooldown tras una ejecución completada", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule(
      createDefaultMashupAutomationRule()
    );

    const firstDecision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 10_000,
        libraryRevision: "rev-006",
        tracks: library().snapshot()
      }
    );

    const run = service.startRun(firstDecision);
    service.completeRun(run.runId, 11_000);

    const secondDecision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 12_000,
        libraryRevision: "rev-007",
        tracks: library().snapshot()
      }
    );

    expect(secondDecision.status).toBe("cooldown");
    expect(secondDecision.nextEligibleAtMs).toBe(
      10_000 + 15 * 60 * 1000
    );
  });

  it("permite volver a ejecutar después del cooldown", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule({
      ...createDefaultMashupAutomationRule(),
      cooldownMs: 1_000
    });

    const firstDecision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 10_000,
        libraryRevision: "rev-008",
        tracks: library().snapshot()
      }
    );

    const run = service.startRun(firstDecision);
    service.completeRun(run.runId, 10_100);

    const next = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 11_001,
        libraryRevision: "rev-009",
        tracks: library().snapshot()
      }
    );

    expect(next.status).toBe("ready");
  });

  it("registra fallos y no los trata como éxitos", () => {
    const service = new MashupAutomationService(
      library()
    );

    service.addRule(
      createDefaultMashupAutomationRule()
    );

    const decision = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 20_000,
        libraryRevision: "rev-010",
        tracks: library().snapshot()
      }
    );

    const run = service.startRun(decision);
    const failed = service.failRun(
      run.runId,
      21_000,
      "Renderer no disponible."
    );

    expect(failed.status).toBe("failed");
    expect(failed.error).toBe(
      "Renderer no disponible."
    );

    const next = service.decide(
      "auto-strong-mashups",
      {
        nowMs: 21_001,
        libraryRevision: "rev-011",
        tracks: library().snapshot()
      }
    );

    expect(next.status).toBe("ready");
  });

  it("rechaza reglas inválidas", () => {
    const service = new MashupAutomationService(
      library()
    );

    expect(() =>
      service.addRule({
        ...createDefaultMashupAutomationRule(),
        id: "invalid",
        minCompatibilityScore: 2
      })
    ).toThrowError(MashupAutomationError);
  });

  it("devuelve copias aisladas de reglas y ejecuciones", () => {
    const service = new MashupAutomationService(
      library()
    );

    const rule = createDefaultMashupAutomationRule();
    service.addRule(rule);

    const stored = service.getRule(rule.id);

    expect(stored).not.toBe(rule);
    expect(stored?.actions).not.toBe(rule.actions);
    expect(service.listRuns()).toHaveLength(0);
  });
});
