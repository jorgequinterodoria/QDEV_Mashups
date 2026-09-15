import { describe, expect, it } from "vitest";

const projectName = "mashup-assistant";
const libraryPath = "/Volumes/Respaldo Mac/MUSICA/Deemix";

describe("Phase 0 — Foundation", () => {
  it("defines the correct project identity", () => {
    expect(projectName).toBe("mashup-assistant");
  });

  it("defines the configured music library source", () => {
    expect(libraryPath).toBe(
      "/Volumes/Respaldo Mac/MUSICA/Deemix"
    );
  });

  it("uses a valid macOS library path", () => {
    expect(libraryPath.startsWith("/Volumes/")).toBe(true);
    expect(libraryPath.endsWith("/Deemix")).toBe(true);
  });

  it("keeps the foundation version in the expected range", () => {
    const version = "0.1.0";
    const [major, minor, patch] = version.split(".").map(Number);

    expect(major).toBe(0);
    expect(minor).toBe(1);
    expect(patch).toBe(0);
  });
});