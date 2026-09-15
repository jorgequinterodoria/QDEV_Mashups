/* global console, process */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const packagePath = join(projectRoot, "package.json");
const distPath = join(projectRoot, "dist");
const releasePath = join(projectRoot, "release");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function findDmg() {
  for (const [directory, label] of [
    [distPath, "dist"],
    [releasePath, "release"],
  ]) {
    if (!existsSync(directory)) continue;

    const dmg = readdirSync(directory).find((name) => name.endsWith(".dmg"));
    if (dmg) {
      return {
        label,
        path: join(directory, dmg),
      };
    }
  }

  return null;
}

try {
  if (!existsSync(packagePath)) {
    throw new Error("No existe package.json.");
  }

  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  const errors = [];

  const productName = typeof pkg.build?.productName === "string"
    ? pkg.build.productName
    : typeof pkg.productName === "string"
      ? pkg.productName
      : pkg.name;

  if (productName !== "QDEV Mashups") {
    errors.push(`El nombre comercial del producto debe ser "QDEV Mashups"; detectado: ${productName ?? "(vacío)"}.`);
  }

  if (pkg.version !== "1.0.0") {
    errors.push(`La versión debe ser 1.0.0; detectada: ${pkg.version ?? "(vacía)"}.`);
  }

  if (pkg.type !== "module") {
    errors.push("El package.json debe mantener type=module.");
  }

  if (!pkg.devDependencies?.electron) {
    errors.push("Electron debe estar declarado en devDependencies.");
  }

  if (!existsSync(join(projectRoot, "electron-builder.yml"))) {
    errors.push("Falta electron-builder.yml.");
  }

  const dmg = findDmg();
  if (dmg === null) {
    errors.push("No se encontró ningún DMG en dist/ ni en release/. Ejecuta el packaging macOS de Release 1.0.");
  }

  if (errors.length > 0) {
    for (const error of errors) fail(error);
    process.exit(1);
  }

  const size = statSync(dmg.path).size;
  if (size <= 0) {
    throw new Error(`El DMG existe pero está vacío: ${dmg.path}`);
  }

  console.log("Checklist técnico de Release 1.0: correcta.");
  console.log(`Producto: ${productName}`);
  console.log(`Versión: ${pkg.version}`);
  console.log(`Artefacto: ${dmg.path}`);
  console.log(`Tamaño: ${size} bytes`);
  console.log(`Directorio de artefacto: ${dmg.label}`);
  console.log("Plataforma objetivo: macOS arm64");
  console.log("Idioma contractual: es-CO");
  console.log("Stems contractuales: vocals, drums, bass, other");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
