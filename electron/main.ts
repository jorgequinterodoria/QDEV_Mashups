import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell
} from "electron";

import {
  createHash
} from "node:crypto";

import {
  access,
  mkdir,
  readdir,
  stat
} from "node:fs/promises";

import {
  basename,
  dirname,
  join,
  resolve,
  sep
} from "node:path";

import {
  fileURLToPath,
  pathToFileURL
} from "node:url";

import {
  MashupBuilderService
} from "../src/builder/service.js";

import {
  MashupCompatibilityEngine
} from "../src/compatibility/engine.js";

import {
  AudioMashupRenderer
} from "../src/rendering/renderer.js";

import {
  AudioMusicIntelligenceEngine
} from "../src/intelligence/audio-engine.js";

import {
  parseFile
} from "music-metadata";

import {
  MlxDemucsProvider
} from "../src/stems/provider-mlx-demucs.js";

import {
  StemSeparationService
} from "../src/stems/service.js";

import {
  STEM_CHANNELS,
  type StemChannel,
  type StemModelName
} from "../src/stems/types.js";

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  dirname(
    __filename
  );

const AUDIO_EXTENSIONS =
  new Set([
    ".mp3",
    ".wav",
    ".flac",
    ".aiff",
    ".aif",
    ".m4a",
    ".aac",
    ".ogg",
    ".opus"
  ]);

const ANALYSIS_SECONDS =
  45;

const DISCOVERY_ANALYSIS_SECONDS =
  ANALYSIS_SECONDS;

const DISCOVERY_SAMPLE_SIZE =
  8;

const DISCOVERY_MIN_SCORE =
  55;

const DISCOVERY_MAX_RESULTS =
  20;

interface PreviewRequest {
  baseTrackPath: string;
  secondaryTrackPath: string;
}

interface DiscoveryCandidate {
  baseTrackPath: string;
  secondaryTrackPath: string;
  title: string;
  artist: string;
  secondaryTitle: string;
  secondaryArtist: string;
  score: number;
  bpm: string;
  secondaryBpm: string;
  key: string;
  secondaryKey: string;
  targetBpm: number | null;
  targetKey: string | null;
  grade: string;
  confidence: string;
  type: "vocal" | "instrumental" | "hybrid";
}

interface LibraryScanResult {
  root: string;
  tracks: number;
  totalBytes: number;
  scannedAtMs: number;
  discoveryCandidates: DiscoveryCandidate[];
  discoveryPairsEvaluated: number;
  discoveryTracksAnalyzed: number;
}

type MashupBuildPlan =
  ReturnType<
    MashupBuilderService["build"]
  >;

type MashupOutputKind =
  | "preview"
  | "full";

interface PreviewResult {
  outputPath: string;
  planId: string;
  kind: MashupOutputKind;
  score: number;
  grade: string;
  confidence: string;
  targetBpm: number | null;
  targetKey: string | null;
  durationSeconds: number;
}

interface ActiveMashupPlan {
  plan: MashupBuildPlan;
  basePath: string;
  secondaryPath: string;
  score: number;
  grade: string;
  confidence: string;
}

const stemProvider =
  new MlxDemucsProvider();

const stemService =
  new StemSeparationService(
    stemProvider
  );

const activeStemControllers =
  new Map<string, AbortController>();

const activeMashupPlans =
  new Map<
    string,
    ActiveMashupPlan
  >();

let mainWindow:
  | BrowserWindow
  | null = null;

function createWindow(): void {
  mainWindow =
    new BrowserWindow({
      width: 1480,
      height: 940,
      minWidth: 1120,
      minHeight: 720,
      backgroundColor:
        "#090a0e",
      show: false,
      webPreferences: {
        preload:
          join(
            __dirname,
            "../../electron/preload.cjs"
          ),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

  mainWindow.once(
    "ready-to-show",
    () => {
      mainWindow?.show();
    }
  );

  if (
    process.env.VITE_DEV_SERVER_URL
  ) {
    void mainWindow.loadURL(
      process.env.VITE_DEV_SERVER_URL
    );
  } else {
    void mainWindow.loadFile(
      resolve(
        __dirname,
        "../../dist/index.html"
      )
    );
  }

  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    }
  );
}

function getDialogParent():
  BrowserWindow {
  if (
    mainWindow === null ||
    mainWindow.isDestroyed()
  ) {
    throw new Error(
      "The application window is not available."
    );
  }

  return mainWindow;
}

function registerIpc(): void {
  ipcMain.handle(
    "desktop:get-runtime-info",
    () => ({
      appVersion:
        app.getVersion(),

      electronVersion:
        process.versions.electron,

      nodeVersion:
        process.versions.node,

      chromeVersion:
        process.versions.chrome,

      platform:
        process.platform,

      arch:
        process.arch
    })
  );

  ipcMain.handle(
    "library:choose",
    async () => {
      const result =
        await dialog.showOpenDialog(
          getDialogParent(),
          {
            title:
              "Choose music library",

            properties: [
              "openDirectory"
            ]
          }
        );

      if (
        result.canceled ||
        result.filePaths.length === 0
      ) {
        return null;
      }

      return result.filePaths[0];
    }
  );

  ipcMain.handle(
    "library:scan",
    async (
      _event,
      libraryRoot: unknown
    ) => {
      if (
        typeof libraryRoot !==
        "string"
      ) {
        throw new Error(
          "Invalid library root."
        );
      }

      return scanLibrary(
        libraryRoot
      );
    }
  );

  ipcMain.handle(
    "audio:choose-one",
    async () => {
      const result = await dialog.showOpenDialog(
        getDialogParent(),
        {
          title: "Selecciona una canción para separar",
          properties: ["openFile"],
          filters: [
            {
              name: "Audio",
              extensions: ["mp3", "wav", "flac", "aiff", "aif", "m4a", "aac", "ogg", "opus"]
            }
          ]
        }
      );

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0] ?? null;
    }
  );

  ipcMain.handle(
    "audio:choose",
    async () => {
      const result =
        await dialog.showOpenDialog(
          getDialogParent(),
          {
            title:
              "Choose two audio tracks",

            properties: [
              "openFile",
              "multiSelections"
            ],

            filters: [
              {
                name: "Audio",
                extensions: [
                  "mp3",
                  "wav",
                  "flac",
                  "aiff",
                  "aif",
                  "m4a",
                  "aac",
                  "ogg",
                  "opus"
                ]
              }
            ]
          }
        );

      if (
        result.canceled
      ) {
        return [];
      }

      return result.filePaths
        .slice(
          0,
          2
        );
    }
  );

  ipcMain.handle(
    "mashup:create-preview",
    async (
      _event,
      request: unknown
    ) => {
      if (
        !isPreviewRequest(
          request
        )
      ) {
        throw new Error(
          "Invalid mashup preview request."
        );
      }

      return createPreview(
        request
      );
    }
  );

  ipcMain.handle(
    "mashup:create-full",
    async (
      _event,
      planId: unknown
    ) => {
      if (
        typeof planId !== "string" ||
        planId.trim().length === 0
      ) {
        throw new Error(
          "Invalid mashup plan id."
        );
      }

      return createFullMashup(
        planId
      );
    }
  );

  ipcMain.handle(
    "audio:get-source-url",
    async (
      _event,
      sourcePath: unknown
    ) => {
      const safePath = assertReadableAudioPath(sourcePath);
      await access(safePath);
      return pathToFileURL(safePath).href;
    }
  );

  ipcMain.handle(
    "stems:separate",
    async (
      _event,
      request: unknown
    ) => {
      const validated = validateStemSeparationRequest(request);
      const sourcePath = validated.sourcePath;
      const trackId = createTrackId(sourcePath);
      const controller = new AbortController();

      activeStemControllers.set(trackId, controller);

      try {
        const result = await stemService.separate({
          trackId,
          sourcePath,
          model: validated.model,
          force: validated.force,
          signal: controller.signal,
          onProgress: (progress) => {
            if (mainWindow !== null && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("stems:progress", progress);
            }
          }
        });

        const stemFiles = {} as Record<StemChannel, {
          channel: StemChannel;
          path: string;
          url: string;
          sizeBytes: number;
        }>;

        for (const channel of STEM_CHANNELS) {
          const stem = result.manifest.stems[channel];
          stemFiles[channel] = {
            channel,
            path: stem.path,
            url: pathToFileURL(stem.path).href,
            sizeBytes: stem.sizeBytes
          };
        }

        return {
          cacheHit: result.cacheHit,
          manifest: result.manifest,
          sourceUrl: pathToFileURL(sourcePath).href,
          stemFiles
        };
      } finally {
        activeStemControllers.delete(trackId);
      }
    }
  );

  ipcMain.handle(
    "stems:cancel",
    (_event, trackId: unknown) => {
      if (typeof trackId !== "string" || trackId.trim().length === 0) {
        return false;
      }

      const controller = activeStemControllers.get(trackId);
      if (!controller) {
        return false;
      }

      controller.abort();
      return true;
    }
  );

  ipcMain.handle(
    "output:reveal",
    async (
      _event,
      outputPath: unknown
    ) => {
      if (
        typeof outputPath !==
        "string"
      ) {
        throw new Error(
          "Invalid output path."
        );
      }

      const resolvedOutput =
        resolve(outputPath);

      assertMashupOutputPath(
        resolvedOutput
      );

      shell.showItemInFolder(
        resolvedOutput
      );
    }
  );

  ipcMain.handle(
    "output:get-audio-url",
    async (
      _event,
      outputPath: unknown
    ) => {
      if (
        typeof outputPath !==
        "string"
      ) {
        throw new Error(
          "Invalid output path."
        );
      }

      const resolvedOutput =
        resolve(
          outputPath
        );

      assertMashupOutputPath(
        resolvedOutput
      );

      await access(
        resolvedOutput
      );

      return pathToFileURL(
        resolvedOutput
      ).href;
    }
  );
}

function getMashupOutputDirectories(): {
  previewDirectory: string;
  fullDirectory: string;
} {
  const root =
    resolve(
      app.getPath("music"),
      "QDEV Mashups"
    );

  return {
    previewDirectory: join(
      root,
      "Previews"
    ),
    fullDirectory: join(
      root,
      "Mashups"
    )
  };
}

function assertMashupOutputPath(
  outputPath: string
): void {
  const resolvedOutput =
    resolve(outputPath);

  const {
    previewDirectory,
    fullDirectory
  } = getMashupOutputDirectories();

  const allowedDirectories = [
    previewDirectory,
    fullDirectory
  ];

  const allowed =
    allowedDirectories.some(
      (directory) => {
        const prefix =
          `${directory}${sep}`;
        return (
          resolvedOutput === directory ||
          resolvedOutput.startsWith(prefix)
        );
      }
    );

  if (!allowed) {
    throw new Error(
      "Audio output access is restricted to QDEV Mashups generated files."
    );
  }
}

function safeOutputStem(
  filePath: string
): string {
  const stem =
    basename(filePath).replace(
      /\.[^.]+$/u,
      ""
    );

  return (
    stem
      .replace(/[\\/:*?"<>|]/gu, "-")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 90) ||
    "track"
  );
}

async function scanLibrary(
  libraryRoot: string
): Promise<LibraryScanResult> {
  const root =
    resolve(
      libraryRoot
    );

  await access(
    root
  );

  let tracks = 0;
  let totalBytes = 0;

  const audioFiles: string[] = [];

  await walk(
    root,
    async (
      filePath
    ) => {
      if (
        !isAudioFile(
          filePath
        )
      ) {
        return;
      }

      const metadata =
        await stat(
          filePath
        );

      tracks += 1;
      totalBytes +=
        metadata.size;

      audioFiles.push(
        filePath
      );
    }
  );

  const discoveryPaths =
    selectDiscoverySample(
      audioFiles,
      DISCOVERY_SAMPLE_SIZE
    );

  const discoveryTracks =
    await analyzeDiscoverySample(
      discoveryPaths
    );

  const discovery =
    buildDiscoveryCandidates(
      discoveryTracks
    );

  return {
    root,
    tracks,
    totalBytes,
    scannedAtMs:
      Date.now(),
    discoveryCandidates:
      discovery.candidates,
    discoveryPairsEvaluated:
      discovery.pairsEvaluated,
    discoveryTracksAnalyzed:
      discoveryTracks.length
  };
}

function selectDiscoverySample(
  audioFiles: readonly string[],
  sampleSize: number
): string[] {
  if (
    audioFiles.length <=
    sampleSize
  ) {
    return [
      ...audioFiles
    ];
  }

  const sorted =
    [
      ...audioFiles
    ].sort(
      (left, right) =>
        left.localeCompare(
          right
        )
    );

  return Array.from(
    {
      length:
        sampleSize
    },
    (_, index) => {
      const position =
        Math.round(
          index *
          (
            (sorted.length - 1) /
            (sampleSize - 1)
          )
        );

      return sorted[position];
    }
  );
}

type IntelligenceResult =
  Awaited<
    ReturnType<
      AudioMusicIntelligenceEngine["analyze"]
    >
  >;

interface DiscoveryAnalyzedTrack {
  path: string;
  title: string;
  artist: string;
  analysis: IntelligenceResult;
}

async function analyzeDiscoverySample(
  paths: readonly string[]
): Promise<
  DiscoveryAnalyzedTrack[]
> {
  if (
    paths.length === 0
  ) {
    return [];
  }

  const engine =
    new AudioMusicIntelligenceEngine();

  const results:
    DiscoveryAnalyzedTrack[] =
    [];

  let cursor = 0;

  const worker =
    async () => {
      while (true) {
        const index =
          cursor;

        cursor += 1;

        if (
          index >=
          paths.length
        ) {
          return;
        }

        const filePath =
          paths[index];

        try {
          const [
            analysis,
            metadata
          ] =
            await Promise.all([
              engine.analyze(
                filePath,
                {
                  maxAnalysisSeconds:
                    DISCOVERY_ANALYSIS_SECONDS,
                  startSeconds: 0
                }
              ),
              parseDiscoveryMetadata(
                filePath
              )
            ]);

          results.push({
            path: filePath,
            title:
              metadata.title,
            artist:
              metadata.artist,
            analysis
          });
        } catch {
          // Discovery analysis is best-effort.
          // A single unreadable file must not
          // invalidate the library scan.
        }
      }
    };

  await Promise.all([
    worker(),
    worker()
  ]);

  return results;
}

async function parseDiscoveryMetadata(
  filePath: string
): Promise<{
  title: string;
  artist: string;
}> {
  try {
    const metadata =
      await parseFile(
        filePath,
        {
          skipPostHeaders:
            true
        }
      );

    const fallbackTitle =
      basename(
        filePath
      ).replace(
        /\.[^.]+$/,
        ""
      );

    return {
      title:
        metadata.common.title?.trim() ||
        fallbackTitle,
      artist:
        metadata.common.artist?.trim() ||
        "Local library"
    };
  } catch {
    return {
      title:
        basename(
          filePath
        ).replace(
          /\.[^.]+$/,
          ""
        ),
      artist:
        "Local library"
    };
  }
}

function buildDiscoveryCandidates(
  tracks: readonly DiscoveryAnalyzedTrack[]
): {
  candidates: DiscoveryCandidate[];
  pairsEvaluated: number;
} {
  const compatibilityEngine =
    new MashupCompatibilityEngine();

  const ranked:
    Array<{
      candidate:
        DiscoveryCandidate;
      score: number;
    }> = [];

  let pairsEvaluated =
    0;

  for (
    let leftIndex = 0;
    leftIndex <
      tracks.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex =
        leftIndex + 1;
      rightIndex <
        tracks.length;
      rightIndex += 1
    ) {
      pairsEvaluated += 1;

      const left =
        tracks[leftIndex];

      const right =
        tracks[rightIndex];

      const leftResult =
        createTrackResult(
          `discovery-left-${leftIndex}`,
          left.path,
          left.analysis
        );

      const rightResult =
        createTrackResult(
          `discovery-right-${rightIndex}`,
          right.path,
          right.analysis
        );

      const compatibility =
        compatibilityEngine.compare(
          leftResult,
          rightResult
        );

      if (
        compatibility.overallScore <
        DISCOVERY_MIN_SCORE
      ) {
        continue;
      }

      const candidate = {
        trackAId:
          leftResult.trackId,

        trackBId:
          rightResult.trackId,

        score:
          compatibility.overallScore,

        grade:
          compatibility.grade,

        confidence:
          compatibility.confidence,

        compatibility
      };

      const builder =
        new MashupBuilderService();

      const plan =
        builder.build(
          candidate,
          leftResult,
          rightResult
        );

      if (!plan.readyForPreview) {
        continue;
      }

      ranked.push({
        score:
          compatibility.overallScore,
        candidate: {
          baseTrackPath:
            left.path,
          secondaryTrackPath:
            right.path,
          title:
            left.title,
          artist:
            left.artist,
          secondaryTitle:
            right.title,
          secondaryArtist:
            right.artist,
          score:
            compatibility.overallScore,
          bpm:
            formatBpm(
              left.analysis.tempo.bpm
            ),
          secondaryBpm:
            formatBpm(
              right.analysis.tempo.bpm
            ),
          key:
            left.analysis.key.label ??
            "Unknown",
          secondaryKey:
            right.analysis.key.label ??
            "Unknown",
          targetBpm:
            plan.targetBpm,
          targetKey:
            plan.targetKey.label,
          grade:
            compatibility.grade,
          confidence:
            compatibility.confidence,
          type:
            "hybrid"
        }
      });
    }
  }

  ranked.sort(
    (left, right) =>
      right.score -
      left.score
  );

  return {
    candidates:
      ranked
        .slice(
          0,
          DISCOVERY_MAX_RESULTS
        )
        .map(
          (item) =>
            item.candidate
        ),
    pairsEvaluated
  };
}

function formatBpm(
  bpm: number | null
): string {
  if (
    bpm === null ||
    !Number.isFinite(
      bpm
    )
  ) {
    return "— BPM";
  }

  return `${Math.round(
    bpm
  )} BPM`;
}

async function walk(
  directory: string,
  onFile: (
    filePath: string
  ) => Promise<void>
): Promise<void> {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes: true
      }
    );

  for (
    const entry of entries
  ) {
    const filePath =
      join(
        directory,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      await walk(
        filePath,
        onFile
      );

      continue;
    }

    if (
      entry.isFile()
    ) {
      await onFile(
        filePath
      );
    }
  }
}

async function prepareMashupPlan(
  request: PreviewRequest
): Promise<ActiveMashupPlan> {
  const basePath =
    resolve(
      request.baseTrackPath
    );

  const secondaryPath =
    resolve(
      request.secondaryTrackPath
    );

  await Promise.all([
    access(basePath),
    access(secondaryPath)
  ]);

  if (
    basePath ===
    secondaryPath
  ) {
    throw new Error(
      "The same track cannot be used twice."
    );
  }

  const intelligence =
    new AudioMusicIntelligenceEngine();

  const [
    trackAAnalysis,
    trackBAnalysis
  ] = await Promise.all([
    intelligence.analyze(
      basePath,
      {
        maxAnalysisSeconds:
          ANALYSIS_SECONDS,
        startSeconds: 0
      }
    ),
    intelligence.analyze(
      secondaryPath,
      {
        maxAnalysisSeconds:
          ANALYSIS_SECONDS,
        startSeconds: 0
      }
    )
  ]);

  const trackA =
    createTrackResult(
      "desktop-a",
      basePath,
      trackAAnalysis
    );

  const trackB =
    createTrackResult(
      "desktop-b",
      secondaryPath,
      trackBAnalysis
    );

  const compatibilityEngine =
    new MashupCompatibilityEngine();

  const compatibility =
    compatibilityEngine.compare(
      trackA,
      trackB
    );

  if (
    compatibility.overallScore <
    55
  ) {
    throw new Error(
      `Mashup compatibility is ${compatibility.overallScore}/100. Select a stronger pair.`
    );
  }

  const candidate = {
    trackAId:
      trackA.trackId,
    trackBId:
      trackB.trackId,
    score:
      compatibility.overallScore,
    grade:
      compatibility.grade,
    confidence:
      compatibility.confidence,
    compatibility
  };

  const builder =
    new MashupBuilderService();

  const plan =
    builder.build(
      candidate,
      trackA,
      trackB
    );

  if (!plan.readyForPreview) {
    throw new Error(
      plan.warnings.join(" ")
    );
  }

  const activePlan: ActiveMashupPlan = {
    plan,
    basePath,
    secondaryPath,
    score:
      compatibility.overallScore,
    grade:
      compatibility.grade,
    confidence:
      compatibility.confidence
  };

  activeMashupPlans.set(
    plan.planId,
    activePlan
  );

  return activePlan;
}

async function createPreview(
  request: PreviewRequest
): Promise<PreviewResult> {
  const activePlan =
    await prepareMashupPlan(
      request
    );

  const {
    plan,
    basePath,
    secondaryPath,
    score,
    grade,
    confidence
  } = activePlan;

  const {
    previewDirectory
  } = getMashupOutputDirectories();

  await mkdir(
    previewDirectory,
    {
      recursive: true
    }
  );

  const outputPath =
    join(
      previewDirectory,
      `qdev-preview-${Date.now()}.wav`
    );

  const renderer =
    new AudioMashupRenderer();

  const rendered =
    await renderer.render(
      {
        plan,
        baseTrackPath:
          basePath,
        secondaryTrackPath:
          secondaryPath
      },
      {
        mode: "preview",
        previewDurationSeconds:
          30,
        outputPath,
        normalize: true
      }
    );

  return {
    outputPath,
    planId:
      plan.planId,
    kind: "preview",
    score,
    grade,
    confidence,
    targetBpm:
      plan.targetBpm,
    targetKey:
      plan.targetKey.label,
    durationSeconds:
      rendered.durationSeconds
  };
}

async function createFullMashup(
  planId: string
): Promise<PreviewResult> {
  const activePlan =
    activeMashupPlans.get(
      planId
    );

  if (activePlan === undefined) {
    throw new Error(
      "The mashup plan is no longer available. Render the preview again before creating the full mashup."
    );
  }

  const {
    plan,
    basePath,
    secondaryPath,
    score,
    grade,
    confidence
  } = activePlan;

  const {
    fullDirectory
  } = getMashupOutputDirectories();

  await mkdir(
    fullDirectory,
    {
      recursive: true
    }
  );

  const baseStem =
    safeOutputStem(
      basePath
    );

  const secondaryStem =
    safeOutputStem(
      secondaryPath
    );

  const outputPath =
    join(
      fullDirectory,
      `QDEV - ${baseStem} x ${secondaryStem} - ${Date.now()}.wav`
    );

  const durationSeconds =
    Math.max(
      1,
      Number(
        plan.estimatedDurationSeconds
      )
    );

  const renderer =
    new AudioMashupRenderer();

  const rendered =
    await renderer.render(
      {
        plan,
        baseTrackPath:
          basePath,
        secondaryTrackPath:
          secondaryPath
      },
      {
        mode: "preview",
        previewDurationSeconds:
          durationSeconds,
        outputPath,
        normalize: true
      }
    );

  return {
    outputPath,
    planId:
      plan.planId,
    kind: "full",
    score,
    grade,
    confidence,
    targetBpm:
      plan.targetBpm,
    targetKey:
      plan.targetKey.label,
    durationSeconds:
      rendered.durationSeconds
  };
}

function createTrackResult(
  trackId: string,
  absolutePath: string,
  result: Awaited<
    ReturnType<
      AudioMusicIntelligenceEngine["analyze"]
    >
  >
) {
  return {
    trackId,

    analyzedAtMs:
      Date.now(),

    sourceSizeBytes: 0,

    sourceModifiedTimeMs:
      0,

    durationSeconds:
      result.durationSeconds,

    tempo:
      result.tempo,

    key:
      result.key,

    chords:
      result.chords,

    spectral:
      result.spectral,

    energy:
      classifyEnergy(
        result.spectral
          .loudnessLufs
      ),

    vocalProfile:
      "unknown" as const,

    analysisVersion: 2,

    error: null,

    absolutePath
  };
}

function classifyEnergy(
  loudnessLufs:
    number | null
) {
  if (
    loudnessLufs === null
  ) {
    return "unknown" as const;
  }

  if (
    loudnessLufs < -24
  ) {
    return "very-low" as const;
  }

  if (
    loudnessLufs < -18
  ) {
    return "low" as const;
  }

  if (
    loudnessLufs < -12
  ) {
    return "medium" as const;
  }

  if (
    loudnessLufs < -6
  ) {
    return "high" as const;
  }

  return "very-high" as const;
}

function isAudioFile(
  filePath: string
): boolean {
  const lastDot =
    filePath.lastIndexOf(
      "."
    );

  if (
    lastDot < 0
  ) {
    return false;
  }

  const extension =
    filePath
      .slice(
        lastDot
      )
      .toLowerCase();

  return AUDIO_EXTENSIONS.has(
    extension
  );
}

function assertReadableAudioPath(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("La ruta del audio es obligatoria.");
  }

  const resolvedPath = resolve(value);
  if (!isAudioFile(resolvedPath)) {
    throw new Error("El archivo seleccionado no es un formato de audio compatible.");
  }

  return resolvedPath;
}

function validateStemSeparationRequest(
  value: unknown
): {
  sourcePath: string;
  model?: StemModelName;
  force?: boolean;
} {
  if (typeof value !== "object" || value === null) {
    throw new Error("La solicitud de separación de stems no es válida.");
  }

  const candidate = value as {
    sourcePath?: unknown;
    model?: unknown;
    force?: unknown;
  };

  const sourcePath = assertReadableAudioPath(candidate.sourcePath);
  const model = candidate.model === undefined ? undefined : candidate.model;
  if (model !== undefined && model !== "htdemucs" && model !== "htdemucs_ft") {
    throw new Error("El modelo de separación no es válido.");
  }

  return {
    sourcePath,
    model: model as StemModelName | undefined,
    force: candidate.force === true
  };
}

function createTrackId(sourcePath: string): string {
  return createHash("sha256").update(resolve(sourcePath), "utf8").digest("hex");
}

function isPreviewRequest(
  value: unknown
): value is PreviewRequest {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<PreviewRequest>;

  return (
    typeof candidate.baseTrackPath ===
      "string" &&
    typeof candidate.secondaryTrackPath ===
      "string"
  );
}

app.whenReady().then(
  () => {
    registerIpc();

    createWindow();

    app.on(
      "activate",
      () => {
        if (
          BrowserWindow
            .getAllWindows()
            .length === 0
        ) {
          createWindow();
        }
      }
    );
  }
);

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);