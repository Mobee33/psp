/**
 * Router Service
 * Handles client-side routing and navigation
 */

export class Router {
  constructor(uiManager) {
    this.ui = uiManager;
    this.routes = new Map();
    this.currentRoute = null;
    this.basePath = '';
    
    // Define application routes
    this.defineRoutes();
    
    // Bind methods
    this.handlePopState = this.handlePopState.bind(this);
  }

  /**
   * Initialize router
   */
  init() {
    console.log('🗺️ Initializing Router...');
    
    // Listen for browser navigation
    window.addEventListener('popstate', this.handlePopState);
    
    // Handle initial route
    this.handleInitialRoute();
    
    console.log('✅ Router initialized');
  }

  /**
   * Define application routes
   */
  defineRoutes() {
    this.routes.set('/', {
      page: 'home',
      title: 'PSP Game Explorer',
      description: 'Discover the ultimate PlayStation Portable collection'
    });
    
    this.routes.set('/games', {
      page: 'games',
      title: 'All PSP Games',
      description: 'Browse the complete PSP game library'
    });
    
    this.routes.set('/genres', {
      page: 'genres',
      title: 'Game Genres',
      description: 'Explore PSP games by category'
    });
    
    this.routes.set('/collection', {
      page: 'collection',
      title: 'My Collection',
      description: 'Manage your PSP game collection'
    });
    
    this.routes.set('/about', {
      page: 'about',
      title: 'About PSP Game Explorer',
      description: 'Learn about the ultimate PSP gaming resource'
    });
    
    // Dynamic routes
    this.routes.set('/game/:id', {
      page: 'game-detail',
      title: 'Game Details',
      description: 'Detailed information about a PSP game',
      dynamic: true
    });
    
    this.routes.set('/genre/:slug', {
      page: 'genre-detail',
      title: 'Genre Games',
      description: 'Games in a specific genre',
      dynamic: true
    });
  }

  /**
   * Handle initial route on page load
   */
  handleInitialRoute() {
    const path = this.getCurrentPath();
    const route = this.matchRoute(path);
    
    if (route) {
      this.navigateToRoute(route, path, false);
    } else {
      // Fallback to home
      this.navigateTo('/', false);
    }
  }

  /**
   * Handle browser back/forward navigation
   */
  handlePopState(event) {
    const path = this.getCurrentPath();
    const route = this.matchRoute(path);
    
    if (route) {
      this.navigateToRoute(route, path, false);
    }
  }

  /**
   * Get current path from URL
   */
  getCurrentPath() {
    return window.location.pathname || '/';
  }

  /**
   * Match path to route
   */
  matchRoute(path) {
    // Check exact matches first
    if (this.routes.has(path)) {
      return { ...this.routes.get(path), path, params: {} };
    }
    
    // Check dynamic routes
    for (const [routePath, routeConfig] of this.routes.entries()) {
      if (routeConfig.dynamic) {
        const params = this.matchDynamicRoute(routePath, path);
        if (params) {
          return { ...routeConfig, path: routePath, params };
        }
      }
    }
    
    return null;
  }

  /**
   * Match dynamic route patterns
   */
  matchDynamicRoute(routePath, actualPath) {
    const routeParts = routePath.split('/');
    const pathParts = actualPath.split('/');
    
    if (routeParts.length !== pathParts.length) {
      return null;
    }
    
    const params = {};
    
    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];
      
      if (routePart.startsWith(':')) {
        // Dynamic parameter
        const paramName = routePart.slice(1);
        params[paramName] = pathPart;
      } else if (routePart !== pathPart) {
        // Static part doesn't match
        return null;
      }
    }
    
    return params;
  }

  /**
   * Navigate to a specific path
   */
  navigateTo(path, pushState = true) {
    const route = this.matchRoute(path);
    
    if (route) {
      this.navigateToRoute(route, path, pushState);
    } else {
      console.warn(`🗺️ Route not found: ${path}`);
      this.navigateTo('/', pushState);
    }
  }

  /**
   * Navigate to a matched route
   */
  navigateToRoute(route, path, pushState = true) {
    // Update browser history
    if (pushState && path !== this.getCurrentPath()) {
      history.pushState({ route, path }, route.title, path);
    }
    
    // Update document title and meta
    this.updatePageMeta(route);
    
    // Handle different page types
    switch (route.page) {
      case 'home':
      case 'games':
      case 'genres':
      case 'collection':
      case 'about':
        this.ui.navigateToPage(route.page);
        break;
        
      case 'game-detail':
        this.handleGameDetailRoute(route.params.id);
        break;
        
      case 'genre-detail':
        this.handleGenreDetailRoute(route.params.slug);
        break;
        
      default:
        console.warn(`🗺️ Unknown page type: ${route.page}`);
        this.navigateTo('/');
        return;
    }
    
    // Update current route
    this.currentRoute = { ...route, path };
    
    // Track navigation
    if (this.ui.app?.analytics) {
      this.ui.app.analytics.track('route_navigation', {
        from: this.currentRoute?.path || null,
        to: path,
        page: route.page
      });
    }
  }

  /**
   * Handle game detail route
   */
  async handleGameDetailRoute(gameId) {
    try {
      // Show game details modal
      await this.ui.showGameDetails(gameId);
      
      // Keep the home page active in background
      if (this.ui.currentPage !== 'home') {
        this.ui.navigateToPage('home');
      }
      
    } catch (error) {
      console.error('❌ Error loading game details:', error);
      this.navigateTo('/');
    }
  }

  /**
   * Handle genre detail route
   */
  async handleGenreDetailRoute(genreSlug) {
    try {
      // Show genre games
      await this.ui.showGenreGames(genreSlug);
      
      // Navigate to genres page
      if (this.ui.currentPage !== 'genres') {
        this.ui.navigateToPage('genres');
      }
      
    } catch (error) {
      console.error('❌ Error loading genre details:', error);
      this.navigateTo('/genres');
    }
  }

  /**
   * Update page meta information
   */
  updatePageMeta(route) {
    // Update title
    document.title = route.title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.content = route.description;
    }
    
    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = window.location.href;
    }
    
    // Update Open Graph tags
    this.updateOpenGraphTags(route);
  }

  /**
   * Update Open Graph meta tags
   */
  updateOpenGraphTags(route) {
    const ogTags = {
      'og:title': route.title,
      'og:description': route.description,
      'og:url': window.location.href,
      'og:type': 'website',
      'og:site_name': 'PSP Game Explorer'
    };
    
    Object.entries(ogTags).forEach(([property, content]) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    });
  }

  /**
   * Generate URL for route
   */
  generateUrl(routeName, params = {}) {
    // Find route by page name
    let targetRoute = null;
    let targetPath = null;
    
    for (const [path, route] of this.routes.entries()) {
      if (route.page === routeName) {
        targetRoute = route;
        targetPath = path;
        break;
      }
    }
    
    if (!targetRoute) {
      console.warn(`🗺️ Route not found: ${routeName}`);
      return '/';
    }
    
    // Replace dynamic parameters
    let finalPath = targetPath;
    Object.entries(params).forEach(([key, value]) => {
      finalPath = finalPath.replace(`:${key}`, value);
    });
    
    return finalPath;
  }

  /**
   * Check if current route matches
   */
  isCurrentRoute(path) {
    return this.currentRoute?.path === path;
  }

  /**
   * Get current route information
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Navigate back in history
   */
  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.navigateTo('/');
    }
  }

  /**
   * Navigate forward in history
   */
  goForward() {
    window.history.forward();
  }

  /**
   * Replace current route
   */
  replace(path) {
    const route = this.matchRoute(path);
    if (route) {
      history.replaceState({ route, path }, route.title, path);
      this.navigateToRoute(route, path, false);
    }
  }

  /**
   * Add query parameters to current URL
   */
  addQueryParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    history.replaceState(
      { route: this.currentRoute, path: url.pathname + url.search },
      document.title,
      url.toString()
    );
  }

  /**
   * Remove query parameters from current URL
   */
  removeQueryParams(keys) {
    const url = new URL(window.location);
    keys.forEach(key => url.searchParams.delete(key));
    
    history.replaceState(
      { route: this.currentRoute, path: url.pathname + url.search },
      document.title,
      url.toString()
    );
  }

  /**
   * Get query parameters
   */
  getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  }

  /**
   * Get hash from URL
   */
  getHash() {
    return window.location.hash.slice(1);
  }

  /**
   * Set hash in URL
   */
  setHash(hash) {
    window.location.hash = hash;
  }

  /**
   * Listen for route changes
   */
  onRouteChange(callback) {
    window.addEventListener('popstate', () => {
      callback(this.currentRoute);
    });
  }

  /**
   * Generate breadcrumbs for current route
   */
  getBreadcrumbs() {
    if (!this.currentRoute) return [];
    
    const breadcrumbs = [{ name: 'Home', path: '/' }];
    
    switch (this.currentRoute.page) {
      case 'games':
        breadcrumbs.push({ name: 'Games', path: '/games' });
        break;
      case 'genres':
        breadcrumbs.push({ name: 'Genres', path: '/genres' });
        break;
      case 'collection':
        breadcrumbs.push({ name: 'My Collection', path: '/collection' });
        break;
      case 'about':
        breadcrumbs.push({ name: 'About', path: '/about' });
        break;
      case 'game-detail':
        breadcrumbs.push(
          { name: 'Games', path: '/games' },
          { name: 'Game Details', path: this.currentRoute.path }
        );
        break;
      case 'genre-detail':
        breadcrumbs.push(
          { name: 'Genres', path: '/genres' },
          { name: 'Genre Details', path: this.currentRoute.path }
        );
        break;
    }
    
    return breadcrumbs;
  }

  /**
   * Prefetch route data
   */
  async prefetchRoute(path) {
    const route = this.matchRoute(path);
    if (!route) return;
    
    try {
      // Prefetch based on route type
      switch (route.page) {
        case 'games':
          await this.ui.app.gameAPI.searchGames('', { pageSize: 20 });
          break;
        case 'genres':
          await this.ui.app.gameAPI.getGenres();
          break;
        case 'game-detail':
          if (route.params.id) {
            await this.ui.app.gameAPI.getGameDetails(route.params.id);
          }
          break;
      }
      
      console.log(`✅ Prefetched data for route: ${path}`);
    } catch (error) {
      console.warn(`⚠️ Failed to prefetch route ${path}:`, error);
    }
  }

  /**
   * Check if route requires authentication
   */
  isProtectedRoute(path) {
    const protectedRoutes = ['/collection'];
    return protectedRoutes.includes(path);
  }

  /**
   * Redirect to login if needed
   */
  requireAuth(path) {
    if (this.isProtectedRoute(path)) {
      // In a real app, this would redirect to login
      console.log('🔒 Route requires authentication:', path);
      return false;
    }
    return true;
  }

  /**
   * Get route analytics data
   */
  getRouteAnalytics() {
    return {
      currentRoute: this.currentRoute?.path || null,
      visitedRoutes: this.visitedRoutes || [],
      routeStartTime: this.routeStartTime || null,
      previousRoute: this.previousRoute || null
    };
  }

  /**
   * Clean up router
   */
  destroy() {
    window.removeEventListener('popstate', this.handlePopState);
    this.routes.clear();
    this.currentRoute = null;
    
    console.log('🧹 Router cleanup complete');
  }
}