export const APP_LOCALE = "es-CO" as const;
export const APP_LANGUAGE = "es" as const;

export function applySpanishDocumentLocale(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = APP_LOCALE;
  document.documentElement.dir = "ltr";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(APP_LOCALE).format(value);
}

export function formatDecimal(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    maximumFractionDigits
  }).format(value);
}

export const uiLabels = Object.freeze({
  home: "Inicio",
  library: "Biblioteca",
  discovery: "Descubrimiento",
  builder: "Constructor",
  previewStudio: "Estudio de previsualización",
  djPrep: "Preparación DJ",
  stems: "Stems",
  settings: "Configuración",
  scanLibrary: "Escanear biblioteca",
  rescanLibrary: "Volver a escanear",
  createPreview: "Crear previsualización",
  createFullMashup: "Generar mashup completo",
  separateTrack: "Separar canción",
  localProcessing: "Procesamiento local",
  noCloudUpload: "Sin subir audio a la nube"
} as const);
