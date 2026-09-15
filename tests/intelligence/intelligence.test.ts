import { describe, expect, it } from "vitest";

import {
  SmartLibraryError,
  SmartLibraryService,
  type LibraryTrackRecord
} from "../../src/library/intelligence.js";

function track(
  id: string,
  overrides: Partial<LibraryTrackRecord> = {}
): LibraryTrackRecord {
  return {
    id,
    path: `/music/${id}.mp3`,
    title:
      id === "a"
        ? "Midnight Vocals"
        : id === "b"
          ? "Sunrise Club"
          : "Ambient Cut",
    artist:
      id === "a"
        ? "Artist A"
        : id === "b"
          ? "Artist B"
          : "Artist C",
    album: "QDEV Test",
    analysis: {
      bpm: id === "a" ? 128 : id === "b" ? 126 : 95,
      key: id === "a" ? "8A" : id === "b" ? "9A" : "C",
      energy: id === "a" ? 0.82 : id === "b" ? 0.76 : 0.28,
      loudnessDb: -8,
      durationSeconds: id === "a" ? 210 : 205,
      beatgridConfidence: 0.95,
      stemConfidence: {
        vocals: id === "a" ? 0.98 : 0.2,
        drums: 0.96,
        bass: 0.94,
        other: 0.9
      },
      vocalActivity:
        id === "a" ? 0.9 : id === "b" ? 0.65 : 0.05,
      instrumentalness:
        id === "a" ? 0.1 : id === "b" ? 0.25 : 0.95,
      tags:
        id === "a"
          ? ["house", "vocal"]
          : id === "b"
            ? ["house"]
            : ["ambient"]
    },
    ...overrides
  };
}

describe("SmartLibraryService", () => {
  it("indexa y resume la biblioteca", () => {
    const service = new SmartLibraryService();

    service.add(track("a"));
    service.add(track("b"));
    service.add(track("c"));

    const summary = service.summarize();

    expect(summary.tracks).toBe(3);
    expect(summary.analyzed).toBe(3);
    expect(summary.withKeys).toBe(3);
    expect(summary.withBpm).toBe(3);
    expect(summary.withStems).toBe(3);
    expect(summary.averageBpm).toBe(116.33);
  });

  it("rechaza IDs duplicados", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));

    expect(() => service.add(track("a"))).toThrowError(
      SmartLibraryError
    );
  });

  it("realiza búsqueda textual con normalización", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));
    service.add(track("b"));
    service.add(track("c"));

    const result = service.search("MIDNIGHT VOCALS");

    expect(result[0]?.track.id).toBe("a");
    expect(result[0]?.score).toBe(1);
  });

  it("aplica filtros avanzados de BPM, energía, vocal y etiqueta", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));
    service.add(track("b"));
    service.add(track("c"));

    const result = service.search("", {
      filters: {
        bpmMin: 120,
        bpmMax: 130,
        energyMin: 0.7,
        vocalOnly: true,
        tag: "vocal"
      }
    });

    expect(result.map((item) => item.track.id)).toEqual(["a"]);
  });

  it("calcula relaciones musicales con score reproducible", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));
    service.add(track("b"));
    service.add(track("c"));

    const relation = service.relate("a", "b");

    expect(relation.score).toBeGreaterThan(0.7);
    expect(relation.components.tempo).toBeGreaterThan(0.8);
    expect(relation.components.harmonic).toBeGreaterThan(0.8);
  });

  it("ordena relaciones y excluye el origen", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));
    service.add(track("b"));
    service.add(track("c"));

    const result = service.related("a", 2);

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.sourceId === "a")).toBe(
      true
    );
    expect(result.every((item) => item.targetId !== "a")).toBe(
      true
    );
    expect(result[0]?.score).toBeGreaterThanOrEqual(
      result[1]?.score ?? 0
    );
  });

  it("clasifica a partir de análisis y etiquetas sin depender de un modelo externo", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));

    const classification = service.classify("a");

    expect(classification.primary).toBe("house");
    expect(classification.labels).toContain("Vocal");
    expect(classification.labels).toContain("Alta energía");
    expect(classification.confidence).toBeGreaterThan(0.7);
  });

  it("protege el estado devolviendo una copia profunda", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));

    const value = service.get("a");

    expect(value).not.toBeNull();
    expect(value).not.toBe(service.get("a"));

    const copy = value as LibraryTrackRecord;
    expect(copy.analysis).not.toBe(
      service.get("a")?.analysis
    );
    expect(copy.analysis.tags).not.toBe(
      service.get("a")?.analysis.tags
    );
    expect(copy.title).toBe("Midnight Vocals");
  });

  it("actualiza perfiles mediante upsert", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));

    service.upsert(
      track("a", {
        title: "Nuevo Título",
        analysis: {
          ...track("a").analysis,
          bpm: 130
        }
      })
    );

    expect(service.get("a")?.title).toBe("Nuevo Título");
    expect(service.profile("a")?.bpm).toBe(130);
  });

  it("elimina correctamente", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));

    expect(service.remove("a")).toBe(true);
    expect(service.get("a")).toBeNull();
    expect(service.remove("a")).toBe(false);
  });

  it("valida valores de análisis", () => {
    const service = new SmartLibraryService();

    expect(() =>
      service.add(
        track("bad", {
          analysis: {
            ...track("a").analysis,
            energy: 1.5
          }
        })
      )
    ).toThrowError(/Energía debe estar entre 0 y 1/);
  });

  it("aplica límite y score mínimo", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));
    service.add(track("b"));
    service.add(track("c"));

    const result = service.search("house", {
      limit: 1,
      minScore: 1
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.profile.tags).toContain("house");
  });

  it("permite recuperar un snapshot aislado", () => {
    const service = new SmartLibraryService();
    service.add(track("a"));
    service.add(track("b"));

    const snapshot = service.snapshot();

    expect(snapshot).toHaveLength(2);
    expect(snapshot.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
