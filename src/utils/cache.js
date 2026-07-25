/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIGHTWEIGHT IN-MEMORY TTL CACHE
 * ═══════════════════════════════════════════════════════════════════════════
 * Ultra-fast zero-dependency cache for static lookup tables and auth status
 * checks to minimize database roundtrips.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  flush() {
    this.store.clear();
  }
}

export const cache = new MemoryCache();
