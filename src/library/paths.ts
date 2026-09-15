import { relative, resolve, sep } from "node:path";

export function normalizeRootPath(rootPath: string): string {
  return resolve(rootPath);
}

export function normalizeRelativePath(
  rootPath: string,
  absolutePath: string
): string {
  const root = normalizeRootPath(rootPath);
  const absolute = resolve(absolutePath);
  const value = relative(root, absolute);

  if (value === "") {
    return "";
  }

  return value.split(sep).join("/");
}

export function isPathInsideRoot(
  rootPath: string,
  candidatePath: string
): boolean {
  const root = normalizeRootPath(rootPath);
  const candidate = resolve(candidatePath);
  const relativePath = relative(root, candidate);

  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) &&
      relativePath !== ".." &&
      !relativePath.startsWith("/"))
  );
}