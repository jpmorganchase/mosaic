import fs, { existsSync, mkdirSync } from 'fs';
import path from 'path';

interface CacheEntry {
  thumbnails: Record<string, string>;
  fileLastModified: string;
  cachedAt: number;
}

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

  private isCacheValidWithModificationCheck(
    cacheFilePath: string,
    currentFileLastModified?: string
  ): boolean {
    try {
      if (!fs.existsSync(cacheFilePath)) {
        return false;
      }

      const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
      const cacheEntry: CacheEntry = JSON.parse(cacheContent);
      const ageInMs = Date.now() - cacheEntry.cachedAt;
      if (ageInMs >= this.ttl) {
        return false;
      }

      if (currentFileLastModified) {
        const currentModTime = new Date(currentFileLastModified).getTime();
        const cachedModTime = new Date(cacheEntry.fileLastModified).getTime();
        if (currentModTime > cachedModTime) {
          console.log(
            `[Figma-Source] File was modified after cache (file: ${currentFileLastModified}, cache: ${cacheEntry.fileLastModified})`
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error(`[Figma-Source] Error reading cache for modification check: ${error}`);
      return false;
    }
  }

  public getThumbnails(fileId: string, fileLastModified?: string): Record<string, string> | null {
    const cacheFilePath = this.getCacheFilePath(fileId);

    if (!this.isCacheValidWithModificationCheck(cacheFilePath, fileLastModified)) {
      if (existsSync(cacheFilePath)) {
        try {
          const reason = fileLastModified ? 'file modification or TTL expiry' : 'TTL expiry';
          fs.unlinkSync(cacheFilePath);
          console.log(
            `[Figma-Source] Removed invalid cache file: thumbnail-${fileId}.json (reason: ${reason})`
          );
        } catch (error) {
          console.error(`[Figma-Source] Error removing invalid cache file: ${error}`);
        }
      }
      return null;
    }

    try {
      const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
      const cacheEntry: CacheEntry = JSON.parse(cacheContent);
      return cacheEntry.thumbnails;
    } catch (error) {
      console.error(`[Figma-Source] Error reading thumbnail cache: ${error}`);
      return null;
    }
  }

  public storeThumbnails(
    fileId: string,
    thumbnails: Record<string, string>,
    fileLastModified?: string
  ): void {
    const cacheFilePath = this.getCacheFilePath(fileId);

    const cacheEntry: CacheEntry = {
      thumbnails,
      fileLastModified: fileLastModified || new Date().toISOString(),
      cachedAt: Date.now()
    };

    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheEntry));
      console.log(
        `[Figma-Source] Cached ${
          Object.keys(thumbnails).length
        } thumbnails for file ${fileId} (lastModified: ${cacheEntry.fileLastModified})`
      );
    } catch (error) {
      console.error(`[Figma-Source] Error writing thumbnail cache: ${error}`);
    }
  }
}
