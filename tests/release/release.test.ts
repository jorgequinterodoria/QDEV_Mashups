import { describe, expect, it } from "vitest";
import {
  RELEASE_LOCALE,
  RELEASE_PRODUCT_NAME,
  RELEASE_STEMS,
  RELEASE_VERSION,
  buildReleaseManifest,
} from "../../src/release";

describe("Release 1.0 de QDEV Mashups", () => {
  it("define la versión congelada de Release 1.0", () => {
    expect(RELEASE_PRODUCT_NAME).toBe("QDEV Mashups");
    expect(RELEASE_VERSION).toBe("1.0.0");
    expect(RELEASE_LOCALE).toBe("es-CO");
  });

  it("mantiene exactamente los cuatro stems oficiales", () => {
    expect(RELEASE_STEMS).toEqual(["vocals", "drums", "bass", "other"]);
  });

  it("genera un manifiesto macOS arm64 válido", () => {
    expect(
      buildReleaseManifest({
        packageName: "QDEV Mashups",
        version: "1.0.0",
        artifactPath: "dist/QDEV Mashups-1.0.0-arm64.dmg",
        artifactExists: true,
        artifactBytes: 100,
      }),
    ).toEqual({
      productName: "QDEV Mashups",
      version: "1.0.0",
      platform: "darwin",
      architecture: "arm64",
      artifactPath: "dist/QDEV Mashups-1.0.0-arm64.dmg",
      artifactType: "dmg",
      stems: ["vocals", "drums", "bass", "other"],
      locale: "es-CO",
    });
  });

  it("rechaza una versión distinta de 1.0.0", () => {
    expect(() =>
      buildReleaseManifest({
        packageName: "QDEV Mashups",
        version: "0.1.0",
        artifactPath: "dist/QDEV Mashups-0.1.0-arm64.dmg",
        artifactExists: true,
        artifactBytes: 100,
      }),
    ).toThrow("La versión de Release 1.0 debe ser 1.0.0");
  });

  it("rechaza un artefacto inexistente", () => {
    expect(() =>
      buildReleaseManifest({
        packageName: "QDEV Mashups",
        version: "1.0.0",
        artifactPath: "dist/QDEV Mashups-1.0.0-arm64.dmg",
        artifactExists: false,
        artifactBytes: 0,
      }),
    ).toThrow("No existe el artefacto de release");
  });

  it("rechaza un paquete con nombre incorrecto", () => {
    expect(() =>
      buildReleaseManifest({
        packageName: "Otro producto",
        version: "1.0.0",
        artifactPath: "dist/QDEV Mashups-1.0.0-arm64.dmg",
        artifactExists: true,
        artifactBytes: 100,
      }),
    ).toThrow("El nombre del paquete debe ser");
  });
});
