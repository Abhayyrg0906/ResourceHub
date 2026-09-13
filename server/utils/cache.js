/**
 * In-Memory TTL Cache Utility
 * Provides fast in-memory key-value caching with expiration and pattern invalidation.
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get value from cache if exists and not expired.
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Store value in cache with TTL.
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds - Time-to-live in seconds (default 60s)
   */
  set(key, value, ttlSeconds = 60) {
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete specific key from cache.
   * @param {string} key 
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regex pattern.
   * @param {string|RegExp} pattern 
   */
  flushPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp('^' + pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current cache size.
   */
  size() {
    return this.cache.size;
  }
}

const memoryCache = new MemoryCache();

module.exports = memoryCache;
