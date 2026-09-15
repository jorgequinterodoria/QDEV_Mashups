/* global console, process */
import { readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const candidateDirectories = [resolve("dist"), resolve("release")];
let bundleDirectory = null;
let entries = [];

for (const directory of candidateDirectories) {
  try {
    const candidateEntries = await readdir(directory, { withFileTypes: true });
    const hasDmg = candidateEntries.some(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".dmg")
    );

    if (hasDmg) {
      bundleDirectory = directory;
      entries = candidateEntries;
      break;
    }
  } catch {
    // Directory may not exist; try the next supported output location.
  }
}

if (!bundleDirectory) {
  console.error(
    "No se encontró un bundle macOS con DMG en dist/ ni en release/. Ejecuta primero el packaging macOS."
  );
  process.exit(1);
}

const artifacts = [];

for (const entry of entries) {
  if (!entry.isFile()) continue;
  const path = join(bundleDirectory, entry.name);
  const metadata = await stat(path);
  const extension = extname(entry.name).toLowerCase();

  if ([".dmg", ".zip", ".yml", ".yaml", ".json"].includes(extension)) {
    artifacts.push({
      name: entry.name,
      bytes: metadata.size
    });
  }
}

const dmgCount = artifacts.filter((item) => item.name.toLowerCase().endsWith(".dmg")).length;

if (dmgCount === 0) {
  console.error(`No se encontró ningún artefacto DMG en ${bundleDirectory}/.`);
  process.exit(1);
}

console.log(`Directorio de release detectado: ${bundleDirectory}`);
console.log(`Artefactos de release encontrados: ${artifacts.length}`);
for (const artifact of artifacts.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`- ${artifact.name} (${artifact.bytes} bytes)`);
}
console.log("Verificación del bundle macOS: correcta.");
