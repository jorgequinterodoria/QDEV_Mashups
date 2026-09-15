import type { SupportedAudioExtension } from "./types";

export const DEFAULT_AUDIO_EXTENSIONS: readonly SupportedAudioExtension[] = [
  ".mp3",
  ".flac",
  ".wav",
  ".aiff",
  ".aif",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus"
];

const AUDIO_EXTENSIONS = new Set<string>(DEFAULT_AUDIO_EXTENSIONS);

export function isSupportedAudioExtension(
  extension: string,
  supportedExtensions: readonly SupportedAudioExtension[] = DEFAULT_AUDIO_EXTENSIONS
): extension is SupportedAudioExtension {
  const normalized = extension.toLowerCase();

  if (supportedExtensions === DEFAULT_AUDIO_EXTENSIONS) {
    return AUDIO_EXTENSIONS.has(normalized);
  }

  return supportedExtensions.includes(
    normalized as SupportedAudioExtension
  );
}