import cache from './cache.js';

// Helper functions for user cache management

/**
 * Invalidate user-related cache entries
 * Call this when user data changes (signup, profile update, status change, etc.)
 */
export const invalidateUserCache = (userId = null) => {
  if (userId) {
    // Invalidate specific user's cache entries
    const keysToDelete = [];
    
    // Get all cache keys and find ones related to this user
    for (const [key] of cache.cache.entries()) {
      if (key.includes(`users:${userId}:`) || key.includes(`totalUsers:${userId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
    console.log(`Invalidated ${keysToDelete.length} cache entries for user ${userId}`);
  } else {
    // Clear all user-related cache
    const keysToDelete = [];
    
    for (const [key] of cache.cache.entries()) {
      if (key.startsWith('users:') || key.startsWith('totalUsers:')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cache.delete(key));
    console.log(`Invalidated ${keysToDelete.length} user cache entries`);
  }
};

/**
 * Invalidate all cache entries for all users
 * Use this when major changes occur (like a new user signup that affects everyone's pagination)
 */
export const invalidateAllUserCaches = () => {
  const keysToDelete = [];
  
  for (const [key] of cache.cache.entries()) {
    if (key.startsWith('users:') || key.startsWith('totalUsers:')) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  console.log(`Invalidated all ${keysToDelete.length} user cache entries`);
};

/**
 * Warm up cache for a specific user
 * Pre-populate cache with common requests
 */
export const warmUpUserCache = async (userId, skip = 0, limit = 10) => {
  // This would make a call to getUserForSidebar internally
  // but we'll keep it simple for now
  const cacheKey = `users:${userId}:${skip}:${limit}`;
  console.log(`Cache warm-up requested for key: ${cacheKey}`);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const totalSize = cache.size();
  let userCacheCount = 0;
  let totalUsersCacheCount = 0;
  
  for (const [key] of cache.cache.entries()) {
    if (key.startsWith('users:')) userCacheCount++;
    if (key.startsWith('totalUsers:')) totalUsersCacheCount++;
  }
  
  return {
    totalCacheSize: totalSize,
    userCacheEntries: userCacheCount,
    totalUsersCacheEntries: totalUsersCacheCount
  };
};
