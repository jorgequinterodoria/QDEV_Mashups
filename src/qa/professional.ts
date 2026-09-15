import { readFile, rename, writeFile } from "node:fs/promises";

export type QaCategory =
  | "unit"
  | "integration"
  | "e2e"
  | "regression"
  | "cancellation"
  | "cache-corruption"
  | "recovery";

export type QaStatus = "passed" | "failed" | "skipped";

export interface QaResult {
  readonly id: string;
  readonly category: QaCategory;
  readonly status: QaStatus;
  readonly durationMs: number;
  readonly message: string;
  readonly error?: string;
}

export interface QaCheckContext {
  readonly signal: AbortSignal;
}

export interface QaCheck {
  readonly id: string;
  readonly category: QaCategory;
  readonly timeoutMs?: number;
  readonly run: (context: QaCheckContext) => Promise<void> | void;
}

export interface QaSuiteReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly results: readonly QaResult[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly ok: boolean;
}

function now(): number {
  return Date.now();
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createAbortError(message = "La comprobación QA fue cancelada."): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal: AbortSignal
): Promise<T> {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("El tiempo límite QA debe ser un entero mayor que cero.");
  }

  const controller = new AbortController();

  const onParentAbort = (): void => controller.abort();
  parentSignal.addEventListener("abort", onParentAbort, { once: true });

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (parentSignal.aborted) {
      throw createAbortError();
    }

    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(createAbortError("La comprobación QA superó su límite o fue cancelada.")),
          { once: true }
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener("abort", onParentAbort);
  }
}

export async function runQaCheck(
  check: QaCheck,
  options: { readonly signal?: AbortSignal } = {}
): Promise<QaResult> {
  const started = now();
  const controller = new AbortController();
  const parentSignal = options.signal ?? new AbortController().signal;

  const onAbort = (): void => controller.abort();
  parentSignal.addEventListener("abort", onAbort, { once: true });

  try {
    if (parentSignal.aborted) {
      return {
        id: check.id,
        category: check.category,
        status: "skipped",
        durationMs: now() - started,
        message: "Comprobación cancelada antes de iniciar."
      };
    }

    await withTimeout(
      async (signal) => {
        await check.run({ signal });
      },
      check.timeoutMs ?? 30_000,
      controller.signal
    );

    return {
      id: check.id,
      category: check.category,
      status: "passed",
      durationMs: now() - started,
      message: "Comprobación correcta."
    };
  } catch (error) {
    const message = asErrorMessage(error);
    const cancelled =
      parentSignal.aborted ||
      (error instanceof Error && error.name === "AbortError");

    return {
      id: check.id,
      category: check.category,
      status: cancelled ? "skipped" : "failed",
      durationMs: now() - started,
      message: cancelled ? "Comprobación cancelada." : "Comprobación fallida.",
      error: message
    };
  } finally {
    parentSignal.removeEventListener("abort", onAbort);
  }
}

export async function runQaSuite(
  checks: readonly QaCheck[],
  options: { readonly signal?: AbortSignal } = {}
): Promise<QaSuiteReport> {
  const startedAt = new Date().toISOString();
  const results: QaResult[] = [];

  for (const check of checks) {
    if (options.signal?.aborted) {
      results.push({
        id: check.id,
        category: check.category,
        status: "skipped",
        durationMs: 0,
        message: "Comprobación omitida por cancelación de la suite."
      });
      continue;
    }

    results.push(await runQaCheck(check, options));
  }

  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter((result) => result.status === "skipped").length;

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
    passed,
    failed,
    skipped,
    ok: failed === 0
  };
}

export async function verifyAtomicJsonRecovery(
  filePath: string,
  validPayload: unknown
): Promise<{ recovered: boolean; corruptedOriginalPreserved: boolean }> {
  const original = await readFile(filePath, "utf8");
  const backupPath = `${filePath}.corrupt`;

  await rename(filePath, backupPath);
  try {
    await writeFile(filePath, `${JSON.stringify(validPayload, null, 2)}\n`, "utf8");
    const repaired = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return {
      recovered: JSON.stringify(repaired) === JSON.stringify(validPayload),
      corruptedOriginalPreserved: (await readFile(backupPath, "utf8")) === original
    };
  } finally {
    await writeFile(filePath, original, "utf8");
  }
}

export async function assertFourStemContract(
  channels: readonly string[]
): Promise<void> {
  const expected = ["vocals", "drums", "bass", "other"];
  if (
    channels.length !== expected.length ||
    channels.some((channel, index) => channel !== expected[index])
  ) {
    throw new Error(
      "El contrato QA exige exactamente vocals, drums, bass y other."
    );
  }
}
