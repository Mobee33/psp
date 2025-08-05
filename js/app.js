/**
 * PSP Game Explorer - Main Application
 * Industry-grade JavaScript architecture
 */

// Import modules
import { GameAPI } from './services/GameAPI.js';
import { UIManager } from './components/UIManager.js';
import { Router } from './services/Router.js';
import { StorageManager } from './services/StorageManager.js';
import { NotificationManager } from './components/NotificationManager.js';
import { ThemeManager } from './services/ThemeManager.js';
import { SearchManager } from './components/SearchManager.js';
import { CollectionManager } from './services/CollectionManager.js';
import { AnalyticsManager } from './services/AnalyticsManager.js';

/**
 * Main Application Class
 * Orchestrates all app functionality
 */
class PSPGameExplorer {
  constructor() {
    this.isInitialized = false;
    this.config = {
      version: '1.0.0',
      apiKeys: {
        rawg: '72ad754cd1d84657bb6f3ade5992b659'
      },
      features: {
        analytics: true,
        notifications: true,
        offline: true,
        collection: true
      },
      performance: {
        lazyLoading: true,
        imageOptimization: true,
        caching: true
      }
    };
    
    // Initialize managers
    this.initializeManagers();
    
    // Bind methods
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
  }

  /**
   * Initialize all service managers
   */
  initializeManagers() {
    try {
      // Core services
      this.storage = new StorageManager();
      this.analytics = new AnalyticsManager(this.config.features.analytics);
      this.notifications = new NotificationManager();
      this.theme = new ThemeManager();
      
      // API and data services  
      this.gameAPI = new GameAPI(this.config.apiKeys.rawg);
      this.collection = new CollectionManager(this.storage);
      
      // UI services
      this.ui = new UIManager(this);
      this.search = new SearchManager(this.gameAPI, this.ui);
      this.router = new Router(this.ui);
      
      console.log('✅ All managers initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing managers:', error);
      this.handleFatalError(error);
    }
  }

  /**
   * Initialize the application
   */
 async init() {
    if (this.isInitialized) return;

    try {
        console.log('🚀 Initializing PSP Game Explorer...');
        this.showLoadingScreen();
        
        await this.initializeServices();
        this.setupEventListeners();
        
        // This is the key change: UIManager will now handle its own initial data load.
        await this.ui.init(); 
        
        this.router.init();
        this.search.init();
        
        // REMOVE the call to this.loadInitialData()
        // await this.loadInitialData(); // <-- DELETE OR COMMENT OUT THIS LINE

        this.hideLoadingScreen();
        this.isInitialized = true;
        
        this.analytics.track('app_started', {
            version: this.config.version,
            timestamp: Date.now()
        });
        
        this.notifications.show({
            title: 'Welcome to PSP Game Explorer! 🎮',
            message: 'Discover the ultimate PlayStation Portable collection',
            type: 'success',
            duration: 4000
        });
        
        console.log('✅ PSP Game Explorer initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        this.handleFatalError(error);
    }
}

  /**
   * Initialize core services
   */
  async initializeServices() {
    const services = [
      { name: 'Storage', fn: () => this.storage.init() },
      { name: 'Theme', fn: () => this.theme.init() },
      { name: 'Analytics', fn: () => this.analytics.init() },
      { name: 'Collection', fn: () => this.collection.init() },
      { name: 'Game API', fn: () => this.gameAPI.init() }
    ];

    for (const service of services) {
      try {
        await service.fn();
        console.log(`✅ ${service.name} initialized`);
      } catch (error) {
        console.warn(`⚠️ ${service.name} failed to initialize:`, error);
      }
    }
  }

  /**
   * Load initial application data
   */
   async loadInitialData() {
    try {
      console.log('📊 Loading initial data...');
      
      const featuredGames = await this.gameAPI.getFeaturedGames();
      this.ui.loadFeaturedGames(featuredGames);
      
      const genres = await this.app.gameAPI.getGenres();
      this.ui.loadGenres(genres);
      
      const collection = await this.collection.getCollection();
      this.ui.updateCollectionStats(collection);
      
      console.log('✅ Initial data loaded');
      
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      this.notifications.show({
        title: 'Data Loading Error',
        message: 'Some content may not display correctly',
        type: 'warning',
        duration: 5000
      });
    }

    // Animate stats regardless of API success, as they are hardcoded
    this.animateStats();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window events
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Network events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    
    // Error handling
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // Performance monitoring
    if ('performance' in window) {
      window.addEventListener('load', this.trackPerformance.bind(this));
    }
    
    console.log('✅ Event listeners setup complete');
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.ui.handleResize();
      this.analytics.track('window_resized', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    }, 250);
  }

  /**
   * Handle visibility change (tab switching)
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.analytics.track('app_hidden');
      // Pause non-essential animations
      document.body.classList.add('app-hidden');
    } else {
      this.analytics.track('app_visible');
      // Resume animations
      document.body.classList.remove('app-hidden');
    }
  }

  /**
   * Handle online status
   */
  handleOnline() {
    this.notifications.show({
      title: 'Back Online! 🌐',
      message: 'Connection restored. Syncing data...',
      type: 'success',
      duration: 3000
    });
    
    this.gameAPI.setOnlineMode(true);
    this.analytics.track('connection_restored');
  }

  /**
   * Handle offline status
   */
  handleOffline() {
    this.notifications.show({
      title: 'Offline Mode 📴',
      message: 'Some features may be limited',
      type: 'warning',
      duration: 4000
    });
    
    this.gameAPI.setOnlineMode(false);
    this.analytics.track('connection_lost');
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K for search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.search.open();
      this.analytics.track('search_opened', { method: 'keyboard' });
    }
    
    // Escape key
    if (event.key === 'Escape') {
      this.ui.closeAllModals();
    }
    
    // Arrow key navigation
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      this.ui.handleArrowNavigation(event.key);
    }
  }

  /**
   * Handle JavaScript errors
   */
  handleError(event) {
    console.error('JavaScript Error:', event.error);
    
    this.analytics.track('javascript_error', {
      message: event.error?.message || 'Unknown error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    // Show user-friendly error message
    this.notifications.show({
      title: 'Something went wrong',
      message: 'The app encountered an error. Please refresh if issues persist.',
      type: 'error',
      duration: 6000
    });
  }

  /**
   * Handle promise rejections
   */
  handlePromiseRejection(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    this.analytics.track('promise_rejection', {
      reason: event.reason?.message || 'Unknown reason'
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance() {
    if (!('performance' in window)) return;
    
    const perfData = {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
    };
    
    this.analytics.track('performance_metrics', perfData);
    console.log('📊 Performance metrics:', perfData);
  }

  /**
   * Animate statistics counters
   */
  animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.dataset.target);
          this.animateCounter(entry.target, 0, target, 2000);
          observer.unobserve(entry.target);
        }
      });
    });
    
    statNumbers.forEach(stat => observer.observe(stat));
  }

  /**
   * Animate counter from start to target
   */
  animateCounter(element, start, target, duration) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * easeOut);
      
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = target;
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
      
      // Animate progress bar
      const progressBar = loadingScreen.querySelector('.loading-progress');
      if (progressBar) {
        progressBar.style.width = '0%';
        setTimeout(() => {
          progressBar.style.transition = 'width 2s ease-out';
          progressBar.style.width = '100%';
        }, 100);
      }
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        // Remove from DOM after animation
        setTimeout(() => {
          loadingScreen.remove();
        }, 500);
      }, 1000);
    }
  }

  /**
   * Handle fatal errors
   */
  handleFatalError(error) {
    console.error('❌ Fatal Error:', error);
    
    // Hide loading screen
    this.hideLoadingScreen();
    
    // Show error message
    document.body.innerHTML = `
      <div class="error-screen">
        <div class="error-content">
          <h1>🚫 Application Error</h1>
          <p>PSP Game Explorer encountered a fatal error and cannot continue.</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <button onclick="window.location.reload()" class="error-button">
            🔄 Reload Application
          </button>
        </div>
      </div>
      <style>
        .error-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
          color: #e6e6e6;
          font-family: 'Rajdhani', sans-serif;
          text-align: center;
          padding: 20px;
        }
        .error-content {
          max-width: 500px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 40px;
          backdrop-filter: blur(15px);
        }
        .error-content h1 {
          color: #ff006e;
          margin-bottom: 20px;
          font-size: 2rem;
        }
        .error-content p {
          margin-bottom: 15px;
          line-height: 1.6;
        }
        .error-button {
          background: linear-gradient(135deg, #00ffff, #8338ec);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.3s ease;
        }
        .error-button:hover {
          transform: translateY(-2px);
        }
      </style>
    `;
  }

  /**
   * Get app instance (singleton pattern)
   */
  static getInstance() {
    if (!PSPGameExplorer.instance) {
      PSPGameExplorer.instance = new PSPGameExplorer();
    }
    return PSPGameExplorer.instance;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // Clear timeouts
    clearTimeout(this.resizeTimeout);
    
    // Cleanup managers
    this.ui?.destroy();
    this.search?.destroy();
    this.router?.destroy();
    this.analytics?.destroy();
    
    this.isInitialized = false;
    console.log('🧹 Application cleanup complete');
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = PSPGameExplorer.getInstance();
  
  // Start initialization
  app.init().catch(error => {
    console.error('Failed to initialize application:', error);
  });
  
  // Make app globally available for debugging
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.PSPGameExplorer = app;
}
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  const app = PSPGameExplorer.getInstance();
  if (app.isInitialized) {
    app.analytics.track('app_unload');
  }
});

// Export for testing
export default PSPGameExplorer;