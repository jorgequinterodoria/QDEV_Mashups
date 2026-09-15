import type { ReleaseManifest, ReleaseValidationInput } from "./types";

export const RELEASE_VERSION = "1.0.0" as const;
export const RELEASE_PRODUCT_NAME = "QDEV Mashups" as const;
export const RELEASE_LOCALE = "es-CO" as const;
export const RELEASE_STEMS = ["vocals", "drums", "bass", "other"] as const;

export function buildReleaseManifest(
  input: ReleaseValidationInput,
): ReleaseManifest {
  if (input.packageName !== RELEASE_PRODUCT_NAME) {
    throw new Error(
      `El nombre del paquete debe ser "${RELEASE_PRODUCT_NAME}".`,
    );
  }

  if (input.version !== RELEASE_VERSION) {
    throw new Error(
      `La versión de Release 1.0 debe ser ${RELEASE_VERSION}. Versión detectada: ${input.version}.`,
    );
  }

  if (!input.artifactExists) {
    throw new Error(`No existe el artefacto de release: ${input.artifactPath}`);
  }

  if (!Number.isFinite(input.artifactBytes) || input.artifactBytes <= 0) {
    throw new Error("El artefacto de release está vacío o tiene un tamaño inválido.");
  }

  return {
    productName: RELEASE_PRODUCT_NAME,
    version: RELEASE_VERSION,
    platform: "darwin",
    architecture: "arm64",
    artifactPath: input.artifactPath,
    artifactType: "dmg",
    stems: RELEASE_STEMS,
    locale: RELEASE_LOCALE,
  };
}
