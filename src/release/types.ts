export interface ReleaseManifest {
  productName: string;
  version: string;
  platform: "darwin";
  architecture: "arm64";
  artifactPath: string;
  artifactType: "dmg";
  stems: readonly ["vocals", "drums", "bass", "other"];
  locale: "es-CO";
}

export interface ReleaseValidationInput {
  packageName: string;
  version: string;
  artifactPath: string;
  artifactExists: boolean;
  artifactBytes: number;
}
