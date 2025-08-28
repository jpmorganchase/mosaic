import fs from 'fs';
import path from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * A cache for Figma thumbnail URLs to reduce API calls and avoid rate limits
 */
export class ThumbnailCache {
  private cacheDir: string;
  private ttl: number;
  private maxCacheAge: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number;

  constructor(options: {
    cacheDir: string;
    ttl: number;
    maxCacheAge?: number;
    cleanupIntervalMs?: number;
  }) {
    this.cacheDir = options.cacheDir;
    this.ttl = options.ttl;
    // Default max cache age is 7 days
    this.maxCacheAge = options.maxCacheAge || 7 * 24 * 60 * 60 * 1000;
    // Default cleanup interval is 1 hour
    this.cleanupIntervalMs = options.cleanupIntervalMs || 60 * 60 * 1000;

    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    this.cleanStaleCache();
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup of stale cache files
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanStaleCache();
    }, this.cleanupIntervalMs);

    // Ensure the interval doesn't prevent the process from exiting
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop the periodic cleanup
   */
  public stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
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

  /**
   * Clean up stale cache files that are older than maxCacheAge
   */
  public cleanStaleCache(): void {
    try {
      const now = Date.now();
      const files = fs.readdirSync(this.cacheDir);

      let removed = 0;
      for (const file of files) {
        if (file.startsWith('thumbnail-') && file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtimeMs;

          if (fileAge > this.maxCacheAge) {
            fs.unlinkSync(filePath);
            removed++;
          }
        }
      }

      if (removed > 0) {
        console.log(`[Figma-Source] Cleaned up ${removed} stale cache files`);
      }
    } catch (error) {
      console.error(`[Figma-Source] Error cleaning stale cache: ${error}`);
    }
  }
}
