// Cache service for dish recognition results and data
class CacheService {
  constructor() {
    this.CACHE_KEYS = {
      RECENT_SCANS: 'smart_genie_recent_scans',
      DISH_DATA: 'smart_genie_dish_data',
      LAST_SYNC: 'smart_genie_last_sync'
    };
    this.MAX_RECENT_SCANS = 10;
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Generate a simple hash for image data
  generateImageHash(imageData) {
    let hash = 0;
    for (let i = 0; i < imageData.length; i++) {
      const char = imageData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Cache recent scan results
  cacheScanResult(imageData, result) {
    try {
      const imageHash = this.generateImageHash(imageData);
      const scanData = {
        imageHash,
        result,
        timestamp: Date.now()
      };

      const recentScans = this.getRecentScans();
      
      // Remove any existing entry with same image hash
      const filteredScans = recentScans.filter(scan => scan.imageHash !== imageHash);
      
      // Add new scan to beginning
      filteredScans.unshift(scanData);
      
      // Keep only the most recent scans
      const limitedScans = filteredScans.slice(0, this.MAX_RECENT_SCANS);
      
      localStorage.setItem(this.CACHE_KEYS.RECENT_SCANS, JSON.stringify(limitedScans));
    } catch (error) {
      console.warn('Failed to cache scan result:', error);
    }
  }

  // Get cached scan result
  getCachedScanResult(imageData) {
    try {
      const imageHash = this.generateImageHash(imageData);
      const recentScans = this.getRecentScans();
      
      const cachedScan = recentScans.find(scan => 
        scan.imageHash === imageHash && 
        (Date.now() - scan.timestamp) < this.CACHE_DURATION
      );
      
      return cachedScan ? cachedScan.result : null;
    } catch (error) {
      console.warn('Failed to get cached scan result:', error);
      return null;
    }
  }

  // Get recent scans
  getRecentScans() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEYS.RECENT_SCANS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Failed to get recent scans:', error);
      return [];
    }
  }

  // Cache dish data
  cacheDishData(dishes) {
    try {
      const dishData = {
        dishes,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEYS.DISH_DATA, JSON.stringify(dishData));
    } catch (error) {
      console.warn('Failed to cache dish data:', error);
    }
  }

  // Get cached dish data
  getCachedDishData() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEYS.DISH_DATA);
      if (!cached) return null;
      
      const dishData = JSON.parse(cached);
      
      // Check if cache is still valid
      if ((Date.now() - dishData.timestamp) < this.CACHE_DURATION) {
        return dishData.dishes;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get cached dish data:', error);
      return null;
    }
  }

  // Clear all caches
  clearCache() {
    try {
      Object.values(this.CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Get cache statistics
  getCacheStats() {
    try {
      const recentScans = this.getRecentScans();
      const dishData = this.getCachedDishData();
      
      return {
        recentScansCount: recentScans.length,
        hasDishData: !!dishData,
        cacheSize: JSON.stringify(localStorage).length,
        lastSync: localStorage.getItem(this.CACHE_KEYS.LAST_SYNC)
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new CacheService();
