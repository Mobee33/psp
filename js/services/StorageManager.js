/**
 * StorageManager - Data Persistence Service
 * Handles localStorage, sessionStorage, IndexedDB, and caching
 */

export class StorageManager {
  constructor() {
    this.dbName = 'PSPGameExplorer';
    this.dbVersion = 1;
    this.db = null;
    this.isIndexedDBSupported = 'indexedDB' in window;
    this.isLocalStorageSupported = this.checkLocalStorageSupport();
    
    // Storage keys
    this.keys = {
      USER_PREFERENCES: 'psp_user_preferences',
      GAME_COLLECTION: 'psp_game_collection',
      SEARCH_HISTORY: 'psp_search_history',
      CACHE_DATA: 'psp_cache_data',
      APP_SETTINGS: 'psp_app_settings',
      THEME_PREFERENCE: 'psp_theme_preference',
      LAST_VISIT: 'psp_last_visit',
      USER_STATS: 'psp_user_stats'
    };
    
    // Default data structures
    this.defaults = {
      userPreferences: {
        theme: 'dark',
        language: 'en',
        autoSave: true,
        notifications: true,
        animations: true,
        dataUsage: 'wifi-only'
      },
      gameCollection: {
        owned: [],
        wishlist: [],
        completed: [],
        playing: [],
        dropped: [],
        favorites: []
      },
      appSettings: {
        cacheExpiry: 30 * 60 * 1000, // 30 minutes
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        autoBackup: true,
        syncEnabled: false
      }
    };
  }

  /**
   * Initialize storage manager
   */
  async init() {
    console.log('💾 Initializing Storage Manager...');
    
    try {
      // Initialize IndexedDB if supported
      if (this.isIndexedDBSupported) {
        await this.initIndexedDB();
      }
      
      // Initialize default data if needed
      await this.initializeDefaults();
      
      // Setup storage event listeners
      this.setupStorageListeners();
      
      // Cleanup old data
      await this.cleanupOldData();
      
      console.log('✅ Storage Manager initialized');
      
    } catch (error) {
      console.error('❌ Storage Manager initialization failed:', error);
      // Fallback to memory storage if needed
      this.setupMemoryFallback();
    }
  }

  /**
   * Check localStorage support
   */
  checkLocalStorageSupport() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize IndexedDB
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.warn('⚠️ IndexedDB failed to open');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('games')) {
          const gamesStore = db.createObjectStore('games', { keyPath: 'id' });
          gamesStore.createIndex('name', 'name', { unique: false });
          gamesStore.createIndex('genre', 'genres', { unique: false, multiEntry: true });
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'type' });
        }
        
        console.log('📊 IndexedDB schema created/updated');
      };
    });
  }

  /**
   * Initialize default data
   */
  async initializeDefaults() {
    // Check if first time user
    const lastVisit = await this.get(this.keys.LAST_VISIT);
    const isFirstTime = !lastVisit;
    
    if (isFirstTime) {
      console.log('👋 First time user - setting up defaults');
      
      // Set default preferences
      await this.set(this.keys.USER_PREFERENCES, this.defaults.userPreferences);
      await this.set(this.keys.GAME_COLLECTION, this.defaults.gameCollection);
      await this.set(this.keys.APP_SETTINGS, this.defaults.appSettings);
      
      // Set first visit timestamp
      await this.set(this.keys.LAST_VISIT, Date.now());
      
      // Initialize user stats
      await this.set(this.keys.USER_STATS, {
        gamesViewed: 0,
        searchesPerformed: 0,
        collectionsCreated: 0,
        timeSpent: 0,
        firstVisit: Date.now(),
        totalVisits: 1
      });
    } else {
      // Update visit stats
      const stats = await this.get(this.keys.USER_STATS) || {};
      stats.totalVisits = (stats.totalVisits || 0) + 1;
      stats.lastVisit = Date.now();
      await this.set(this.keys.USER_STATS, stats);
    }
  }

  /**
   * Setup storage event listeners
   */
  setupStorageListeners() {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      console.log('💾 Storage changed in another tab:', event.key);
      
      // Emit custom event for app to handle
      window.dispatchEvent(new CustomEvent('storageChanged', {
        detail: {
          key: event.key,
          oldValue: event.oldValue,
          newValue: event.newValue
        }
      }));
    });
  }

  /**
   * Set data in storage
   */
  async set(key, value, options = {}) {
    const { 
      useIndexedDB = false, 
      compress = false,
      encrypt = false,
      ttl = null 
    } = options;
    
    try {
      // Prepare data
      const data = {
        value,
        timestamp: Date.now(),
        ttl,
        compressed: compress,
        encrypted: encrypt
      };
      
      // Apply compression if needed
      if (compress && typeof value === 'object') {
        data.value = await this.compressData(value);
      }
      
      // Apply encryption if needed
      if (encrypt) {
        data.value = await this.encryptData(data.value);
      }
      
      // Choose storage method
      if (useIndexedDB && this.db) {
        await this.setIndexedDB(key, data);
      } else if (this.isLocalStorageSupported) {
        localStorage.setItem(key, JSON.stringify(data));
      } else {
        // Memory fallback
        this.memoryStorage = this.memoryStorage || new Map();
        this.memoryStorage.set(key, data);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Storage set failed:', error);
      return false;
    }
  }

  /**
   * Get data from storage
   */
  async get(key, defaultValue = null, options = {}) {
    const { useIndexedDB = false } = options;
    
    try {
      let data = null;
      
      // Choose storage method
      if (useIndexedDB && this.db) {
        data = await this.getIndexedDB(key);
      } else if (this.isLocalStorageSupported) {
        const stored = localStorage.getItem(key);
        data = stored ? JSON.parse(stored) : null;
      } else {
        // Memory fallback
        data = this.memoryStorage?.get(key) || null;
      }
      
      if (!data) return defaultValue;
      
      // Check TTL expiration
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        await this.remove(key, { useIndexedDB });
        return defaultValue;
      }
      
      // Decompress if needed
      if (data.compressed) {
        data.value = await this.decompressData(data.value);
      }
      
      // Decrypt if needed
      if (data.encrypted) {
        data.value = await this.decryptData(data.value);
      }
      
      return data.value;
      
    } catch (error) {
      console.error('❌ Storage get failed:', error);
      return defaultValue;
    }
  }

  /**
   * Remove data from storage
   */
  async remove(key, options = {}) {
    const { useIndexedDB = false } = options;
    
    try {
      if (useIndexedDB && this.db) {
        await this.removeIndexedDB(key);
      } else if (this.isLocalStorageSupported) {
        localStorage.removeItem(key);
      } else {
        this.memoryStorage?.delete(key);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Storage remove failed:', error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  async clear(options = {}) {
    const { includeIndexedDB = false } = options;
    
    try {
      if (this.isLocalStorageSupported) {
        // Only clear app-specific keys
        Object.values(this.keys).forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      if (includeIndexedDB && this.db) {
        await this.clearIndexedDB();
      }
      
      if (this.memoryStorage) {
        this.memoryStorage.clear();
      }
      
      console.log('🧹 Storage cleared');
      return true;
    } catch (error) {
      console.error('❌ Storage clear failed:', error);
      return false;
    }
  }

  /**
   * IndexedDB operations
   */
  async setIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const request = store.put({ key, ...data });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache management
   */
  async setCache(key, data, ttl = 30 * 60 * 1000) {
    return this.set(`cache_${key}`, data, { 
      useIndexedDB: true, 
      ttl,
      compress: true 
    });
  }

  async getCache(key) {
    return this.get(`cache_${key}`, null, { useIndexedDB: true });
  }

  async clearCache() {
    try {
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await store.clear();
      }
      
      // Clear localStorage cache items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🧹 Cache cleared');
    } catch (error) {
      console.error('❌ Cache clear failed:', error);
    }
  }

  /**
   * User preferences
   */
  async getUserPreferences() {
    return this.get(this.keys.USER_PREFERENCES, this.defaults.userPreferences);
  }

  async setUserPreferences(preferences) {
    return this.set(this.keys.USER_PREFERENCES, {
      ...this.defaults.userPreferences,
      ...preferences
    });
  }

  async updateUserPreference(key, value) {
    const preferences = await this.getUserPreferences();
    preferences[key] = value;
    return this.setUserPreferences(preferences);
  }

  /**
   * Game collection management
   */
  async getGameCollection() {
    return this.get(this.keys.GAME_COLLECTION, this.defaults.gameCollection);
  }

  async setGameCollection(collection) {
    return this.set(this.keys.GAME_COLLECTION, collection);
  }

  async addToCollection(listName, game) {
    const collection = await this.getGameCollection();
    
    if (!collection[listName]) {
      collection[listName] = [];
    }
    
    // Avoid duplicates
    const exists = collection[listName].find(g => g.id === game.id);
    if (!exists) {
      collection[listName].push({
        ...game,
        addedAt: Date.now()
      });
      
      await this.setGameCollection(collection);
      console.log(`✅ Added ${game.name} to ${listName}`);
    }
    
    return collection;
  }

  async removeFromCollection(listName, gameId) {
    const collection = await this.getGameCollection();
    
    if (collection[listName]) {
      collection[listName] = collection[listName].filter(g => g.id !== gameId);
      await this.setGameCollection(collection);
      console.log(`🗑️ Removed game from ${listName}`);
    }
    
    return collection;
  }

  /**
   * Search history
   */
  async addToSearchHistory(query) {
    const history = await this.get(this.keys.SEARCH_HISTORY, []);
    
    // Remove existing occurrence
    const filtered = history.filter(item => item.query !== query);
    
    // Add to beginning
    filtered.unshift({
      query,
      timestamp: Date.now()
    });
    
    // Keep only last 50 searches
    const trimmed = filtered.slice(0, 50);
    
    return this.set(this.keys.SEARCH_HISTORY, trimmed);
  }

  async getSearchHistory() {
    return this.get(this.keys.SEARCH_HISTORY, []);
  }

  async clearSearchHistory() {
    return this.set(this.keys.SEARCH_HISTORY, []);
  }

  /**
   * Data compression (simple implementation)
   */
  async compressData(data) {
    // In a real implementation, you might use a compression library
    return JSON.stringify(data);
  }

  async decompressData(compressedData) {
    return JSON.parse(compressedData);
  }

  /**
   * Data encryption (placeholder - use proper encryption in production)
   */
  async encryptData(data) {
    // Placeholder - implement actual encryption
    return btoa(JSON.stringify(data));
  }

  async decryptData(encryptedData) {
    // Placeholder - implement actual decryption
    return JSON.parse(atob(encryptedData));
  }

  /**
   * Storage statistics
   */
  async getStorageStats() {
    const stats = {
      localStorage: {
        used: 0,
        available: 0,
        itemCount: 0
      },
      indexedDB: {
        used: 0,
        available: 0,
        objectStores: 0
      },
      memory: {
        used: 0,
        itemCount: this.memoryStorage?.size || 0
      }
    };
    
    // LocalStorage stats
    if (this.isLocalStorageSupported) {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
          if (key.startsWith('psp_')) {
            stats.localStorage.itemCount++;
          }
        }
      }
      stats.localStorage.used = totalSize;
      stats.localStorage.available = 5 * 1024 * 1024 - totalSize; // ~5MB limit
    }
    
    // IndexedDB stats
    if (this.db) {
      stats.indexedDB.objectStores = this.db.objectStoreNames.length;
      // Getting actual size requires iterating through all data
    }
    
    return stats;
  }

  /**
   * Data export
   */
  async exportData() {
    const exportData = {
      version: '1.0.0',
      timestamp: Date.now(),
      data: {}
    };
    
    // Export all app data
    for (const [name, key] of Object.entries(this.keys)) {
      const value = await this.get(key);
      if (value !== null) {
        exportData.data[name] = value;
      }
    }
    
    return exportData;
  }

  /**
   * Data import
   */
  async importData(exportData) {
    try {
      if (!exportData.data) {
        throw new Error('Invalid export format');
      }
      
      // Import all data
      for (const [name, value] of Object.entries(exportData.data)) {
        const key = this.keys[name];
        if (key) {
          await this.set(key, value);
        }
      }
      
      console.log('✅ Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Data import failed:', error);
      return false;
    }
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData() {
    try {
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Clean localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data.timestamp && data.timestamp < cutoffTime) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // Remove invalid data
            localStorage.removeItem(key);
          }
        }
      });
      
      // Clean IndexedDB cache
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('timestamp');
        
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }
      
      console.log('🧹 Old data cleaned up');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Setup memory fallback
   */
  setupMemoryFallback() {
    console.log('💾 Setting up memory storage fallback');
    this.memoryStorage = new Map();
    this.isLocalStorageSupported = false;
  }

  /**
   * Check storage quota
   */
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          available: estimate.quota - estimate.usage,
          percentage: (estimate.usage / estimate.quota) * 100
        };
      } catch (error) {
        console.warn('⚠️ Could not estimate storage quota:', error);
      }
    }
    return null;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    if (this.memoryStorage) {
      this.memoryStorage.clear();
      this.memoryStorage = null;
    }
    
    console.log('🧹 Storage Manager cleanup complete');
  }
}