import { createHash } from "node:crypto";

import type { LibraryFolder } from "./types";

function createId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createFolderId(relativePath: string): string {
  return createId(`folder:${relativePath}`);
}

export function createTrackId(relativePath: string): string {
  return createId(`track:${relativePath}`);
}

export function createTrackContentFingerprint(
  sizeBytes: number,
  modifiedTimeMs: number
): string {
  return createId(`file:${sizeBytes}:${modifiedTimeMs}`);
}

export function createFolder(
  rootPath: string,
  relativePath: string
): LibraryFolder {
  const normalizedRelativePath = relativePath.replaceAll("\\", "/");
  const segments = normalizedRelativePath
    .split("/")
    .filter((segment) => segment.length > 0);

  const name =
    segments.length > 0
      ? segments[segments.length - 1]
      : rootPath.split("/").filter(Boolean).pop() ?? rootPath;

  const parentRelativePath =
    segments.length > 1 ? segments.slice(0, -1).join("/") : null;

  return {
    id: createFolderId(normalizedRelativePath),
    relativePath: normalizedRelativePath,
    absolutePath:
      normalizedRelativePath.length === 0
        ? rootPath
        : `${rootPath}/${normalizedRelativePath}`,
    name,
    parentId:
      parentRelativePath === null
        ? null
        : createFolderId(parentRelativePath),
    depth: segments.length
  };
}

export function createTrackIdFromFolderAndFile(
  folderRelativePath: string,
  fileName: string
): string {
  const normalizedFolder = folderRelativePath.replaceAll("\\", "/");
  const relativePath =
    normalizedFolder.length === 0
      ? fileName
      : `${normalizedFolder}/${fileName}`;

  return createTrackId(relativePath);
}