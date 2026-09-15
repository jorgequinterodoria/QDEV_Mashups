import { describe, expect, it } from "vitest";

import {
  UX_LANGUAGE,
  UX_LOCALE,
  actionAriaLabel,
  busyAriaAttributes,
  formatUiNumber,
  formatUiPercent,
  flowMessage,
  getUiError,
  liveRegionAttributes,
  navigationAriaAttributes,
  uiDesignTokens,
  uiLabels,
  uiStatusLabels,
  uiViews,
  validateUiText
} from "../../src/ui/ux-spanish.js";

describe("UX/UI completa en español", () => {
  it("define español de Colombia como contrato de interfaz", () => {
    expect(UX_LANGUAGE).toBe("es");
    expect(UX_LOCALE).toBe("es-CO");
  });

  it("mantiene las secciones principales completamente traducidas", () => {
    expect(uiLabels.home).toBe("Inicio");
    expect(uiLabels.library).toBe("Biblioteca");
    expect(uiLabels.discovery).toBe("Descubrimiento");
    expect(uiLabels.builder).toBe("Constructor");
    expect(uiLabels.previewStudio).toBe(
      "Estudio de previsualización"
    );
    expect(uiLabels.djPrep).toBe("Preparación DJ");
  });

  it("mantiene estados de interfaz en español", () => {
    expect(uiStatusLabels.ready).toBe("Listo");
    expect(uiStatusLabels.loading).toBe("Cargando");
    expect(uiStatusLabels.success).toBe("Completado");
    expect(uiStatusLabels.warning).toBe("Advertencia");
    expect(uiStatusLabels.error).toBe("Error");
    expect(uiStatusLabels.cancelled).toBe("Cancelado");
  });

  it("expone mensajes de error accionables", () => {
    const error = getUiError("render-failed");

    expect(error.title).toBe(
      "No se pudo renderizar el mashup"
    );
    expect(error.message).toContain("motor de renderizado");
    expect(error.recovery).toContain("vuelve a intentarlo");
    expect(error.severity).toBe("error");
  });

  it("tiene fallback seguro para errores desconocidos", () => {
    const error = getUiError("unknown-error");

    expect(error.title).toBe("Se produjo un error");
    expect(error.recovery.length).toBeGreaterThan(10);
  });

  it("genera atributos ARIA consistentes", () => {
    expect(
      actionAriaLabel("createPreview")["aria-label"]
    ).toBe("Crear previsualización");

    expect(
      busyAriaAttributes(true)
    ).toEqual({
      "aria-busy": "true",
      "aria-live": "polite"
    });

    expect(
      navigationAriaAttributes(true)
    ).toEqual({
      "aria-current": "page"
    });

    expect(
      liveRegionAttributes("error")
    ).toEqual({
      role: "status",
      "aria-live": "assertive"
    });
  });

  it("define una base visual consistente", () => {
    expect(uiDesignTokens.radiusMedium).toBe("10px");
    expect(uiDesignTokens.minInteractiveHeight).toBe("40px");
    expect(uiDesignTokens.maxReadableWidth).toBe("72ch");
    expect(uiDesignTokens.focusRing).toContain("solid");
  });

  it("calcula mensajes coherentes para los estados del flujo", () => {
    expect(
      flowMessage({
        view: "biblioteca",
        status: "ready",
        busy: false,
        errorCode: null,
        selected: false
      })
    ).toBe("Listo");

    expect(
      flowMessage({
        view: "constructor",
        status: "ready",
        busy: false,
        errorCode: null,
        selected: false
      })
    ).toBe(
      "Selecciona una combinación compatible para continuar."
    );

    expect(
      flowMessage({
        view: "constructor",
        status: "error",
        busy: false,
        errorCode: "render-failed",
        selected: true
      })
    ).toBe(
      "El motor de renderizado no pudo completar el archivo."
    );
  });

  it("formatea números y porcentajes con es-CO", () => {
    expect(formatUiNumber(1234567)).toBe(
      "1.234.567"
    );
    expect(formatUiPercent(87.56)).toBe(
      "87,6%"
    );
  });

  it("expone etiquetas de navegación españolas", () => {
    expect(uiViews.inicio).toBe("Inicio");
    expect(uiViews.biblioteca).toBe("Biblioteca");
    expect(uiViews.estudio).toBe(
      "Estudio de previsualización"
    );
  });

  it("rechaza textos con vocabulario de interfaz en inglés", () => {
    expect(validateUiText("Biblioteca lista")).toBe(true);
    expect(validateUiText("Library ready")).toBe(false);
  });

  it("mantiene todos los textos principales no vacíos", () => {
    for (const value of Object.values(uiLabels)) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
