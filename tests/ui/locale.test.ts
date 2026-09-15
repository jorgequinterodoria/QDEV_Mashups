import { describe, expect, it } from "vitest";
import {
  APP_LANGUAGE,
  APP_LOCALE,
  formatNumber,
  uiLabels
} from "../../src/ui/locale";

describe("locale de QDEV", () => {
  it("define español de Colombia como idioma de la aplicación", () => {
    expect(APP_LANGUAGE).toBe("es");
    expect(APP_LOCALE).toBe("es-CO");
  });

  it("expone etiquetas principales en español", () => {
    expect(uiLabels.home).toBe("Inicio");
    expect(uiLabels.library).toBe("Biblioteca");
    expect(uiLabels.discovery).toBe("Descubrimiento");
    expect(uiLabels.builder).toBe("Constructor");
    expect(uiLabels.previewStudio).toBe("Estudio de previsualización");
    expect(uiLabels.djPrep).toBe("Preparación DJ");
  });

  it("formatea números con la configuración regional española", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
});
