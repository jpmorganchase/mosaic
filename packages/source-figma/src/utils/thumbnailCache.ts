import fs from 'fs';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * A cache for Figma thumbnail URLs to reduce API calls and avoid rate limits
 */
export class ThumbnailCache {
  private cacheDir: string;
  private ttl: number;

  constructor(options: { cacheDir: string; ttl: number }) {
    this.cacheDir = options.cacheDir;
    this.ttl = options.ttl;

    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(fileId: string): string {
    return path.join(this.cacheDir, `thumbnail-${fileId}.json`);
  }

  private isCacheValid(cacheFilePath: string): boolean {
    if (!existsSync(cacheFilePath)) {
      return false;
    }

    const stats = fs.statSync(cacheFilePath);
    const ageInMs = Date.now() - stats.mtimeMs;
    return ageInMs < this.ttl;
  }

  public getThumbnails(fileId: string): Record<string, string> | null {
    const cacheFilePath = this.getCacheFilePath(fileId);

    if (!this.isCacheValid(cacheFilePath)) {
      // If cache is invalid due to age, delete the stale file immediately
      if (existsSync(cacheFilePath)) {
        try {
          const stats = fs.statSync(cacheFilePath);
          const ageInMs = Date.now() - stats.mtimeMs;
          if (ageInMs >= this.ttl) {
            fs.unlinkSync(cacheFilePath);
            console.log(
              `[Figma-Source] Removed expired cache file: thumbnail-${fileId}.json (age: ${Math.round(
                ageInMs / 1000 / 60
              )} minutes)`
            );
          }
        } catch (error) {
          console.error(`[Figma-Source] Error removing expired cache file: ${error}`);
        }
      }
      return null;
    }

    try {
      const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
      return JSON.parse(cacheContent);
    } catch (error) {
      console.error(`[Figma-Source] Error reading thumbnail cache: ${error}`);
      return null;
    }
  }

  public storeThumbnails(fileId: string, thumbnails: Record<string, string>): void {
    const cacheFilePath = this.getCacheFilePath(fileId);

    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(thumbnails));
      console.log(
        `[Figma-Source] Cached ${Object.keys(thumbnails).length} thumbnails for file ${fileId}`
      );
    } catch (error) {
      console.error(`[Figma-Source] Error writing thumbnail cache: ${error}`);
    }
  }
}
