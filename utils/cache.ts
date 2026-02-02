"use client";

/**
 * IndexedDB Cache Utility
 * Provides persistent storage with much larger capacity than localStorage (~50MB+ vs ~5MB)
 * Data persists through hard refreshes and browser restarts
 */

const DB_NAME = 'grocery_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'cache_store';

interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    version: string;
}

class IndexedDBCache {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            };
        });

        return this.dbPromise;
    }

    async get<T>(key: string, version: string, maxAge: number): Promise<T | null> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);

                request.onerror = () => {
                    console.error('Failed to get from IndexedDB:', request.error);
                    resolve(null);
                };

                request.onsuccess = () => {
                    const entry = request.result as CacheEntry<T> | undefined;

                    if (!entry) {
                        resolve(null);
                        return;
                    }

                    // Check version match
                    if (entry.version !== version) {
                        console.log(`Cache version mismatch for ${key}. Expected ${version}, got ${entry.version}`);
                        resolve(null);
                        return;
                    }

                    // Check if expired
                    if (Date.now() - entry.timestamp > maxAge) {
                        console.log(`Cache expired for ${key}`);
                        resolve(null);
                        return;
                    }

                    resolve(entry.value);
                };
            });
        } catch (error) {
            console.error('IndexedDB get error:', error);
            return null;
        }
    }

    async set<T>(key: string, value: T, version: string): Promise<boolean> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);

                const entry: CacheEntry<T> = {
                    key,
                    value,
                    timestamp: Date.now(),
                    version
                };

                const request = store.put(entry);

                request.onerror = () => {
                    console.error('Failed to set IndexedDB:', request.error);
                    resolve(false);
                };

                request.onsuccess = () => {
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('IndexedDB set error:', error);
            return false;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);

                request.onerror = () => {
                    console.error('Failed to delete from IndexedDB:', request.error);
                    resolve(false);
                };

                request.onsuccess = () => {
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('IndexedDB delete error:', error);
            return false;
        }
    }

    async clear(): Promise<boolean> {
        try {
            const db = await this.openDB();
            return new Promise((resolve) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();

                request.onerror = () => {
                    console.error('Failed to clear IndexedDB:', request.error);
                    resolve(false);
                };

                request.onsuccess = () => {
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('IndexedDB clear error:', error);
            return false;
        }
    }
}

// Singleton instance
export const cacheDB = new IndexedDBCache();

// Cache keys
export const CACHE_KEYS = {
    PRODUCTS: 'grocery_products',
    CATEGORIES: 'grocery_categories'
} as const;

// Cache version - increment to invalidate all caches
export const CACHE_VERSION = 'v1';

// Cache duration - 30 days in milliseconds
export const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000;
