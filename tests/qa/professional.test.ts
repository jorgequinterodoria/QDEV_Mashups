import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  assertFourStemContract,
  runQaCheck,
  runQaSuite,
  verifyAtomicJsonRecovery
} from "../../src/qa/index.js";

describe("PHASE 25 — QA Profesional", () => {
  it("ejecuta una comprobación unitaria correctamente", async () => {
    const result = await runQaCheck({
      id: "qa-unit-basic",
      category: "unit",
      run: () => undefined
    });

    expect(result.status).toBe("passed");
    expect(result.category).toBe("unit");
  });

  it("captura errores de regresión sin romper la suite", async () => {
    const result = await runQaCheck({
      id: "qa-regression-error",
      category: "regression",
      run: () => {
        throw new Error("Fallo controlado");
      }
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Fallo controlado");
  });

  it("ejecuta una suite y agrega resultados", async () => {
    const report = await runQaSuite([
      {
        id: "unit-1",
        category: "unit",
        run: () => undefined
      },
      {
        id: "integration-1",
        category: "integration",
        run: () => undefined
      },
      {
        id: "e2e-1",
        category: "e2e",
        run: () => undefined
      }
    ]);

    expect(report.ok).toBe(true);
    expect(report.passed).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.skipped).toBe(0);
  });

  it("permite cancelar la suite", async () => {
    const controller = new AbortController();
    controller.abort();

    const report = await runQaSuite(
      [
        {
          id: "cancelled-before-start",
          category: "cancellation",
          run: async () => undefined
        }
      ],
      { signal: controller.signal }
    );

    expect(report.ok).toBe(true);
    expect(report.skipped).toBe(1);
  });

  it("rechaza el contrato de stems distinto al oficial", async () => {
    await expect(
      assertFourStemContract(["vocals", "drums", "bass", "other", "guitar"])
    ).rejects.toThrow(/contrato QA/i);

    await expect(
      assertFourStemContract(["vocals", "drums", "bass", "other"])
    ).resolves.toBeUndefined();
  });

  it("detecta recuperación de un archivo JSON después de corrupción", async () => {
    const root = await mkdtemp(join(tmpdir(), "qdev-qa-"));
    const configPath = join(root, "estado.json");
    const original = '{"incompleto":';
    await writeFile(configPath, original, "utf8");

    const result = await verifyAtomicJsonRecovery(configPath, {
      recuperado: true
    });

    expect(result.recovered).toBe(true);
    expect(result.corruptedOriginalPreserved).toBe(true);
  });

  it("expone categorías obligatorias de la fase", async () => {
    const categories = new Set([
      "unit",
      "integration",
      "e2e",
      "regression",
      "cancellation",
      "cache-corruption",
      "recovery"
    ]);

    const report = await runQaSuite(
      [...categories].map((category) => ({
        id: `category-${category}`,
        category: category as
          | "unit"
          | "integration"
          | "e2e"
          | "regression"
          | "cancellation"
          | "cache-corruption"
          | "recovery",
        run: () => undefined
      }))
    );

    expect(report.results).toHaveLength(7);
    expect(new Set(report.results.map((item) => item.category))).toEqual(
      categories
    );
  });

  it("protege contra tiempo límite", async () => {
    const result = await runQaCheck({
      id: "timeout-check",
      category: "e2e",
      timeoutMs: 10,
      run: async ({ signal }) => {
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      }
    });

    expect(["passed", "skipped"]).toContain(result.status);
  });
});
