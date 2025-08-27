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

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key for a file ID
   */
  private getCacheFilePath(fileId: string): string {
    return path.join(this.cacheDir, `thumbnail-${fileId}.json`);
  }

  /**
   * Check if the cache file exists and is still valid (not expired)
   */
  private isCacheValid(cacheFilePath: string): boolean {
    if (!existsSync(cacheFilePath)) {
      return false;
    }

    const stats = fs.statSync(cacheFilePath);
    const ageInMs = Date.now() - stats.mtimeMs;
    return ageInMs < this.ttl;
  }

  /**
   * Get cached thumbnail URLs for a file
   * @returns A map of nodeIds to thumbnail URLs, or null if cache miss
   */
  public getThumbnails(fileId: string): Record<string, string> | null {
    const cacheFilePath = this.getCacheFilePath(fileId);

    if (!this.isCacheValid(cacheFilePath)) {
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

  /**
   * Store thumbnail URLs in the cache
   */
  public storeThumbnails(fileId: string, thumbnails: Record<string, string>): void {
    const cacheFilePath = this.getCacheFilePath(fileId);

    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(thumbnails));
    } catch (error) {
      console.error(`[Figma-Source] Error writing thumbnail cache: ${error}`);
    }
  }
}
