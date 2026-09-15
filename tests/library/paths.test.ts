import { describe, expect, it } from "vitest";

import {
  isPathInsideRoot,
  normalizeRelativePath,
  normalizeRootPath
} from "../../src/library/paths";

describe("Library paths", () => {
  const root = "/Volumes/Respaldo Mac/MUSICA/Deemix";

  it("normalizes the library root", () => {
    expect(normalizeRootPath(root)).toBe(root);
  });

  it("creates portable relative paths", () => {
    expect(
      normalizeRelativePath(
        root,
        "/Volumes/Respaldo Mac/MUSICA/Deemix/House/Track.mp3"
      )
    ).toBe("House/Track.mp3");
  });

  it("returns an empty relative path for the root itself", () => {
    expect(normalizeRelativePath(root, root)).toBe("");
  });

  it("recognizes paths inside the library", () => {
    expect(
      isPathInsideRoot(
        root,
        "/Volumes/Respaldo Mac/MUSICA/Deemix/House/Track.mp3"
      )
    ).toBe(true);
  });

  it("rejects paths outside the library", () => {
    expect(
      isPathInsideRoot(
        root,
        "/Volumes/Other/Music/Track.mp3"
      )
    ).toBe(false);
  });
});