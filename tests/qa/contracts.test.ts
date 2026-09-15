import { describe, expect, it } from "vitest";
import { assertFourStemContract } from "../../src/qa/index.js";

describe("contratos QA de QDEV", () => {
  it("mantiene el orden exacto de los cuatro stems", async () => {
    await expect(
      assertFourStemContract(["vocals", "drums", "bass", "other"])
    ).resolves.toBeUndefined();
  });

  it("rechaza orden incorrecto", async () => {
    await expect(
      assertFourStemContract(["drums", "vocals", "bass", "other"])
    ).rejects.toThrow();
  });
});
