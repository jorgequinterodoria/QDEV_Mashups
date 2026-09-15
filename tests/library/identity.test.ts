import { describe, expect, it } from "vitest";

import {
  createFolder,
  createFolderId,
  createTrackId,
  createTrackIdFromFolderAndFile,
  createTrackContentFingerprint
} from "../../src/library/identity";

describe("Library identity", () => {
  it("creates deterministic folder identifiers", () => {
    expect(createFolderId("House")).toBe(createFolderId("House"));
  });

  it("creates deterministic track identifiers", () => {
    expect(createTrackId("House/Track.mp3")).toBe(
      createTrackId("House/Track.mp3")
    );
  });

  it("distinguishes different tracks", () => {
    expect(createTrackId("House/A.mp3")).not.toBe(
      createTrackId("House/B.mp3")
    );
  });

  it("creates deterministic content fingerprints", () => {
    expect(createTrackContentFingerprint(1000, 1234)).toBe(
      createTrackContentFingerprint(1000, 1234)
    );
  });

  it("changes the fingerprint when file metadata changes", () => {
    expect(createTrackContentFingerprint(1000, 1234)).not.toBe(
      createTrackContentFingerprint(1001, 1234)
    );
  });

  it("creates correct folder hierarchy information", () => {
    const folder = createFolder(
      "/Volumes/Respaldo Mac/MUSICA/Deemix",
      "House/Deep"
    );

    expect(folder.name).toBe("Deep");
    expect(folder.relativePath).toBe("House/Deep");
    expect(folder.depth).toBe(2);
    expect(folder.parentId).toBe(createFolderId("House"));
  });

  it("creates track identity from folder and filename", () => {
    expect(
      createTrackIdFromFolderAndFile("House", "Track.mp3")
    ).toBe(createTrackId("House/Track.mp3"));
  });
});