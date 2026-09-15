import type {
  QdevDesktopApi
} from "./types";

export function getDesktopApi():
  QdevDesktopApi | null {
  if (
    typeof window ===
      "undefined" ||
    !(
      "qdevDesktop" in
      window
    )
  ) {
    return null;
  }

  return (
    window as typeof window & {
      qdevDesktop:
        QdevDesktopApi;
    }
  ).qdevDesktop;
}

export function isDesktopRuntime():
  boolean {
  return (
    getDesktopApi() !==
    null
  );
}