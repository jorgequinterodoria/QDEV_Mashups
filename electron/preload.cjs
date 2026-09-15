/* eslint-disable @typescript-eslint/no-require-imports */

const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "qdevDesktop",
  {
    getRuntimeInfo: () =>
      ipcRenderer.invoke("desktop:get-runtime-info"),
    chooseLibrary: () =>
      ipcRenderer.invoke("library:choose"),
    scanLibrary: (libraryRoot) =>
      ipcRenderer.invoke("library:scan", libraryRoot),
    chooseAudioFiles: () =>
      ipcRenderer.invoke("audio:choose"),
    chooseAudioFile: () =>
      ipcRenderer.invoke("audio:choose-one"),
    createPreview: (baseTrackPath, secondaryTrackPath) =>
      ipcRenderer.invoke("mashup:create-preview", {
        baseTrackPath,
        secondaryTrackPath
      }),
    createFullMashup: (planId) =>
      ipcRenderer.invoke("mashup:create-full", planId),
    revealOutput: (outputPath) =>
      ipcRenderer.invoke("output:reveal", outputPath),
    getAudioUrl: (outputPath) =>
      ipcRenderer.invoke("output:get-audio-url", outputPath),
    getSourceAudioUrl: (sourcePath) =>
      ipcRenderer.invoke("audio:get-source-url", sourcePath),
    separateStems: (request) =>
      ipcRenderer.invoke("stems:separate", request),
    cancelStemSeparation: (trackId) =>
      ipcRenderer.invoke("stems:cancel", trackId),
    onStemProgress: (listener) => {
      const handler = (_event, payload) => listener(payload);
      ipcRenderer.on("stems:progress", handler);
      return () => ipcRenderer.removeListener("stems:progress", handler);
    }
  }
);
