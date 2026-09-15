import { LibraryScanner } from "./scanner";
import type {
  LibraryRepository,
  LibraryScanResult
} from "./types";

export class LibraryService {
  constructor(
    private readonly scanner: LibraryScanner,
    private readonly repository: LibraryRepository
  ) {}

  async synchronize(rootPath: string): Promise<LibraryScanResult> {
    const previousSnapshot = await this.repository.load();

    if (
      previousSnapshot &&
      previousSnapshot.rootPath !== rootPath
    ) {
      throw new Error(
        `Library root mismatch. Existing library is "${previousSnapshot.rootPath}" but "${rootPath}" was requested.`
      );
    }

    const result = await this.scanner.scan(
      rootPath,
      previousSnapshot
    );

    await this.repository.save(result.snapshot);

    return result;
  }

  async getSnapshot() {
    return this.repository.load();
  }
}