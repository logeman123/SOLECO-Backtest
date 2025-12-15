// IndexedDB cache service for price data
import { CachedAssetData, NormalizedPriceData } from '../types/coingecko';
import { API_CONFIG } from '../config/apiConfig';

const DB_NAME = 'soleco-price-cache';
const DB_VERSION = 1;
const STORE_NAME = 'price-data';

class CacheService {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  // Initialize IndexedDB
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // Generate cache key
  private getCacheKey(coingeckoId: string, days: number): string {
    return `${coingeckoId}:${days}`;
  }

  // Get cached data
  async get(coingeckoId: string, days: number): Promise<CachedAssetData | null> {
    try {
      const db = await this.getDB();
      const key = this.getCacheKey(coingeckoId, days);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check if expired
          if (this.isExpired(result)) {
            // Don't delete here, let it be overwritten on next fetch
            resolve(null);
            return;
          }

          resolve(result.data as CachedAssetData);
        };
      });
    } catch (error) {
      console.warn('Cache get failed, falling back to no cache:', error);
      return null;
    }
  }

  // Set cached data
  async set(coingeckoId: string, days: number, data: NormalizedPriceData): Promise<void> {
    try {
      const db = await this.getDB();
      const key = this.getCacheKey(coingeckoId, days);
      const now = Date.now();

      const cacheEntry = {
        key,
        data: {
          coingeckoId,
          data,
          fetchedAt: now,
          expiresAt: now + API_CONFIG.CACHE_TTL_MS,
        } as CachedAssetData,
        expiresAt: now + API_CONFIG.CACHE_TTL_MS,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(cacheEntry);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Cache set failed:', error);
      return Promise.resolve();
    }
  }

  // Check if cache entry is expired
  private isExpired(entry: { expiresAt: number }): boolean {
    return Date.now() > entry.expiresAt;
  }

  // Delete specific cache entry
  async delete(coingeckoId: string, days: number): Promise<void> {
    try {
      const db = await this.getDB();
      const key = this.getCacheKey(coingeckoId, days);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Cache delete failed:', error);
      return Promise.resolve();
    }
  }

  // Clear all cached data
  async clear(): Promise<void> {
    try {
      const db = await this.getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Cache clear failed:', error);
      return Promise.resolve();
    }
  }

  // Clean up expired entries
  async cleanExpired(): Promise<number> {
    try {
      const db = await this.getDB();
      const now = Date.now();
      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('expiresAt');
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
      });
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
      return 0;
    }
  }

  // Get cache stats
  async getStats(): Promise<{ count: number; oldestEntry: number | null }> {
    try {
      const db = await this.getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();

        let count = 0;
        let oldestEntry: number | null = null;

        countRequest.onsuccess = () => {
          count = countRequest.result;
        };

        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry = cursor.value;
            if (oldestEntry === null || entry.data.fetchedAt < oldestEntry) {
              oldestEntry = entry.data.fetchedAt;
            }
            cursor.continue();
          }
        };

        transaction.oncomplete = () => {
          resolve({ count, oldestEntry });
        };

        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('Cache stats failed:', error);
      return { count: 0, oldestEntry: null };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();