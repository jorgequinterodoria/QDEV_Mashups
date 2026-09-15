import {
  describe,
  expect,
  it
} from "vitest";

import {
  getDesktopApi,
  isDesktopRuntime
} from "../../src/desktop/client";

describe(
  "desktop client",
  () => {
    it(
      "returns null outside Electron",
      () => {
        expect(
          getDesktopApi()
        ).toBeNull();

        expect(
          isDesktopRuntime()
        ).toBe(false);
      }
    );
  }
);