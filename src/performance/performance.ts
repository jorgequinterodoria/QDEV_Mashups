export interface CacheEntry<T> {
  readonly value: T;
  readonly createdAtMs: number;
  readonly lastAccessAtMs: number;
  readonly expiresAtMs: number | null;
  readonly hits: number;
}

export interface PerformanceCacheOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number | null;
  readonly now?: () => number;
}

export interface PerformanceCacheStats {
  readonly size: number;
  readonly maxEntries: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;
}

export interface PerformanceSnapshot {
  readonly name: string;
  readonly startedAtMs: number;
  readonly finishedAtMs: number;
  readonly durationMs: number;
  readonly metadata: Readonly<
    Record<string, string | number | boolean>
  >;
}

export interface PerformanceAggregate {
  readonly name: string;
  readonly count: number;
  readonly totalMs: number;
  readonly averageMs: number;
  readonly minMs: number;
  readonly maxMs: number;
  readonly p95Ms: number;
}

export class PerformanceError extends Error {
  readonly code:
    | "INVALID_CACHE_OPTIONS"
    | "INVALID_KEY"
    | "INVALID_DURATION"
    | "INVALID_NAME";

  constructor(
    code: PerformanceError["code"],
    message: string
  ) {
    super(message);
    this.name = "PerformanceError";
    this.code = code;
  }
}

function assertName(name: string): void {
  if (!name.trim()) {
    throw new PerformanceError(
      "INVALID_NAME",
      "El nombre de la métrica no puede estar vacío."
    );
  }
}

function percentile(
  values: readonly number[],
  requested: number
): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(requested * sorted.length) - 1
  );

  return sorted[index] ?? 0;
}

export class PerformanceCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();
  private readonly now: () => number;
  private readonly maxEntries: number;
  private readonly ttlMs: number | null;

  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(
    options: PerformanceCacheOptions = {}
  ) {
    const maxEntries = options.maxEntries ?? 256;
    const ttlMs = options.ttlMs ?? null;

    if (
      !Number.isInteger(maxEntries) ||
      maxEntries < 1
    ) {
      throw new PerformanceError(
        "INVALID_CACHE_OPTIONS",
        "maxEntries debe ser un entero positivo."
      );
    }

    if (
      ttlMs !== null &&
      (!Number.isFinite(ttlMs) || ttlMs <= 0)
    ) {
      throw new PerformanceError(
        "INVALID_CACHE_OPTIONS",
        "ttlMs debe ser null o un número positivo."
      );
    }

    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.now = options.now ?? Date.now;
  }

  get(key: K): V | null {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (
      entry.expiresAtMs !== null &&
      this.now() >= entry.expiresAtMs
    ) {
      this.entries.delete(key);
      this.misses += 1;
      return null;
    }

    const now = this.now();

    this.entries.delete(key);
    this.entries.set(key, {
      ...entry,
      lastAccessAtMs: now,
      hits: entry.hits + 1
    });

    this.hits += 1;
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = this.now();
    const existing = this.entries.get(key);

    this.entries.delete(key);
    this.entries.set(key, {
      value,
      createdAtMs: existing?.createdAtMs ?? now,
      lastAccessAtMs: now,
      expiresAtMs:
        this.ttlMs === null
          ? null
          : now + this.ttlMs,
      hits: existing?.hits ?? 0
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey =
        this.entries.keys().next().value as K | undefined;

      if (oldestKey === undefined) {
        break;
      }

      this.entries.delete(oldestKey);
      this.evictions += 1;
    }
  }

  has(key: K): boolean {
    return this.get(key) !== null;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  pruneExpired(): number {
    if (this.ttlMs === null) {
      return 0;
    }

    const now = this.now();
    let removed = 0;

    for (const [key, entry] of this.entries) {
      if (
        entry.expiresAtMs !== null &&
        now >= entry.expiresAtMs
      ) {
        this.entries.delete(key);
        removed += 1;
      }
    }

    return removed;
  }

  size(): number {
    this.pruneExpired();
    return this.entries.size;
  }

  stats(): PerformanceCacheStats {
    this.pruneExpired();

    const total = this.hits + this.misses;

    return {
      size: this.entries.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate:
        total === 0
          ? 0
          : Math.round((this.hits / total) * 1000) / 1000
    };
  }

  entriesSnapshot():
    readonly Readonly<[K, CacheEntry<V>]>[] {
    this.pruneExpired();

    return [...this.entries.entries()].map(
      ([key, entry]) =>
        [
          key,
          { ...entry }
        ] as Readonly<[K, CacheEntry<V>]>
    );
  }
}

export class PerformanceProfiler {
  private readonly snapshots: PerformanceSnapshot[] = [];
  private readonly clock: () => number;

  constructor(clock: () => number = Date.now) {
    this.clock = clock;
  }

  private finish(
    name: string,
    startedAtMs: number,
    metadata: Readonly<
      Record<string, string | number | boolean>
    >
  ): void {
    const finishedAtMs = this.clock();

    if (finishedAtMs < startedAtMs) {
      throw new PerformanceError(
        "INVALID_DURATION",
        "El reloj de rendimiento retrocedió durante la medición."
      );
    }

    this.snapshots.push({
      name,
      startedAtMs,
      finishedAtMs,
      durationMs: finishedAtMs - startedAtMs,
      metadata: { ...metadata }
    });
  }

  measure<T>(
    name: string,
    operation: () => T,
    metadata: Readonly<
      Record<string, string | number | boolean>
    > = {}
  ): T {
    assertName(name);

    const startedAtMs = this.clock();
    let result!: T;
    let thrown: unknown = undefined;
    let hasThrown = false;

    try {
      result = operation();
    } catch (cause) {
      hasThrown = true;
      thrown = cause;
    }

    this.finish(
      name,
      startedAtMs,
      metadata
    );

    if (hasThrown) {
      throw thrown;
    }

    return result;
  }

  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata: Readonly<
      Record<string, string | number | boolean>
    > = {}
  ): Promise<T> {
    assertName(name);

    const startedAtMs = this.clock();
    let result!: T;
    let thrown: unknown = undefined;
    let hasThrown = false;

    try {
      result = await operation();
    } catch (cause) {
      hasThrown = true;
      thrown = cause;
    }

    this.finish(
      name,
      startedAtMs,
      metadata
    );

    if (hasThrown) {
      throw thrown;
    }

    return result;
  }

  record(
    snapshot: PerformanceSnapshot
  ): void {
    assertName(snapshot.name);

    if (
      !Number.isFinite(snapshot.durationMs) ||
      snapshot.durationMs < 0
    ) {
      throw new PerformanceError(
        "INVALID_DURATION",
        "La duración registrada no es válida."
      );
    }

    this.snapshots.push({
      ...snapshot,
      metadata: { ...snapshot.metadata }
    });
  }

  list(): readonly PerformanceSnapshot[] {
    return this.snapshots.map((snapshot) => ({
      ...snapshot,
      metadata: { ...snapshot.metadata }
    }));
  }

  aggregate(
    name?: string
  ): readonly PerformanceAggregate[] {
    const grouped = new Map<
      string,
      number[]
    >();

    for (const snapshot of this.snapshots) {
      if (
        name !== undefined &&
        snapshot.name !== name
      ) {
        continue;
      }

      const values = grouped.get(snapshot.name) ?? [];
      values.push(snapshot.durationMs);
      grouped.set(snapshot.name, values);
    }

    return [...grouped.entries()]
      .map(([metricName, values]) => {
        const totalMs = values.reduce(
          (total, value) => total + value,
          0
        );

        return {
          name: metricName,
          count: values.length,
          totalMs,
          averageMs:
            Math.round(
              (totalMs / values.length) * 100
            ) / 100,
          minMs: Math.min(...values),
          maxMs: Math.max(...values),
          p95Ms: percentile(values, 0.95)
        };
      })
      .sort(
        (a, b) =>
          b.totalMs - a.totalMs ||
          a.name.localeCompare(
            b.name,
            "es-CO"
          )
      );
  }

  clear(): void {
    this.snapshots.length = 0;
  }
}

export interface WorkBatchOptions {
  readonly concurrency?: number;
  readonly stopOnError?: boolean;
}

export interface WorkBatchResult<T> {
  readonly completed: readonly T[];
  readonly errors: readonly Error[];
  readonly durationMs: number;
}

export async function runBatched<T>(
  items: readonly T[],
  worker: (
    item: T,
    index: number
  ) => Promise<void>,
  options: WorkBatchOptions = {},
  clock: () => number = Date.now
): Promise<WorkBatchResult<T>> {
  const concurrency = options.concurrency ?? 4;
  const stopOnError = options.stopOnError ?? false;

  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1
  ) {
    throw new PerformanceError(
      "INVALID_CACHE_OPTIONS",
      "concurrency debe ser un entero positivo."
    );
  }

  const startedAt = clock();
  const completed: T[] = [];
  const errors: Error[] = [];
  let cursor = 0;
  let halted = false;

  const workerLoop = async (): Promise<void> => {
    while (true) {
      if (halted) {
        return;
      }

      const index = cursor++;

      if (index >= items.length) {
        return;
      }

      const item = items[index];

      if (item === undefined) {
        return;
      }

      try {
        await worker(item, index);
        completed.push(item);
      } catch (cause) {
        const error =
          cause instanceof Error
            ? cause
            : new Error(String(cause));

        errors.push(error);

        if (stopOnError) {
          halted = true;
          return;
        }
      }
    }
  };

  const workerCount = Math.min(
    concurrency,
    Math.max(items.length, 1)
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => workerLoop()
    )
  );

  const finishedAt = clock();

  if (finishedAt < startedAt) {
    throw new PerformanceError(
      "INVALID_DURATION",
      "El reloj de rendimiento retrocedió durante el batch."
    );
  }

  return {
    completed,
    errors,
    durationMs: finishedAt - startedAt
  };
}
