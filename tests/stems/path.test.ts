import {
  describe,
  expect,
  it
} from "vitest";

import {
  DEFAULT_QDEV_STEMS_ROOT,
  resolveStemCacheRoot,
  resolveStemStorageRoot
} from "../../src/stems/index.js";

describe("rutas de almacenamiento de stems", () => {
  it("usa Respaldo Mac como almacenamiento predeterminado", () => {
    expect(
      resolveStemStorageRoot({})
    ).toBe(
      DEFAULT_QDEV_STEMS_ROOT
    );
  });

  it("crea la caché dentro del almacenamiento de stems", () => {
    expect(
      resolveStemCacheRoot({})
    ).toBe(
      `${DEFAULT_QDEV_STEMS_ROOT}/Cache`
    );
  });

  it("permite configurar una raíz personalizada", () => {
    expect(
      resolveStemStorageRoot({
        QDEV_STEMS_ROOT:
          "/Volumes/Test/QDEV"
      })
    ).toBe(
      "/Volumes/Test/QDEV"
    );
  });

  it("permite configurar una caché personalizada", () => {
    expect(
      resolveStemCacheRoot({
        QDEV_STEMS_ROOT:
          "/Volumes/Test/QDEV",
        QDEV_STEMS_CACHE:
          "/Volumes/Test/Cache"
      })
    ).toBe(
      "/Volumes/Test/Cache"
    );
  });
});