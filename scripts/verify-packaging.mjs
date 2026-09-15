/* global console, process */
import { access, stat } from "node:fs/promises";
import { resolve } from "node:path";

const requiredFiles = [
  "dist/index.html",
  "dist-electron/electron/main.js",
  "tools/mlx-demucs-worker.py",
  "electron-builder.yml",
  "build/entitlements.mac.plist"
];

const failures = [];

for (const relativePath of requiredFiles) {
  const absolutePath = resolve(relativePath);

  try {
    const metadata = await stat(absolutePath);
    if (!metadata.isFile() || metadata.size === 0) {
      failures.push(`${relativePath}: no es un archivo válido o está vacío.`);
    }
  } catch {
    failures.push(`${relativePath}: no existe.`);
  }
}

const forbidden = [
  ".env",
  ".env.local",
  ".env.production",
  ".venv-stems"
];

for (const path of forbidden) {
  try {
    await access(resolve(path));
    if (path === ".venv-stems") {
      console.log(
        `Aviso: ${path} está presente localmente y será excluido explícitamente del paquete.`
      );
    }
  } catch {
    // Ausencia esperada.
  }
}

if (failures.length > 0) {
  console.error("Verificación de packaging fallida:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Verificación de packaging correcta.");
console.log("Destino esperado: release/*.dmg");
