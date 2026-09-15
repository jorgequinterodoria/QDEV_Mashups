/* global console */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packagePath = resolve("package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));

if (!packageJson.scripts || typeof packageJson.scripts !== "object") {
  packageJson.scripts = {};
}

packageJson.scripts["verify:packaging"] = "node scripts/verify-packaging.mjs";
packageJson.scripts["check:release-bundle"] =
  "node scripts/check-release-bundle.mjs";

await writeFile(
  packagePath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf8"
);

console.log("Scripts de packaging registrados correctamente en package.json.");
console.log("  verify:packaging");
console.log("  check:release-bundle");
