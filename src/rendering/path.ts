import {
  access,
  mkdir
} from "node:fs/promises";

import {
  dirname,
  resolve
} from "node:path";

export async function ensureInputFile(
  filePath: string
): Promise<string> {
  const resolved =
    resolve(filePath);

  await access(resolved);

  return resolved;
}

export async function ensureOutputDirectory(
  filePath: string
): Promise<string> {
  const resolved =
    resolve(filePath);

  await mkdir(
    dirname(resolved),
    {
      recursive: true
    }
  );

  return resolved;
}

export function assertOutputIsNotInput(
  outputPath: string,
  inputPaths: string[]
): void {
  const output =
    resolve(outputPath);

  for (const inputPath of inputPaths) {
    if (
      output === resolve(inputPath)
    ) {
      throw new Error(
        "The render output cannot overwrite a source audio file."
      );
    }
  }
}