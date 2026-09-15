import { join } from "node:path";

export const DEFAULT_QDEV_STEMS_ROOT =
  "/Volumes/Respaldo Mac/QDEV_Mashups/Stems";

export interface StemPathEnvironment {
  readonly QDEV_STEMS_ROOT?: string;
  readonly QDEV_STEMS_CACHE?: string;
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function resolveStemStorageRoot(
  environment: StemPathEnvironment = process.env
): string {
  return clean(environment.QDEV_STEMS_ROOT) ?? DEFAULT_QDEV_STEMS_ROOT;
}

export function resolveStemCacheRoot(
  environment: StemPathEnvironment = process.env
): string {
  return (
    clean(environment.QDEV_STEMS_CACHE) ??
    join(resolveStemStorageRoot(environment), "Cache")
  );
}
