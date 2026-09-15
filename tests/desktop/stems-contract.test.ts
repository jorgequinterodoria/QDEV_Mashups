import { describe, expect, it } from "vitest";
import type { QdevDesktopApi } from "../../src/desktop/types";

describe("contrato desktop de stems", () => {
  it("define el contrato de separación y progreso", () => {
    const api = {
      separateStems: async () => { throw new Error("stub"); },
      cancelStemSeparation: async () => true,
      onStemProgress: () => () => undefined
    } satisfies Pick<QdevDesktopApi, "separateStems" | "cancelStemSeparation" | "onStemProgress">;

    expect(api.separateStems).toBeTypeOf("function");
    expect(api.cancelStemSeparation).toBeTypeOf("function");
    expect(api.onStemProgress).toBeTypeOf("function");
  });
});
