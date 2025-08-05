/**
 * CollectionManager - Game Collection Management
 * Handles user's game collections: owned, wishlist, completed, favorites, etc.
 */

export class CollectionManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.isInitialized = false;
    
    // Collection types
    this.collectionTypes = {
      owned: {
        name: 'Owned Games',
        description: 'Games you own',
        icon: '🎮',
        color: '#06ffa5'
      },
      wishlist: {
        name: 'Wishlist',
        description: 'Games you want to play',
        icon: '💕',
        color: '#ff006e'
      },
      completed: {
        name: 'Completed',
        description: 'Games you have finished',
        icon: '✅',
        color: '#00ffff'
      },
      playing: {
        name: 'Currently Playing',
        description: 'Games you are currently playing',
        icon: '🎯',
        color: '#8338ec'
      },
      dropped: {
        name: 'Dropped',
        description: 'Games you stopped playing',
        icon: '❌',
        color: '#ff4757'
      },
      favorites: {
        name: 'Favorites',
        description: 'Your all-time favorite games',
        icon: '⭐',
        color: '#ffaa00'
      },
      backlog: {
        name: 'Backlog',
        description: 'Games to play later',
        icon: '📚',
        color: '#3a86ff'
      }
    };
    
    // Current collections data
    this.collections = {};
    
    // Collection statistics
    this.stats = {
      totalGames: 0,
      completionRate: 0,
      averageRating: 0,
      totalPlaytime: 0,
      genreDistribution: {},
      platformDistribution: {},
      yearDistribution: {}
    };
    
    // Import/Export formats
    this.exportFormats = {
      json: { name: 'JSON', extension: '.json', mimeType: 'application/json' },
      csv: { name: 'CSV', extension: '.csv', mimeType: 'text/csv' },
      txt: { name: 'Text', extension: '.txt', mimeType: 'text/plain' }
    };
  }

  /**
   * Initialize collection manager
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('📚 Initializing Collection Manager...');
    
    // Load collections from storage
    await this.loadCollections();
    
    // Calculate initial statistics
    this.calculateStatistics();
    
    // Setup auto-save
    this.setupAutoSave();
    
    this.isInitialized = true;
    console.log('✅ Collection Manager initialized');
  }

  /**
   * Load collections from storage
   */
  async loadCollections() {
    try {
      const savedCollections = await this.storage.getGameCollection();
      
      // Initialize all collection types if they don't exist
      Object.keys(this.collectionTypes).forEach(type => {
        this.collections[type] = savedCollections[type] || [];
      });
      
      console.log('📖 Collections loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load collections:', error);
      this.initializeEmptyCollections();
    }
  }

  /**
   * Initialize empty collections
   */
  initializeEmptyCollections() {
    Object.keys(this.collectionTypes).forEach(type => {
      this.collections[type] = [];
    });
  }

  /**
   * Save collections to storage
   */
  async saveCollections() {
    try {
      await this.storage.setGameCollection(this.collections);
      console.log('💾 Collections saved successfully');
    } catch (error) {
      console.error('❌ Failed to save collections:', error);
    }
  }

  /**
   * Add game to collection
   */
  async addToCollection(collectionType, game, options = {}) {
    if (!this.collectionTypes[collectionType]) {
      throw new Error(`Invalid collection type: ${collectionType}`);
    }
    
    if (!this.collections[collectionType]) {
      this.collections[collectionType] = [];
    }
    
    // Check if game already exists in collection
    const existingIndex = this.collections[collectionType].findIndex(
      item => item.id === game.id
    );
    
    if (existingIndex !== -1) {
      // Update existing entry
      this.collections[collectionType][existingIndex] = {
        ...this.collections[collectionType][existingIndex],
        ...game,
        ...options,
        updatedAt: Date.now()
      };
    } else {
      // Add new entry
      this.collections[collectionType].push({
        ...game,
        ...options,
        addedAt: Date.now(),
        collectionType
      });
    }
    
    // Auto-manage related collections
    await this.autoManageCollections(game.id, collectionType);
    
    // Save and update stats
    await this.saveCollections();
    this.calculateStatistics();
    
    // Dispatch event
    this.dispatchCollectionEvent('gameAdded', {
      game,
      collection: collectionType,
      total: this.collections[collectionType].length
    });
    
    console.log(`✅ Added "${game.name}" to ${collectionType}`);
    
    return this.collections[collectionType];
  }

  /**
   * Remove game from collection
   */
  async removeFromCollection(collectionType, gameId) {
    if (!this.collections[collectionType]) return false;
    
    const initialLength = this.collections[collectionType].length;
    this.collections[collectionType] = this.collections[collectionType].filter(
      game => game.id !== gameId
    );
    
    const wasRemoved = this.collections[collectionType].length < initialLength;
    
    if (wasRemoved) {
      await this.saveCollections();
      this.calculateStatistics();
      
      // Dispatch event
      this.dispatchCollectionEvent('gameRemoved', {
        gameId,
        collection: collectionType,
        total: this.collections[collectionType].length
      });
      
      console.log(`🗑️ Removed game from ${collectionType}`);
    }
    
    return wasRemoved;
  }

  /**
   * Move game between collections
   */
  async moveGame(gameId, fromCollection, toCollection) {
    const game = this.getGameFromCollection(fromCollection, gameId);
    
    if (!game) {
      throw new Error('Game not found in source collection');
    }
    
    // Remove from source
    await this.removeFromCollection(fromCollection, gameId);
    
    // Add to destination
    await this.addToCollection(toCollection, game);
    
    console.log(`📦 Moved game from ${fromCollection} to ${toCollection}`);
    
    return true;
  }

  /**
   * Get game from specific collection
   */
  getGameFromCollection(collectionType, gameId) {
    if (!this.collections[collectionType]) return null;
    
    return this.collections[collectionType].find(game => game.id === gameId) || null;
  }

  /**
   * Check if game is in collection
   */
  isGameInCollection(collectionType, gameId) {
    return !!this.getGameFromCollection(collectionType, gameId);
  }

  /**
   * Get all collections for a game
   */
  getGameCollections(gameId) {
    const gameCollections = [];
    
    Object.keys(this.collectionTypes).forEach(type => {
      if (this.isGameInCollection(type, gameId)) {
        gameCollections.push(type);
      }
    });
    
    return gameCollections;
  }

  /**
   * Get collection by type
   */
  getCollection(collectionType) {
    if (collectionType && !this.collectionTypes[collectionType]) {
      throw new Error(`Invalid collection type: ${collectionType}`);
    }
    
    if (collectionType) {
      return {
        type: collectionType,
        ...this.collectionTypes[collectionType],
        games: this.collections[collectionType] || [],
        count: (this.collections[collectionType] || []).length
      };
    }
    
    // Return all collections
    const allCollections = {};
    Object.keys(this.collectionTypes).forEach(type => {
      allCollections[type] = {
        type,
        ...this.collectionTypes[type],
        games: this.collections[type] || [],
        count: (this.collections[type] || []).length
      };
    });
    
    return allCollections;
  }

  /**
   * Search within collections
   */
  searchCollections(query, collectionTypes = null) {
    const searchTypes = collectionTypes || Object.keys(this.collectionTypes);
    const results = {};
    
    const normalizedQuery = query.toLowerCase().trim();
    
    searchTypes.forEach(type => {
      if (!this.collections[type]) return;
      
      results[type] = this.collections[type].filter(game => {
        return (
          game.name.toLowerCase().includes(normalizedQuery) ||
          game.description?.toLowerCase().includes(normalizedQuery) ||
          game.genres?.some(genre => genre.name.toLowerCase().includes(normalizedQuery)) ||
          game.developers?.some(dev => dev.name.toLowerCase().includes(normalizedQuery))
        );
      });
    });
    
    return results;
  }

  /**
   * Auto-manage related collections
   */
  async autoManageCollections(gameId, addedToCollection) {
    // Smart collection management rules
    const rules = {
      // If added to completed, remove from playing and backlog
      completed: ['playing', 'backlog'],
      
      // If added to playing, remove from backlog
      playing: ['backlog'],
      
      // If added to dropped, remove from playing and backlog
      dropped: ['playing', 'backlog'],
      
      // If added to owned, add to backlog (unless already in playing/completed)
      owned: []
    };
    
    const toRemoveFrom = rules[addedToCollection] || [];
    
    for (const collectionType of toRemoveFrom) {
      if (this.isGameInCollection(collectionType, gameId)) {
        await this.removeFromCollection(collectionType, gameId);
      }
    }
    
    // Special case: Adding to owned automatically adds to backlog
    if (addedToCollection === 'owned') {
      const isInPlayingOrCompleted = this.isGameInCollection('playing', gameId) || 
                                    this.isGameInCollection('completed', gameId) ||
                                    this.isGameInCollection('dropped', gameId);
      
      if (!isInPlayingOrCompleted && !this.isGameInCollection('backlog', gameId)) {
        const game = this.getGameFromCollection('owned', gameId);
        if (game) {
          this.collections.backlog = this.collections.backlog || [];
          this.collections.backlog.push({
            ...game,
            addedAt: Date.now(),
            collectionType: 'backlog'
          });
        }
      }
    }
  }

  /**
   * Rate game in collection
   */
  async rateGame(gameId, rating, review = '') {
    const collections = this.getGameCollections(gameId);
    
    collections.forEach(collectionType => {
      const game = this.getGameFromCollection(collectionType, gameId);
      if (game) {
        game.userRating = rating;
        game.userReview = review;
        game.reviewedAt = Date.now();
      }
    });
    
    await this.saveCollections();
    this.calculateStatistics();
    
    console.log(`⭐ Rated "${gameId}" with ${rating} stars`);
  }

  /**
   * Add play session
   */
  async addPlaySession(gameId, duration, date = new Date()) {
    const collections = this.getGameCollections(gameId);
    
    collections.forEach(collectionType => {
      const game = this.getGameFromCollection(collectionType, gameId);
      if (game) {
        game.playSessions = game.playSessions || [];
        game.playSessions.push({
          duration,
          date: date.toISOString(),
          timestamp: Date.now()
        });
        
        // Update total playtime
        game.totalPlaytime = game.playSessions.reduce((total, session) => 
          total + (session.duration || 0), 0
        );
        
        game.lastPlayedAt = Date.now();
      }
    });
    
    await this.saveCollections();
    this.calculateStatistics();
    
    console.log(`🎮 Added ${duration} minutes play session for game ${gameId}`);
  }

  /**
   * Calculate collection statistics
   */
  calculateStatistics() {
    const allGames = new Map(); // Use Map to avoid duplicates
    let totalRatings = 0;
    let ratingSum = 0;
    let totalPlaytime = 0;
    const genreCount = {};
    const platformCount = {};
    const yearCount = {};
    
    // Collect all unique games
    Object.values(this.collections).forEach(collection => {
      collection.forEach(game => {
        allGames.set(game.id, game);
      });
    });
    
    // Calculate statistics
    allGames.forEach(game => {
      // Ratings
      if (game.userRating) {
        totalRatings++;
        ratingSum += game.userRating;
      }
      
      // Playtime
      if (game.totalPlaytime) {
        totalPlaytime += game.totalPlaytime;
      }
      
      // Genres
      if (game.genres) {
        game.genres.forEach(genre => {
          genreCount[genre.name] = (genreCount[genre.name] || 0) + 1;
        });
      }
      
      // Platforms
      if (game.platforms) {
        game.platforms.forEach(platform => {
          platformCount[platform.name] = (platformCount[platform.name] || 0) + 1;
        });
      }
      
      // Release years
      if (game.released) {
        const year = new Date(game.released).getFullYear();
        yearCount[year] = (yearCount[year] || 0) + 1;
      }
    });
    
    // Update statistics
    this.stats = {
      totalGames: allGames.size,
      completionRate: this.collections.owned?.length > 0 ? 
        (this.collections.completed?.length || 0) / this.collections.owned.length * 100 : 0,
      averageRating: totalRatings > 0 ? ratingSum / totalRatings : 0,
      totalPlaytime,
      genreDistribution: genreCount,
      platformDistribution: platformCount,
      yearDistribution: yearCount,
      collectionCounts: Object.keys(this.collectionTypes).reduce((counts, type) => {
        counts[type] = (this.collections[type] || []).length;
        return counts;
      }, {})
    };
    
    console.log('📊 Statistics updated:', this.stats);
  }

  /**
   * Get collection statistics
   */
  getStatistics() {
    return { ...this.stats };
  }

  /**
   * Get games by filter
   */
  getFilteredGames(filters = {}) {
    const {
      collections = Object.keys(this.collectionTypes),
      genres = [],
      platforms = [],
      yearRange = null,
      ratingRange = null,
      sortBy = 'addedAt',
      sortOrder = 'desc'
    } = filters;
    
    let games = [];
    
    // Collect games from specified collections
    collections.forEach(collectionType => {
      if (this.collections[collectionType]) {
        games.push(...this.collections[collectionType]);
      }
    });
    
    // Remove duplicates
    const uniqueGames = games.reduce((acc, game) => {
      if (!acc.find(g => g.id === game.id)) {
        acc.push(game);
      }
      return acc;
    }, []);
    
    // Apply filters
    let filteredGames = uniqueGames;
    
    if (genres.length > 0) {
      filteredGames = filteredGames.filter(game =>
        game.genres?.some(genre => genres.includes(genre.name))
      );
    }
    
    if (platforms.length > 0) {
      filteredGames = filteredGames.filter(game =>
        game.platforms?.some(platform => platforms.includes(platform.name))
      );
    }
    
    if (yearRange) {
      filteredGames = filteredGames.filter(game => {
        if (!game.released) return false;
        const year = new Date(game.released).getFullYear();
        return year >= yearRange.min && year <= yearRange.max;
      });
    }
    
    if (ratingRange) {
      filteredGames = filteredGames.filter(game =>
        game.userRating >= ratingRange.min && game.userRating <= ratingRange.max
      );
    }
    
    // Sort games
    filteredGames.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle different sort types
      if (sortBy === 'name') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      } else if (sortBy === 'released') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
    
    return filteredGames;
  }

  /**
   * Export collections
   */
  async exportCollections(format = 'json', collections = null) {
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      statistics: this.stats,
      collections: collections ? 
        Object.keys(collections).reduce((acc, key) => {
          if (this.collections[key]) {
            acc[key] = this.collections[key];
          }
          return acc;
        }, {}) : 
        this.collections
    };
    
    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(exportData, null, 2),
          filename: `psp-collection-${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json'
        };
        
      case 'csv':
        return this.exportToCSV(exportData);
        
      case 'txt':
        return this.exportToText(exportData);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  exportToCSV(exportData) {
    const headers = [
      'Collection',
      'Game Name',
      'Rating',
      'User Rating',
      'Release Date',
      'Genres',
      'Platforms',
      'Playtime',
      'Added Date'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    Object.entries(exportData.collections).forEach(([collectionType, games]) => {
      games.forEach(game => {
        const row = [
          collectionType,
          `"${game.name.replace(/"/g, '""')}"`,
          game.rating || '',
          game.userRating || '',
          game.released || '',
          `"${game.genres?.map(g => g.name).join(', ') || ''}"`,
          `"${game.platforms?.map(p => p.name).join(', ') || ''}"`,
          game.totalPlaytime || '',
          new Date(game.addedAt).toISOString()
        ];
        csvContent += row.join(',') + '\n';
      });
    });
    
    return {
      data: csvContent,
      filename: `psp-collection-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    };
  }

  /**
   * Export to text format
   */
  exportToText(exportData) {
    let textContent = 'PSP Game Collection Export\n';
    textContent += `Exported on: ${exportData.exportedAt}\n`;
    textContent += `Total Games: ${exportData.statistics.totalGames}\n\n`;
    
    Object.entries(exportData.collections).forEach(([collectionType, games]) => {
      const collectionInfo = this.collectionTypes[collectionType];
      textContent += `${collectionInfo.icon} ${collectionInfo.name} (${games.length} games)\n`;
      textContent += '='.repeat(50) + '\n';
      
      games.forEach((game, index) => {
        textContent += `${index + 1}. ${game.name}\n`;
        if (game.rating) textContent += `   Rating: ${game.rating}/5\n`;
        if (game.userRating) textContent += `   Your Rating: ${game.userRating}/5\n`;
        if (game.released) textContent += `   Released: ${game.released}\n`;
        if (game.genres?.length) textContent += `   Genres: ${game.genres.map(g => g.name).join(', ')}\n`;
        textContent += '\n';
      });
      
      textContent += '\n';
    });
    
    return {
      data: textContent,
      filename: `psp-collection-${new Date().toISOString().split('T')[0]}.txt`,
      mimeType: 'text/plain'
    };
  }

  /**
   * Import collections
   */
  async importCollections(data, options = {}) {
    const { merge = true, overwrite = false } = options;
    
    try {
      let importData;
      
      if (typeof data === 'string') {
        importData = JSON.parse(data);
      } else {
        importData = data;
      }
      
      if (!importData.collections) {
        throw new Error('Invalid import data format');
      }
      
      if (overwrite) {
        // Replace all collections
        this.collections = importData.collections;
      } else if (merge) {
        // Merge collections
        Object.entries(importData.collections).forEach(([collectionType, games]) => {
          if (!this.collections[collectionType]) {
            this.collections[collectionType] = [];
          }
          
          games.forEach(game => {
            const exists = this.collections[collectionType].find(g => g.id === game.id);
            if (!exists) {
              this.collections[collectionType].push({
                ...game,
                importedAt: Date.now()
              });
            }
          });
        });
      }
      
      await this.saveCollections();
      this.calculateStatistics();
      
      console.log('✅ Collections imported successfully');
      
      return {
        success: true,
        imported: Object.keys(importData.collections).length,
        totalGames: Object.values(importData.collections).flat().length
      };
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Setup auto-save functionality
   */
  setupAutoSave() {
    // Auto-save every 5 minutes if there are unsaved changes
    setInterval(async () => {
      // In a real implementation, you'd track dirty state
      // For now, we save after every change, so this is just a backup
      await this.saveCollections();
    }, 5 * 60 * 1000);
  }

  /**
   * Dispatch collection events
   */
  dispatchCollectionEvent(eventType, data) {
    window.dispatchEvent(new CustomEvent('collectionChanged', {
      detail: {
        type: eventType,
        ...data
      }
    }));
  }

  /**
   * Clear all collections
   */
  async clearAllCollections() {
    this.initializeEmptyCollections();
    await this.saveCollections();
    this.calculateStatistics();
    
    this.dispatchCollectionEvent('collectionsCleared', {});
    
    console.log('🧹 All collections cleared');
  }

  /**
   * Backup collections
   */
  async backupCollections() {
    const backup = {
      timestamp: Date.now(),
      collections: { ...this.collections },
      statistics: { ...this.stats }
    };
    
    try {
      await this.storage.set('psp_collection_backup', backup);
      console.log('💾 Collections backed up successfully');
      return true;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return false;
    }
  }

  /**
   * Restore collections from backup
   */
  async restoreFromBackup() {
    try {
      const backup = await this.storage.get('psp_collection_backup');
      if (!backup) {
        throw new Error('No backup found');
      }
      
      this.collections = backup.collections;
      await this.saveCollections();
      this.calculateStatistics();
      
      console.log('🔄 Collections restored from backup');
      return true;
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear references
    this.storage = null;
    this.collections = {};
    this.stats = {};
    
    this.isInitialized = false;
    console.log('🧹 Collection Manager cleanup complete');
  }
}