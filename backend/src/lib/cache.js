// Simple in-memory cache service
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTtl = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  // Set a value with optional TTL
  set(key, value, ttl = this.defaultTtl) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    
    // Clean up expired entries periodically
    this.cleanup();
  }

  // Get a value if it exists and hasn't expired
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Delete a specific key
  delete(key) {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size
  size() {
    this.cleanup(); // Clean up before getting size
    return this.cache.size;
  }

  // Check if key exists and is not expired
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// Create and export a singleton instance
const cache = new MemoryCache();

// Periodic cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

export default cache;
