export const UX_LANGUAGE = "es" as const;
export const UX_LOCALE = "es-CO" as const;
export const UX_DIRECTION = "ltr" as const;

export type UiView =
  | "inicio"
  | "biblioteca"
  | "descubrimiento"
  | "constructor"
  | "estudio"
  | "preparacion-dj";

export type UiStatus =
  | "idle"
  | "loading"
  | "ready"
  | "success"
  | "warning"
  | "error"
  | "cancelled";

export interface UiLabelCatalog {
  readonly appName: string;
  readonly home: string;
  readonly library: string;
  readonly discovery: string;
  readonly builder: string;
  readonly previewStudio: string;
  readonly djPrep: string;
  readonly settings: string;
  readonly scanLibrary: string;
  readonly rescanLibrary: string;
  readonly findMashups: string;
  readonly createPreview: string;
  readonly renderMashup: string;
  readonly exportDj: string;
  readonly cancel: string;
  readonly close: string;
  readonly retry: string;
  readonly reset: string;
  readonly save: string;
  readonly remove: string;
  readonly play: string;
  readonly pause: string;
  readonly stop: string;
  readonly back: string;
  readonly next: string;
  readonly select: string;
  readonly ready: string;
  readonly loading: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly cancelled: string;
  readonly noResults: string;
  readonly libraryEmpty: string;
  readonly selectMashup: string;
  readonly renderFirst: string;
  readonly exportReady: string;
}

export const uiLabels: UiLabelCatalog = {
  appName: "QDEV Mashups",
  home: "Inicio",
  library: "Biblioteca",
  discovery: "Descubrimiento",
  builder: "Constructor",
  previewStudio: "Estudio de previsualización",
  djPrep: "Preparación DJ",
  settings: "Configuración",
  scanLibrary: "Analizar biblioteca",
  rescanLibrary: "Volver a analizar biblioteca",
  findMashups: "Encontrar mashups",
  createPreview: "Crear previsualización",
  renderMashup: "Renderizar mashup",
  exportDj: "Exportar para DJ",
  cancel: "Cancelar",
  close: "Cerrar",
  retry: "Reintentar",
  reset: "Restablecer",
  save: "Guardar",
  remove: "Eliminar",
  play: "Reproducir",
  pause: "Pausar",
  stop: "Detener",
  back: "Atrás",
  next: "Siguiente",
  select: "Seleccionar",
  ready: "Listo",
  loading: "Cargando",
  success: "Completado",
  warning: "Advertencia",
  error: "Error",
  cancelled: "Cancelado",
  noResults: "Sin resultados",
  libraryEmpty: "La biblioteca está vacía.",
  selectMashup:
    "Selecciona una combinación compatible para continuar.",
  renderFirst:
    "Renderiza la previsualización antes de continuar.",
  exportReady:
    "El paquete DJ está listo para exportarse."
};

export const uiViews: Readonly<
  Record<UiView, string>
> = {
  inicio: uiLabels.home,
  biblioteca: uiLabels.library,
  descubrimiento: uiLabels.discovery,
  constructor: uiLabels.builder,
  estudio: uiLabels.previewStudio,
  "preparacion-dj": uiLabels.djPrep
};

export const uiStatusLabels: Readonly<
  Record<UiStatus, string>
> = {
  idle: "Listo",
  loading: "Cargando",
  ready: "Listo",
  success: "Completado",
  warning: "Advertencia",
  error: "Error",
  cancelled: "Cancelado"
};

export interface UiErrorMessage {
  readonly code: string;
  readonly title: string;
  readonly message: string;
  readonly recovery: string;
  readonly severity: "warning" | "error";
}

const errors: Readonly<
  Record<string, UiErrorMessage>
> = {
  "library-read": {
    code: "library-read",
    title: "No se pudo leer la biblioteca",
    message:
      "La carpeta seleccionada no pudo analizarse correctamente.",
    recovery:
      "Comprueba el acceso a la carpeta y vuelve a intentarlo.",
    severity: "error"
  },
  "analysis-failed": {
    code: "analysis-failed",
    title: "El análisis no terminó correctamente",
    message:
      "Una o más pistas no pudieron analizarse.",
    recovery:
      "Revisa los archivos afectados o vuelve a ejecutar el análisis.",
    severity: "warning"
  },
  "mashup-incompatible": {
    code: "mashup-incompatible",
    title: "La combinación no es compatible",
    message:
      "La compatibilidad musical está por debajo del umbral requerido.",
    recovery:
      "Selecciona otra combinación en Descubrimiento.",
    severity: "warning"
  },
  "render-failed": {
    code: "render-failed",
    title: "No se pudo renderizar el mashup",
    message:
      "El motor de renderizado no pudo completar el archivo.",
    recovery:
      "Comprueba el plan del mashup y vuelve a intentarlo.",
    severity: "error"
  },
  "export-failed": {
    code: "export-failed",
    title: "No se pudo exportar",
    message:
      "El paquete DJ no pudo generarse correctamente.",
    recovery:
      "Comprueba la carpeta de destino y vuelve a intentarlo.",
    severity: "error"
  },
  "operation-cancelled": {
    code: "operation-cancelled",
    title: "Operación cancelada",
    message:
      "La operación fue detenida antes de finalizar.",
    recovery:
      "Puedes volver a iniciarla cuando estés preparado.",
    severity: "warning"
  }
};

export function getUiError(
  code: string
): UiErrorMessage {
  return (
    errors[code] ?? {
      code,
      title: "Se produjo un error",
      message:
        "QDEV Mashups no pudo completar la operación solicitada.",
      recovery:
        "Vuelve a intentarlo. Si el problema continúa, revisa el estado de la aplicación.",
      severity: "error"
    }
  );
}

export function statusLabel(
  status: UiStatus
): string {
  return uiStatusLabels[status];
}

export function viewLabel(
  view: UiView
): string {
  return uiViews[view];
}

export interface AriaAttributes {
  readonly "aria-label"?: string;
  readonly "aria-labelledby"?: string;
  readonly "aria-describedby"?: string;
  readonly "aria-live"?: "off" | "polite" | "assertive";
  readonly "aria-busy"?: "true" | "false";
  readonly "aria-current"?:
    | "page"
    | "step"
    | "location"
    | "date"
    | "time"
    | true
    | false;
  readonly role?: string;
}

export function actionAriaLabel(
  action: keyof Pick<
    UiLabelCatalog,
    | "scanLibrary"
    | "rescanLibrary"
    | "findMashups"
    | "createPreview"
    | "renderMashup"
    | "exportDj"
    | "cancel"
    | "close"
    | "retry"
    | "reset"
    | "save"
    | "remove"
    | "play"
    | "pause"
    | "stop"
    | "back"
    | "next"
    | "select"
  >
): AriaAttributes {
  return {
    "aria-label": uiLabels[action]
  };
}

export function busyAriaAttributes(
  busy: boolean
): AriaAttributes {
  return {
    "aria-busy": busy ? "true" : "false",
    "aria-live": busy ? "polite" : "off"
  };
}

export function navigationAriaAttributes(
  current: boolean
): AriaAttributes {
  return {
    "aria-current": current ? "page" : false
  };
}

export function liveRegionAttributes(
  status: UiStatus
): AriaAttributes {
  return {
    role: "status",
    "aria-live":
      status === "error" ? "assertive" : "polite"
  };
}

export interface UiDesignTokens {
  readonly fontFamily: string;
  readonly radiusSmall: string;
  readonly radiusMedium: string;
  readonly radiusLarge: string;
  readonly spacingUnit: string;
  readonly focusRing: string;
  readonly minInteractiveHeight: string;
  readonly maxReadableWidth: string;
  readonly transitionFast: string;
}

export const uiDesignTokens: UiDesignTokens = {
  fontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  radiusSmall: "6px",
  radiusMedium: "10px",
  radiusLarge: "16px",
  spacingUnit: "4px",
  focusRing: "2px solid currentColor",
  minInteractiveHeight: "40px",
  maxReadableWidth: "72ch",
  transitionFast: "140ms ease"
};

export interface UiFlowState {
  readonly view: UiView;
  readonly status: UiStatus;
  readonly busy: boolean;
  readonly errorCode: string | null;
  readonly selected: boolean;
}

export function flowMessage(
  state: UiFlowState
): string {
  if (state.errorCode) {
    return getUiError(state.errorCode).message;
  }

  if (state.busy || state.status === "loading") {
    return "La operación está en curso.";
  }

  if (state.status === "success") {
    return "La operación terminó correctamente.";
  }

  if (state.status === "cancelled") {
    return "La operación fue cancelada.";
  }

  if (
    (state.view === "constructor" ||
      state.view === "estudio" ||
      state.view === "preparacion-dj") &&
    !state.selected
  ) {
    return uiLabels.selectMashup;
  }

  return uiStatusLabels[state.status];
}

export function validateUiText(
  value: string
): boolean {
  return (
    value.trim().length > 0 &&
    !/\b(?:Overview|Library|Settings|Ready|Loading|Error|Cancel|Retry|Save|Delete|Play|Pause|Stop)\b/u.test(
      value
    )
  );
}

export function formatUiNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    UX_LOCALE
  ).format(value);
}

export function formatUiPercent(
  value: number
): string {
  const clamped = Math.min(100, Math.max(0, value));
  return `${formatUiNumber(
    Math.round(clamped * 10) / 10
  )}%`;
}
