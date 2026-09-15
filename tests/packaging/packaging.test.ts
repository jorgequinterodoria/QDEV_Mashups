import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("PHASE 26 — Packaging macOS", () => {
  it("incluye los archivos de packaging obligatorios", async () => {
    const required = [
      "electron-builder.yml",
      "build/entitlements.mac.plist",
      "scripts/verify-packaging.mjs",
      "scripts/check-release-bundle.mjs"
    ];

    for (const relativePath of required) {
      await expect(access(resolve(relativePath))).resolves.toBeUndefined();
    }
  });

  it("configura DMG para macOS y categoría musical", async () => {
    const config = await readFile(
      resolve("electron-builder.yml"),
      "utf8"
    );

    expect(config).toContain("target:");
    expect(config).toContain("dmg");
    expect(config).toContain("public.app-category.music");
    expect(config).toContain("dist/**");
    expect(config).toContain("dist-electron/**");
  });

  it("excluye el entorno Python de desarrollo del paquete", async () => {
    const config = await readFile(
      resolve("electron-builder.yml"),
      "utf8"
    );

    expect(config).toContain('"!**/.venv-stems/**"');
  });

  it("incluye el worker MLX-Demucs como recurso externo", async () => {
    const config = await readFile(
      resolve("electron-builder.yml"),
      "utf8"
    );

    expect(config).toContain("tools/mlx-demucs-worker.py");
    expect(config).toContain("worker/mlx-demucs-worker.py");
  });

  it("mantiene fuera del paquete los mapas de producción", async () => {
    const config = await readFile(
      resolve("electron-builder.yml"),
      "utf8"
    );

    expect(config).toContain('"!**/*.map"');
  });

  it("incluye el instalador de scripts de packaging", async () => {
    await expect(
      access(resolve("scripts/install-packaging-scripts.mjs"))
    ).resolves.toBeUndefined();
  });

  it("permite validar el bundle tanto en dist/ como en release/", async () => {
    const script = await readFile(
      resolve("scripts/check-release-bundle.mjs"),
      "utf8"
    );

    expect(script).toContain('resolve("dist")');
    expect(script).toContain('resolve("release")');
    expect(script).toContain(".dmg");
  });

  it("habilita runtime endurecido en macOS", async () => {
    const config = await readFile(
      resolve("electron-builder.yml"),
      "utf8"
    );

    expect(config).toContain("hardenedRuntime: true");
  });
});
