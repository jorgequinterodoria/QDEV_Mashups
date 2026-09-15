import {
  mkdir,
  writeFile
} from "node:fs/promises";

import {
  basename,
  dirname,
  join,
  resolve
} from "node:path";

import type {
  DJMashupSession,
  DJSessionExporter
} from "./types";

export class DJSessionExporterImpl
  implements DJSessionExporter
{
  async export(
    session: DJMashupSession,
    outputDirectory: string
  ): Promise<{
    manifestPath: string;
    playlistPath: string;
  }> {
    const directory =
      resolve(
        outputDirectory
      );

    await mkdir(
      directory,
      {
        recursive: true
      }
    );

    const manifestPath =
      join(
        directory,
        "dj-mashup-session.json"
      );

    const playlistPath =
      join(
        directory,
        "dj-mashup-session.m3u8"
      );

    const manifest =
      createManifest(
        session
      );

    const playlist =
      createPlaylist(
        session
      );

    await writeFile(
      manifestPath,
      `${JSON.stringify(
        manifest,
        null,
        2
      )}\n`,
      "utf8"
    );

    await writeFile(
      playlistPath,
      playlist,
      "utf8"
    );

    return {
      manifestPath,
      playlistPath
    };
  }
}

function createManifest(
  session: DJMashupSession
): DJMashupSession {
  return {
    ...session,
    baseTrack: {
      ...session.baseTrack,
      cuePoints:
        session.baseTrack
          .cuePoints
          .map(
            (cue) => ({
              ...cue
            })
          ),
      loops:
        session.baseTrack
          .loops
          .map(
            (loop) => ({
              ...loop
            })
          )
    },
    secondaryTrack: {
      ...session.secondaryTrack,
      cuePoints:
        session.secondaryTrack
          .cuePoints
          .map(
            (cue) => ({
              ...cue
            })
          ),
      loops:
        session.secondaryTrack
          .loops
          .map(
            (loop) => ({
              ...loop
            })
          )
    }
  };
}

function createPlaylist(
  session: DJMashupSession
): string {
  const lines = [
    "#EXTM3U",
    `#EXT-X-TARGETDURATION:${Math.ceil(
      maximumDuration(
        session
      )
    )}`,
    session.baseTrack.sourcePath,
    session.secondaryTrack.sourcePath
  ];

  return `${lines.join(
    "\n"
  )}\n`;
}

function maximumDuration(
  session: DJMashupSession
): number {
  return Math.max(
    session.baseTrack
      .durationSeconds ?? 0,
    session.secondaryTrack
      .durationSeconds ?? 0,
    1
  );
}

void dirname;
void basename;