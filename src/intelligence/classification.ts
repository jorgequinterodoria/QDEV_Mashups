import type {
  EnergyLevel,
  SpectralAnalysis,
  VocalProfile
} from "./types";

export function classifyEnergy(
  spectral: SpectralAnalysis
): EnergyLevel {
  const rms = spectral.rms;

  if (rms === null) {
    return "unknown";
  }

  if (rms < 0.05) {
    return "very-low";
  }

  if (rms < 0.12) {
    return "low";
  }

  if (rms < 0.25) {
    return "medium";
  }

  if (rms < 0.45) {
    return "high";
  }

  return "very-high";
}

export function classifyVocalProfile(
  spectral: SpectralAnalysis
): VocalProfile {
  const centroid =
    spectral.spectralCentroidHz;

  const zcr =
    spectral.zeroCrossingRate;

  if (
    centroid === null ||
    zcr === null
  ) {
    return "unknown";
  }

  if (
    centroid > 1800 &&
    zcr > 0.08
  ) {
    return "likely-vocal";
  }

  if (
    centroid < 1200 &&
    zcr < 0.08
  ) {
    return "likely-instrumental";
  }

  return "unknown";
}