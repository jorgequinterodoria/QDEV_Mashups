import { describe, expect, it } from "vitest";

import {
  PerformanceCache,
  PerformanceError,
  PerformanceProfiler,
  runBatched
} from "../../src/performance/index.js";

describe("PerformanceCache", () => {
  it("mantiene MRU y expulsa la entrada menos recientemente usada", () => {
    const cache = new PerformanceCache<string, number>({
      maxEntries: 2
    });

    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);

    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeNull();
    expect(cache.get("c")).toBe(3);
    expect(cache.stats().evictions).toBe(1);
  });

  it("soporta TTL controlado por reloj", () => {
    let now = 1_000;

    const cache = new PerformanceCache<string, string>({
      ttlMs: 100,
      now: () => now
    });

    cache.set("x", "ok");
    expect(cache.get("x")).toBe("ok");

    now += 101;

    expect(cache.get("x")).toBeNull();
    expect(cache.pruneExpired()).toBe(0);
  });

  it("calcula hit rate y métricas de uso", () => {
    const cache = new PerformanceCache<string, number>({
      maxEntries: 4
    });

    cache.set("x", 42);
    expect(cache.get("x")).toBe(42);
    expect(cache.get("missing")).toBeNull();

    expect(cache.stats()).toMatchObject({
      size: 1,
      hits: 1,
      misses: 1,
      hitRate: 0.5
    });
  });

  it("rechaza opciones inválidas", () => {
    expect(
      () =>
        new PerformanceCache({
          maxEntries: 0
        })
    ).toThrowError(PerformanceError);

    expect(
      () =>
        new PerformanceCache({
          ttlMs: 0
        })
    ).toThrowError(PerformanceError);
  });

  it("no expone referencias mutables del snapshot de la caché", () => {
    const cache = new PerformanceCache<
      string,
      { value: number }
    >();

    cache.set("x", { value: 1 });

    const snapshot = cache.entriesSnapshot();

    expect(snapshot[0]?.[1]).not.toBeUndefined();
    expect(snapshot[0]?.[1]).not.toBe(
      cache.entriesSnapshot()[0]?.[1]
    );
  });
});

describe("PerformanceProfiler", () => {
  it("agrupa métricas y calcula estadísticas", () => {
    let now = 0;

    const profiler = new PerformanceProfiler(() => now);

    profiler.measure("scan", () => {
      now += 10;
      return true;
    });

    profiler.measure("scan", () => {
      now += 20;
      return true;
    });

    profiler.measure("render", () => {
      now += 100;
      return true;
    });

    const aggregate = profiler.aggregate();

    expect(aggregate).toHaveLength(2);
    expect(aggregate[0]?.name).toBe("render");
    expect(aggregate[0]?.totalMs).toBe(100);
    expect(aggregate[1]?.averageMs).toBe(15);
    expect(aggregate[1]?.p95Ms).toBe(20);
  });

  it("soporta mediciones asíncronas", async () => {
    let now = 500;

    const profiler = new PerformanceProfiler(() => now);

    const result = await profiler.measureAsync(
      "async-task",
      async () => {
        now += 25;
        return "done";
      }
    );

    expect(result).toBe("done");
    expect(
      profiler.aggregate("async-task")[0]?.totalMs
    ).toBe(25);
  });

  it("registra la medición y preserva el error de una operación síncrona", () => {
    let now = 0;

    const profiler = new PerformanceProfiler(() => now);

    expect(() =>
      profiler.measure("failing", () => {
        now += 7;
        throw new Error("boom");
      })
    ).toThrowError("boom");

    expect(
      profiler.aggregate("failing")[0]?.totalMs
    ).toBe(7);
  });

  it("registra la medición y preserva el error de una operación asíncrona", async () => {
    let now = 100;

    const profiler = new PerformanceProfiler(() => now);

    await expect(
      profiler.measureAsync("failing-async", async () => {
        now += 9;
        throw new Error("async boom");
      })
    ).rejects.toThrow("async boom");

    expect(
      profiler.aggregate("failing-async")[0]?.totalMs
    ).toBe(9);
  });

  it("rechaza nombres vacíos", () => {
    const profiler = new PerformanceProfiler();

    expect(() =>
      profiler.measure("", () => null)
    ).toThrowError(PerformanceError);
  });

  it("permite limpiar las métricas", () => {
    const profiler = new PerformanceProfiler();

    profiler.record({
      name: "x",
      startedAtMs: 0,
      finishedAtMs: 10,
      durationMs: 10,
      metadata: {}
    });

    expect(profiler.list()).toHaveLength(1);

    profiler.clear();

    expect(profiler.list()).toHaveLength(0);
  });
});

describe("runBatched", () => {
  it("ejecuta trabajo limitado por concurrencia y devuelve resultados", async () => {
    const items = [1, 2, 3, 4, 5];
    let active = 0;
    let peak = 0;

    const result = await runBatched(
      items,
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
      },
      {
        concurrency: 2
      }
    );

    expect(result.completed).toHaveLength(5);
    expect(result.errors).toHaveLength(0);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("acumula errores sin detener todo el batch por defecto", async () => {
    const result = await runBatched(
      [1, 2, 3],
      async (item) => {
        if (item === 2) {
          throw new Error("fallo");
        }
      },
      {
        concurrency: 2
      }
    );

    expect(result.completed).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });

  it("puede detener nuevas tareas ante el primer error", async () => {
    const result = await runBatched(
      [1, 2, 3, 4],
      async (item) => {
        if (item === 1) {
          throw new Error("fallo");
        }

        await Promise.resolve();
      },
      {
        concurrency: 1,
        stopOnError: true
      }
    );

    expect(result.completed).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("rechaza concurrencia inválida", async () => {
    await expect(
      runBatched(
        [],
        async () => undefined,
        {
          concurrency: 0
        }
      )
    ).rejects.toThrowError(PerformanceError);
  });
});
