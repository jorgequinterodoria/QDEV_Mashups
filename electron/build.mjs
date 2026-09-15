import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const electronDirectory = dirname(currentFile);
const projectRoot = resolve(electronDirectory, "..");

const outputDirectory = resolve(
  projectRoot,
  "dist-electron"
);

const outputFile = resolve(
  outputDirectory,
  "electron",
  "main.js"
);

await rm(outputDirectory, {
  recursive: true,
  force: true
});

await mkdir(dirname(outputFile), {
  recursive: true
});

await build({
  entryPoints: [
    resolve(
      projectRoot,
      "electron",
      "main.ts"
    )
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  outfile: outputFile,
  sourcemap: true,
  packages: "external",
  external: [
    "electron"
  ],
  logLevel: "info"
});

console.log("");
console.log(
  "Electron production bundle generated:"
);
console.log(outputFile);