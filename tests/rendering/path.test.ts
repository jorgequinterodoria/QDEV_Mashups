import {
  describe,
  expect,
  it
} from "vitest";

import {
  assertOutputIsNotInput
} from "../../src/rendering/path";

describe(
  "rendering paths",
  () => {
    it("rejects overwriting a source file", () => {
      expect(() =>
        assertOutputIsNotInput(
          "/music/mashup.wav",
          [
            "/music/mashup.wav",
            "/music/vocal.wav"
          ]
        )
      ).toThrow(
        "The render output cannot overwrite a source audio file."
      );
    });

    it("allows a different output file", () => {
      expect(() =>
        assertOutputIsNotInput(
          "/output/mashup.wav",
          [
            "/music/base.wav",
            "/music/vocal.wav"
          ]
        )
      ).not.toThrow();
    });
  }
);