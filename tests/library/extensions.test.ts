import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUDIO_EXTENSIONS,
  isSupportedAudioExtension
} from "../../src/library/extensions";

describe("Audio extensions", () => {
  it("supports the expected audio formats", () => {
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".mp3");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".flac");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".wav");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".m4a");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".aiff");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".aif");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".aac");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".ogg");
    expect(DEFAULT_AUDIO_EXTENSIONS).toContain(".opus");
  });

  it("handles uppercase extensions", () => {
    expect(isSupportedAudioExtension(".MP3")).toBe(true);
    expect(isSupportedAudioExtension(".FLAC")).toBe(true);
  });

  it("rejects non-audio files", () => {
    expect(isSupportedAudioExtension(".jpg")).toBe(false);
    expect(isSupportedAudioExtension(".txt")).toBe(false);
    expect(isSupportedAudioExtension(".pdf")).toBe(false);
  });
});