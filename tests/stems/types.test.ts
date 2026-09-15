import { describe, expect, it } from "vitest";
import { STEM_CHANNELS } from "../../src/stems";

describe("contrato de stems de cuatro canales", () => {
  it("mantiene exactamente voces, batería, bajo y otros", () => {
    expect(STEM_CHANNELS).toEqual([
      "vocals",
      "drums",
      "bass",
      "other"
    ]);
    expect(STEM_CHANNELS).toHaveLength(4);
  });

  it("no introduce el modelo experimental de seis stems", () => {
    expect(STEM_CHANNELS).not.toContain("guitar");
    expect(STEM_CHANNELS).not.toContain("piano");
  });
});
