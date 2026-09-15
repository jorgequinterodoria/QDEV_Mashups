import type {
  QdevDesktopApi
} from "./types";

declare global {
  interface Window {
    qdevDesktop?: QdevDesktopApi;
  }
}

export {};