/**
 * AnalyticsManager - Analytics and User Behavior Tracking
 * Handles user analytics, performance monitoring, and business intelligence
 */

export class AnalyticsManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.isInitialized = false;
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    
    // Analytics configuration
    this.config = {
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 1000,
      enableDebugLogging: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    };
    
    // Event queue for batching
    this.eventQueue = [];
    this.flushTimer = null;
    
    // Session data
    this.sessionData = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: Date.now(),
      pageViews: 0,
      interactions: 0,
      searchQueries: 0,
      gamesViewed: 0,
      collectionsModified: 0,
      errorsEncountered: 0
    };
    
    // Performance metrics
    this.performanceMetrics = {
      pageLoadTime: 0,
      apiResponseTimes: [],
      renderTimes: [],
      memoryUsage: [],
      errorCounts: {}
    };
    
    // User behavior patterns
    this.behaviorPatterns = {
      mostViewedGenres: {},
      searchPatterns: [],
      navigationPaths: [],
      featureUsage: {},
      timeSpentOnPages: {}
    };
    
    // A/B testing
    this.experiments = new Map();
    this.userSegments = [];
    
    // Bind methods
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Initialize analytics manager
   */
  async init() {
    if (this.isInitialized || !this.enabled) return;
    
    console.log('📊 Initializing Analytics Manager...');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start flush timer
    this.startFlushTimer();
    
    // Initialize user segments
    await this.initializeUserSegments();
    
    // Load any ongoing experiments
    this.loadExperiments();
    
    // Track session start
    this.track('session_started', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer
    });
    
    this.isInitialized = true;
    console.log('✅ Analytics Manager initialized');
  }

  /**
   * Track an event
   */
  track(eventName, properties = {}, options = {}) {
    if (!this.enabled) return;
    
    const event = {
      id: this.generateEventId(),
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      },
      context: {
        page: document.title,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer
      },
      ...options
    };
    
    // Add to queue
    this.eventQueue.push(event);
    
    // Update session data
    this.updateSessionData(eventName, properties);
    
    // Update behavior patterns
    this.updateBehaviorPatterns(eventName, properties);
    
    // Debug logging
    if (this.config.enableDebugLogging) {
      console.log('📊 Analytics Event:', eventName, properties);
    }
    
    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  trackPageView(page, title = null) {
    this.sessionData.pageViews++;
    
    this.track('page_viewed', {
      page,
      title: title || document.title,
      loadTime: performance.now(),
      previousPage: this.currentPage || null
    });
    
    // Update navigation path
    this.behaviorPatterns.navigationPaths.push({
      page,
      timestamp: Date.now(),
      timeOnPreviousPage: this.currentPage ? Date.now() - this.pageStartTime : 0
    });
    
    this.currentPage = page;
    this.pageStartTime = Date.now();
  }

  /**
   * Track user interaction
   */
  trackInteraction(element, action, details = {}) {
    this.sessionData.interactions++;
    
    this.track('user_interaction', {
      element,
      action,
      ...details
    });
    
    // Update feature usage
    const featureKey = `${element}_${action}`;
    this.behaviorPatterns.featureUsage[featureKey] = 
      (this.behaviorPatterns.featureUsage[featureKey] || 0) + 1;
  }

  /**
   * Track performance metric
   */
  trackPerformance(metricName, value, context = {}) {
    this.track('performance_metric', {
      metric: metricName,
      value,
      ...context
    });
    
    // Store for analysis
    switch (metricName) {
      case 'api_response_time':
        this.performanceMetrics.apiResponseTimes.push({
          value,
          timestamp: Date.now(),
          ...context
        });
        break;
      case 'render_time':
        this.performanceMetrics.renderTimes.push({
          value,
          timestamp: Date.now(),
          ...context
        });
        break;
    }
  }

  /**
   * Track error
   */
  trackError(error, context = {}) {
    this.sessionData.errorsEncountered++;
    
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor.name,
      ...context
    };
    
    this.track('error_occurred', errorData);
    
    // Update error counts
    const errorKey = errorData.type;
    this.performanceMetrics.errorCounts[errorKey] = 
      (this.performanceMetrics.errorCounts[errorKey] || 0) + 1;
  }

  /**
   * Track search behavior
   */
  trackSearch(query, results, filters = {}) {
    this.sessionData.searchQueries++;
    
    this.track('search_performed', {
      query: query.toLowerCase(),
      resultCount: results.length,
      hasResults: results.length > 0,
      filters,
      queryLength: query.length,
      queryWords: query.split(/\s+/).length
    });
    
    // Update search patterns
    this.behaviorPatterns.searchPatterns.push({
      query: query.toLowerCase(),
      timestamp: Date.now(),
      resultCount: results.length,
      filters
    });
  }

  /**
   * Track game interaction
   */
  trackGameInteraction(game, action, details = {}) {
    if (action === 'viewed') {
      this.sessionData.gamesViewed++;
    }
    
    this.track('game_interaction', {
      gameId: game.id,
      gameName: game.name,
      action,
      genres: game.genres?.map(g => g.name) || [],
      platforms: game.platforms?.map(p => p.name) || [],
      rating: game.rating,
      releaseYear: game.released ? new Date(game.released).getFullYear() : null,
      ...details
    });
    
    // Update genre viewing patterns
    if (action === 'viewed' && game.genres) {
      game.genres.forEach(genre => {
        this.behaviorPatterns.mostViewedGenres[genre.name] = 
          (this.behaviorPatterns.mostViewedGenres[genre.name] || 0) + 1;
      });
    }
  }

  /**
   * Track collection modification
   */
  trackCollectionChange(action, collection, game = null) {
    this.sessionData.collectionsModified++;
    
    this.track('collection_modified', {
      action,
      collection,
      gameId: game?.id,
      gameName: game?.name,
      collectionSize: collection.length || 0
    });
  }

  /**
   * Track experiment
   */
  trackExperiment(experimentId, variant, action = 'viewed') {
    this.track('experiment_event', {
      experimentId,
      variant,
      action,
      userSegments: this.userSegments
    });
  }

  /**
   * Set user property
   */
  setUserProperty(key, value) {
    this.track('user_property_set', {
      property: key,
      value,
      previousValue: this.userProperties?.[key] || null
    });
    
    this.userProperties = this.userProperties || {};
    this.userProperties[key] = value;
    
    // Save to storage
    this.saveUserProperties();
  }

  /**
   * Identify user
   */
  identify(userId, traits = {}) {
    this.userId = userId;
    this.sessionData.userId = userId;
    
    this.track('user_identified', {
      userId,
      traits,
      previousUserId: this.previousUserId || null
    });
    
    this.previousUserId = this.userId;
    this.saveUserId();
  }

  /**
   * Start A/B test experiment
   */
  startExperiment(experimentId, variants, options = {}) {
    const {
      trafficAllocation = 1.0,
      targetSegments = [],
      duration = 30 * 24 * 60 * 60 * 1000 // 30 days
    } = options;
    
    // Check if user should be included
    const shouldInclude = Math.random() < trafficAllocation;
    const inTargetSegment = targetSegments.length === 0 || 
      targetSegments.some(segment => this.userSegments.includes(segment));
    
    if (!shouldInclude || !inTargetSegment) {
      return null;
    }
    
    // Assign variant
    const variantIndex = Math.floor(Math.random() * variants.length);
    const assignedVariant = variants[variantIndex];
    
    const experiment = {
      id: experimentId,
      variant: assignedVariant,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      userSegments: this.userSegments
    };
    
    this.experiments.set(experimentId, experiment);
    this.saveExperiments();
    
    this.trackExperiment(experimentId, assignedVariant, 'assigned');
    
    return assignedVariant;
  }

  /**
   * Get experiment variant
   */
  getExperimentVariant(experimentId) {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) return null;
    
    // Check if experiment is still active
    if (Date.now() > experiment.endTime) {
      this.experiments.delete(experimentId);
      this.saveExperiments();
      return null;
    }
    
    return experiment.variant;
  }

  /**
   * Generate user insights
   */
  generateUserInsights() {
    const insights = {
      sessionSummary: {
        ...this.sessionData,
        duration: Date.now() - this.sessionData.startTime,
        averageTimePerPage: this.behaviorPatterns.navigationPaths.length > 0 ?
          (Date.now() - this.sessionData.startTime) / this.behaviorPatterns.navigationPaths.length : 0
      },
      
      behaviorInsights: {
        topGenres: Object.entries(this.behaviorPatterns.mostViewedGenres)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([genre, count]) => ({ genre, views: count })),
        
        searchBehavior: {
          totalSearches: this.behaviorPatterns.searchPatterns.length,
          averageQueryLength: this.behaviorPatterns.searchPatterns.length > 0 ?
            this.behaviorPatterns.searchPatterns.reduce((sum, s) => sum + s.query.length, 0) / this.behaviorPatterns.searchPatterns.length : 0,
          commonSearchTerms: this.getCommonSearchTerms()
        },
        
        navigationPattern: this.behaviorPatterns.navigationPaths.map(p => p.page),
        
        mostUsedFeatures: Object.entries(this.behaviorPatterns.featureUsage)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([feature, count]) => ({ feature, uses: count }))
      },
      
      performanceInsights: {
        averageApiResponseTime: this.performanceMetrics.apiResponseTimes.length > 0 ?
          this.performanceMetrics.apiResponseTimes.reduce((sum, r) => sum + r.value, 0) / this.performanceMetrics.apiResponseTimes.length : 0,
        
        errorRate: this.sessionData.interactions > 0 ?
          this.sessionData.errorsEncountered / this.sessionData.interactions : 0,
        
        topErrors: Object.entries(this.performanceMetrics.errorCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([error, count]) => ({ error, count }))
      },
      
      recommendations: this.generateRecommendations()
    };
    
    return insights;
  }

  /**
   * Generate user recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Genre recommendations based on viewing patterns
    const topGenres = Object.entries(this.behaviorPatterns.mostViewedGenres)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topGenres.length > 0) {
      recommendations.push({
        type: 'genre_exploration',
        message: `You seem to enjoy ${topGenres[0][0]} games. Check out our curated ${topGenres[0][0]} collection!`,
        action: 'explore_genre',
        data: { genre: topGenres[0][0] }
      });
    }
    
    // Search improvement recommendations
    const avgQueryLength = this.behaviorPatterns.searchPatterns.length > 0 ?
      this.behaviorPatterns.searchPatterns.reduce((sum, s) => sum + s.query.length, 0) / this.behaviorPatterns.searchPatterns.length : 0;
    
    if (avgQueryLength < 3) {
      recommendations.push({
        type: 'search_improvement',
        message: 'Try using more specific search terms to find exactly what you\'re looking for!',
        action: 'show_search_tips'
      });
    }
    
    // Collection recommendations
    if (this.sessionData.gamesViewed > 5 && this.sessionData.collectionsModified === 0) {
      recommendations.push({
        type: 'collection_usage',
        message: 'Start building your game collection to keep track of games you want to play!',
        action: 'show_collection_tutorial'
      });
    }
    
    return recommendations;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Error handling
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleError);
    
    // Performance monitoring
    this.setupPerformanceObserver();
  }

  /**
   * Setup performance observer
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.trackPerformance('navigation', entry.duration, {
            entryType: entry.entryType,
            name: entry.name
          });
        });
      });
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('⚠️ Performance observer not supported');
      }
      
      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name.includes('api.rawg.io')) {
            this.trackPerformance('api_response_time', entry.duration, {
              url: entry.name,
              method: 'GET'
            });
          }
        });
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('⚠️ Resource observer not supported');
      }
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.track('page_hidden', {
        timeVisible: Date.now() - (this.pageStartTime || Date.now())
      });
    } else {
      this.track('page_visible');
      this.pageStartTime = Date.now();
    }
  }

  /**
   * Handle before unload
   */
  handleBeforeUnload() {
    // Flush remaining events
    this.flush(true);
    
    // Track session end
    this.track('session_ended', {
      duration: Date.now() - this.sessionData.startTime,
      ...this.sessionData
    });
  }

  /**
   * Handle errors
   */
  handleError(event) {
    const error = event.error || event.reason || new Error('Unknown error');
    this.trackError(error, {
      source: 'global_handler',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  /**
   * Update session data
   */
  updateSessionData(eventName, properties) {
    // Update counters based on event type
    switch (eventName) {
      case 'page_viewed':
        this.sessionData.pageViews++;
        break;
      case 'user_interaction':
        this.sessionData.interactions++;
        break;
      case 'search_performed':
        this.sessionData.searchQueries++;
        break;
      case 'game_interaction':
        if (properties.action === 'viewed') {
          this.sessionData.gamesViewed++;
        }
        break;
      case 'collection_modified':
        this.sessionData.collectionsModified++;
        break;
      case 'error_occurred':
        this.sessionData.errorsEncountered++;
        break;
    }
  }

  /**
   * Update behavior patterns
   */
  updateBehaviorPatterns(eventName, properties) {
    // Track feature usage
    if (eventName === 'user_interaction') {
      const featureKey = `${properties.element}_${properties.action}`;
      this.behaviorPatterns.featureUsage[featureKey] = 
        (this.behaviorPatterns.featureUsage[featureKey] || 0) + 1;
    }
    
    // Track search patterns
    if (eventName === 'search_performed') {
      this.behaviorPatterns.searchPatterns.push({
        query: properties.query,
        timestamp: Date.now(),
        resultCount: properties.resultCount
      });
    }
    
    // Track genre interests
    if (eventName === 'game_interaction' && properties.action === 'viewed' && properties.genres) {
      properties.genres.forEach(genre => {
        this.behaviorPatterns.mostViewedGenres[genre] = 
          (this.behaviorPatterns.mostViewedGenres[genre] || 0) + 1;
      });
    }
  }

  /**
   * Get common search terms
   */
  getCommonSearchTerms() {
    const termCounts = {};
    
    this.behaviorPatterns.searchPatterns.forEach(pattern => {
      const terms = pattern.query.toLowerCase().split(/\s+/);
      terms.forEach(term => {
        if (term.length > 2) { // Ignore short words
          termCounts[term] = (termCounts[term] || 0) + 1;
        }
      });
    });
    
    return Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));
  }

  /**
   * Initialize user segments
   */
  async initializeUserSegments() {
    // Basic segmentation based on behavior
    this.userSegments = ['new_user']; // Default segment
    
    try {
      // Load historical data to determine segments
      const userData = await this.loadUserData();
      
      if (userData) {
        if (userData.totalSessions > 10) {
          this.userSegments.push('power_user');
        }
        
        if (userData.totalCollectionItems > 50) {
          this.userSegments.push('collector');
        }
        
        if (userData.totalSearches > 100) {
          this.userSegments.push('explorer');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load user segments:', error);
    }
  }

  /**
   * Flush events to analytics endpoint
   */
  async flush(force = false) {
    if (this.eventQueue.length === 0) return;
    
    if (!force && this.eventQueue.length < this.config.batchSize) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      // In a real implementation, send to analytics service
      // For now, we'll just log to console in development
      if (this.config.enableDebugLogging) {
        console.log('📊 Flushing analytics events:', events);
      }
      
      // Simulate API call
      await this.sendEvents(events);
      
    } catch (error) {
      console.error('❌ Failed to flush analytics events:', error);
      
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Send events to analytics service
   */
  async sendEvents(events) {
    // In a production app, this would send to your analytics service
    // For now, we'll store locally for development/demo purposes
    
    try {
      const storedEvents = JSON.parse(localStorage.getItem('psp_analytics_events') || '[]');
      storedEvents.push(...events);
      
      // Keep only last 1000 events
      const recentEvents = storedEvents.slice(-1000);
      localStorage.setItem('psp_analytics_events', JSON.stringify(recentEvents));
      
      return { success: true };
    } catch (error) {
      throw new Error(`Analytics storage failed: ${error.message}`);
    }
  }

  /**
   * Start flush timer
   */
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or generate user ID
   */
  getUserId() {
    let userId = localStorage.getItem('psp_user_id');
    
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('psp_user_id', userId);
    }
    
    return userId;
  }

  /**
   * Save user ID
   */
  saveUserId() {
    localStorage.setItem('psp_user_id', this.userId);
  }

  /**
   * Save user properties
   */
  saveUserProperties() {
    localStorage.setItem('psp_user_properties', JSON.stringify(this.userProperties || {}));
  }

  /**
   * Load user data
   */
  async loadUserData() {
    try {
      const userData = localStorage.getItem('psp_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save experiments
   */
  saveExperiments() {
    const experimentsData = Object.fromEntries(this.experiments);
    localStorage.setItem('psp_experiments', JSON.stringify(experimentsData));
  }

  /**
   * Load experiments
   */
  loadExperiments() {
    try {
      const experimentsData = localStorage.getItem('psp_experiments');
      if (experimentsData) {
        const experiments = JSON.parse(experimentsData);
        this.experiments = new Map(Object.entries(experiments));
        
        // Clean up expired experiments
        this.experiments.forEach((experiment, id) => {
          if (Date.now() > experiment.endTime) {
            this.experiments.delete(id);
          }
        });
        
        this.saveExperiments();
      }
    } catch (error) {
      console.warn('⚠️ Failed to load experiments:', error);
    }
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary() {
    return {
      session: this.sessionData,
      performance: this.performanceMetrics,
      behavior: this.behaviorPatterns,
      experiments: Object.fromEntries(this.experiments),
      userSegments: this.userSegments,
      queueSize: this.eventQueue.length
    };
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (enabled && !this.isInitialized) {
      this.init();
    } else if (!enabled) {
      this.flush(true);
      this.stopFlushTimer();
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Flush remaining events
    this.flush(true);
    
    // Stop timer
    this.stopFlushTimer();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleError);
    
    // Clear data
    this.eventQueue = [];
    this.experiments.clear();
    
    this.isInitialized = false;
    console.log('🧹 Analytics Manager cleanup complete');
  }
}