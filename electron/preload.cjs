/* eslint-disable @typescript-eslint/no-require-imports */

const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "qdevDesktop",
  {
    getRuntimeInfo: () =>
      ipcRenderer.invoke(
        "desktop:get-runtime-info"
      ),
    chooseLibrary: () =>
      ipcRenderer.invoke(
        "library:choose"
      ),
    scanLibrary: (libraryRoot) =>
      ipcRenderer.invoke(
        "library:scan",
        libraryRoot
      ),
    chooseAudioFiles: () =>
      ipcRenderer.invoke(
        "audio:choose"
      ),
    createPreview: (
      baseTrackPath,
      secondaryTrackPath
    ) =>
      ipcRenderer.invoke(
        "mashup:create-preview",
        {
          baseTrackPath,
          secondaryTrackPath
        }
      ),
    createFullMashup: (
      planId
    ) =>
      ipcRenderer.invoke(
        "mashup:create-full",
        planId
      ),
    revealOutput: (
      outputPath
    ) =>
      ipcRenderer.invoke(
        "output:reveal",
        outputPath
      ),
    getAudioUrl: (
      outputPath
    ) =>
      ipcRenderer.invoke(
        "output:get-audio-url",
        outputPath
      )
  }
);
