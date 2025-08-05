/**
 * PSP Game Explorer - Service Worker
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'psp-game-explorer-v1.0.0';
const API_CACHE_NAME = 'psp-api-cache-v1.0.0';
const IMAGE_CACHE_NAME = 'psp-images-v1.0.0';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/components.css',
  '/styles/animations.css',
  '/js/app.js',
  '/js/services/GameAPI.js',
  '/js/components/UIManager.js',
  '/js/services/Router.js',
  '/js/services/StorageManager.js',
  '/js/components/NotificationManager.js',
  '/js/services/ThemeManager.js',
  '/js/components/SearchManager.js',
  '/js/services/CollectionManager.js',
  '/js/services/AnalyticsManager.js',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/favicon-32x32.png',
  '/assets/favicon-16x16.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  'https://api.rawg.io/api/games',
  'https://api.rawg.io/api/genres',
  'https://api.rawg.io/api/platforms'
];

// Cache configuration
const CACHE_CONFIG = {
  maxEntries: 100,
  maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
  imageMaxEntries: 200,
  imageMaxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Claim all clients
      self.clients.claim(),
      
      // Initialize background sync
      initializeBackgroundSync()
    ])
  );
});

/**
 * Fetch Event Handler
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
    // Handle different types of requests
  if (url.origin === location.origin) {
    // For local assets (CSS, JS, HTML), use a cache-first strategy.
    event.respondWith(handleStaticAssets(request));

  } else if (isImageRequest(request)) {
    // For external images, use a specific caching strategy.
    event.respondWith(handleImageRequest(request));

  } else {
    // For ALL other requests (including the RAWG API and Google Fonts),
    // bypass the Service Worker's cache and go directly to the network.
    // This allows the main application to handle the request, ensuring
    // necessary headers (like 'User-Agent') are sent correctly.
    event.respondWith(fetch(request));
  }
});

/**
 * Background Sync Event Handler
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-analytics':
      event.waitUntil(syncAnalytics());
      break;
    case 'sync-collection':
      event.waitUntil(syncCollection());
      break;
    case 'sync-user-data':
      event.waitUntil(syncUserData());
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

/**
 * Push Event Handler
 */
self.addEventListener('push', (event) => {
  console.log('📱 Push message received');
  
  const options = {
    body: 'Check out new PSP games added to the collection!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'psp-notification'
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore Games',
        icon: '/assets/icons/explore-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/close-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PSP Game Explorer', options)
  );
});

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/?utm_source=push_notification&utm_medium=notification&utm_campaign=game_discovery')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message Handler
 */
self.addEventListener('message', (event) => {
  console.log('💬 Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_GAME_DATA':
      event.waitUntil(cacheGameData(payload));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      break;
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      }));
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

/**
 * Handle static asset requests
 */
async function handleStaticAssets(request) {
  try {
    // Try cache first for static assets
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Return cached version and update in background
      updateCacheInBackground(request);
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ Static asset fetch failed:', error);
    
    // Return offline fallback
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response(
        createOfflinePage(),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

/**
 * Handle API requests
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `${url.pathname}${url.search}`;
  
  try {
    // Check cache first for GET requests
    if (request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(cacheKey);
      
      if (cachedResponse) {
        const cachedDate = new Date(cachedResponse.headers.get('sw-cache-date'));
        const isExpired = Date.now() - cachedDate.getTime() > CACHE_CONFIG.maxAgeSeconds * 1000;
        
        if (!isExpired) {
          console.log('📦 Serving API response from cache:', cacheKey);
          return cachedResponse;
        }
      }
    }
    
    // Fetch from network
    console.log('🌐 Fetching API request from network:', cacheKey);
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cache-date', new Date().toISOString());
      
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(cacheKey, responseToCache);
      
      // Clean up old entries
      cleanupCache(API_CACHE_NAME, CACHE_CONFIG.maxEntries);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ API request failed:', error);
    
    // Try to return cached version
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      console.log('📦 Serving stale API response from cache:', cacheKey);
      return cachedResponse;
    }
    
    // Return offline response
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      offline: true,
      message: 'This request failed because you are offline.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle image requests
 */
async function handleImageRequest(request) {
  try {
    // Check cache first
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the image
      cache.put(request, networkResponse.clone());
      
      // Clean up old images
      cleanupCache(IMAGE_CACHE_NAME, CACHE_CONFIG.imageMaxEntries);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ Image request failed:', error);
    
    // Return placeholder image
    return new Response(createPlaceholderImage(), {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(new URL(request.url).pathname);
}

/**
 * Update cache in background
 */
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silent fail for background updates
    console.warn('⚠️ Background cache update failed:', error);
  }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME];
  
  const deletePromises = cacheNames
    .filter(cacheName => !validCaches.includes(cacheName))
    .map(cacheName => {
      console.log('🗑️ Deleting old cache:', cacheName);
      return caches.delete(cacheName);
    });
  
  return Promise.all(deletePromises);
}

/**
 * Clean up cache entries
 */
async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  
  if (requests.length > maxEntries) {
    const deleteCount = requests.length - maxEntries;
    const deletePromises = requests
      .slice(0, deleteCount)
      .map(request => cache.delete(request));
    
    await Promise.all(deletePromises);
    console.log(`🧹 Cleaned up ${deleteCount} entries from ${cacheName}`);
  }
}

/**
 * Initialize background sync
 */
async function initializeBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    console.log('🔄 Background sync is supported');
    
    // Register background sync events
    try {
      await self.registration.sync.register('sync-analytics');
      await self.registration.sync.register('sync-collection');
      await self.registration.sync.register('sync-user-data');
    } catch (error) {
      console.warn('⚠️ Background sync registration failed:', error);
    }
  }
}

/**
 * Sync analytics data
 */
async function syncAnalytics() {
  try {
    console.log('📊 Syncing analytics data...');
    
    // Get pending analytics events from IndexedDB
    const pendingEvents = await getPendingAnalyticsEvents();
    
    if (pendingEvents.length > 0) {
      // Send to analytics service
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: pendingEvents })
      });
      
      if (response.ok) {
        // Clear sent events
        await clearPendingAnalyticsEvents(pendingEvents);
        console.log('✅ Analytics data synced successfully');
      }
    }
  } catch (error) {
    console.error('❌ Analytics sync failed:', error);
    throw error; // Re-throw to retry later
  }
}

/**
 * Sync collection data
 */
async function syncCollection() {
  try {
    console.log('📚 Syncing collection data...');
    
    // Get pending collection changes
    const pendingChanges = await getPendingCollectionChanges();
    
    if (pendingChanges.length > 0) {
      // Send to server
      const response = await fetch('/api/collection/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: pendingChanges })
      });
      
      if (response.ok) {
        await clearPendingCollectionChanges(pendingChanges);
        console.log('✅ Collection data synced successfully');
      }
    }
  } catch (error) {
    console.error('❌ Collection sync failed:', error);
    throw error;
  }
}

/**
 * Sync user data
 */
async function syncUserData() {
  try {
    console.log('👤 Syncing user data...');
    
    // Implementation would depend on your user data structure
    console.log('✅ User data sync complete');
  } catch (error) {
    console.error('❌ User data sync failed:', error);
    throw error;
  }
}

/**
 * Cache game data
 */
async function cacheGameData(gameData) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const response = new Response(JSON.stringify(gameData), {
      headers: {
        'Content-Type': 'application/json',
        'sw-cache-date': new Date().toISOString()
      }
    });
    
    await cache.put(`/api/games/${gameData.id}`, response);
    console.log('💾 Game data cached:', gameData.name);
  } catch (error) {
    console.error('❌ Failed to cache game data:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames.map(name => caches.delete(name));
  await Promise.all(deletePromises);
  console.log('🧹 All caches cleared');
}

/**
 * Get cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return {
    bytes: totalSize,
    mb: (totalSize / (1024 * 1024)).toFixed(2),
    caches: cacheNames.length
  };
}

/**
 * Create offline page HTML
 */
function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - PSP Game Explorer</title>
      <style>
        body {
          font-family: 'Rajdhani', sans-serif;
          background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
          color: #e6e6e6;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          text-align: center;
        }
        .offline-container {
          max-width: 400px;
          padding: 2rem;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #00ffff;
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        p {
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }
        .retry-btn {
          background: linear-gradient(135deg, #00ffff, #8338ec);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        .retry-btn:hover {
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📴</div>
        <h1>You're Offline</h1>
        <p>PSP Game Explorer is not available right now. Check your internet connection and try again.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          🔄 Try Again
        </button>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create placeholder image SVG
 */
function createPlaceholderImage() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect width="300" height="200" fill="#1a1a2e"/>
      <text x="150" y="100" text-anchor="middle" fill="#00ffff" font-size="48">🎮</text>
      <text x="150" y="130" text-anchor="middle" fill="#888" font-size="14" font-family="Arial">Image not available</text>
    </svg>
  `;
}

/**
 * Get pending analytics events (placeholder)
 */
async function getPendingAnalyticsEvents() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

/**
 * Clear pending analytics events (placeholder)
 */
async function clearPendingAnalyticsEvents(events) {
  // In a real implementation, this would clear from IndexedDB
}

/**
 * Get pending collection changes (placeholder)
 */
async function getPendingCollectionChanges() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

/**
 * Clear pending collection changes (placeholder)
 */
async function clearPendingCollectionChanges(changes) {
  // In a real implementation, this would clear from IndexedDB
}

console.log('🚀 PSP Game Explorer Service Worker loaded');
