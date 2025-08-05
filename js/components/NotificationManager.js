/**
 * NotificationManager - Toast Notification System
 * Handles in-app notifications, alerts, and user feedback
 */

export class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.queue = [];
    this.maxNotifications = 5;
    this.defaultDuration = 4000;
    this.animationDuration = 300;
    this.isInitialized = false;
    
    // Notification types with default styling
    this.types = {
      success: {
        icon: '✅',
        className: 'success',
        color: '#06ffa5',
        sound: 'success'
      },
      error: {
        icon: '❌',
        className: 'error', 
        color: '#ff4757',
        sound: 'error'
      },
      warning: {
        icon: '⚠️',
        className: 'warning',
        color: '#ffaa00',
        sound: 'warning'
      },
      info: {
        icon: 'ℹ️',
        className: 'info',
        color: '#3a86ff',
        sound: 'info'
      },
      loading: {
        icon: '⏳',
        className: 'loading',
        color: '#00ffff',
        sound: null
      }
    };
    
    // Sound effects (using Web Audio API)
    this.sounds = new Map();
    this.audioContext = null;
    this.userInteracted = false; // Add this new flag
    
    // Initialize on first use
    this.init();
  }

  /**
   * Initialize notification system
   */
  init() {
    if (this.isInitialized) return;
    
    console.log('🔔 Initializing Notification Manager...');
    
    // Create notification container
    this.createContainer();
    
    // Initialize audio context
    this.resumeAudioContext();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Setup permission handling
    this.setupPermissions();
    
    this.isInitialized = true;
    console.log('✅ Notification Manager initialized');
  }

  resumeAudioContext() {
    if (this.userInteracted || !window.AudioContext) return;
    
    this.userInteracted = true;
    
    // This function will be called on the first click/tap anywhere on the page
    const initAudio = () => {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.generateNotificationSounds();
                console.log('🔊 AudioContext initialized on user gesture.');
            } catch (e) {
                console.warn('⚠️ Web Audio API could not be initialized:', e);
            }
        }
        // Remove the listener after it has run once
        document.body.removeEventListener('click', initAudio);
        document.body.removeEventListener('touchstart', initAudio);
    };
    
    document.body.addEventListener('click', initAudio);
    document.body.addEventListener('touchstart', initAudio);
}

  /**
   * Create notification container
   */
  createContainer() {
    // Check if container already exists
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Initialize Web Audio API for notification sounds
   */
  initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.generateNotificationSounds();
    } catch (error) {
      console.warn('⚠️ Web Audio API not supported:', error);
    }
  }

  /**
   * Generate notification sounds using Web Audio API
   */
  generateNotificationSounds() {
    if (!this.audioContext) return;
    
    const sounds = {
      success: { frequency: 800, duration: 0.15, type: 'sine' },
      error: { frequency: 300, duration: 0.3, type: 'square' },
      warning: { frequency: 600, duration: 0.2, type: 'triangle' },
      info: { frequency: 500, duration: 0.1, type: 'sine' }
    };
    
    Object.entries(sounds).forEach(([name, config]) => {
      this.sounds.set(name, config);
    });
  }

  /**
   * Play notification sound
   */
  playSound(soundName) {
    if (!this.audioContext || !this.sounds.has(soundName)) return;
    
    try {
      const config = this.sounds.get(soundName);
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
      oscillator.type = config.type;
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + config.duration);
      
    } catch (error) {
      console.warn('⚠️ Sound playback failed:', error);
    }
  }

  /**
   * Show notification
   */
  show(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    
    const notification = this.createNotification(options);
    
    // Add to queue if too many notifications
    if (this.notifications.size >= this.maxNotifications) {
      this.queue.push(notification);
      return notification.id;
    }
    
    this.displayNotification(notification);
    return notification.id;
  }

  /**
   * Create notification object
   */
  createNotification(options) {
    const {
      title = '',
      message = '',
      type = 'info',
      duration = this.defaultDuration,
      persistent = false,
      actions = [],
      onClick = null,
      onClose = null,
      html = false,
      position = 'top-right'
    } = options;
    
    const id = this.generateId();
    const typeConfig = this.types[type] || this.types.info;
    
    return {
      id,
      title,
      message,
      type,
      typeConfig,
      duration,
      persistent,
      actions,
      onClick,
      onClose,
      html,
      position,
      timestamp: Date.now(),
      element: null
    };
  }

  /**
   * Display notification in DOM
   */
  displayNotification(notification) {
    // Create notification element
    const element = this.createNotificationElement(notification);
    notification.element = element;
    
    // Add to container
    this.container.appendChild(element);
    
    // Add to active notifications
    this.notifications.set(notification.id, notification);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
      element.classList.add('animate-slide-in-right');
    });
    
    // Play sound
    if (notification.typeConfig.sound) {
      this.playSound(notification.typeConfig.sound);
    }
    
    // Auto-remove after duration (if not persistent)
    if (!notification.persistent && notification.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }
    
    // Process queue
    this.processQueue();
  }

  /**
   * Create notification DOM element
   */
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification ${notification.typeConfig.className}`;
    element.dataset.notificationId = notification.id;
    
    // Build notification content
    let content = `
      <div class="notification-content">
        <div class="notification-icon">${notification.typeConfig.icon}</div>
        <div class="notification-body">
    `;
    
    if (notification.title) {
      content += `<div class="notification-title">${this.escapeHtml(notification.title)}</div>`;
    }
    
    if (notification.message) {
      if (notification.html) {
        content += `<div class="notification-message">${notification.message}</div>`;
      } else {
        content += `<div class="notification-message">${this.escapeHtml(notification.message)}</div>`;
      }
    }
    
    content += `
        </div>
        <button class="notification-close" aria-label="Close notification">&times;</button>
      </div>
    `;
    
    // Add actions if any
    if (notification.actions.length > 0) {
      content += '<div class="notification-actions">';
      notification.actions.forEach(action => {
        content += `
          <button class="notification-action" data-action="${action.id}">
            ${this.escapeHtml(action.label)}
          </button>
        `;
      });
      content += '</div>';
    }
    
    // Add progress bar for timed notifications
    if (!notification.persistent && notification.duration > 0) {
      content += `
        <div class="notification-progress">
          <div class="notification-progress-bar" style="animation-duration: ${notification.duration}ms"></div>
        </div>
      `;
    }
    
    element.innerHTML = content;
    
    // Setup event listeners
    this.setupNotificationEvents(element, notification);
    
    return element;
  }

  /**
   * Setup notification event listeners
   */
  setupNotificationEvents(element, notification) {
    // Close button
    const closeBtn = element.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(notification.id);
      });
    }
    
    // Action buttons
    const actionBtns = element.querySelectorAll('.notification-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionId = btn.dataset.action;
        const action = notification.actions.find(a => a.id === actionId);
        if (action && action.callback) {
          action.callback(notification);
        }
        // Auto-close after action unless specified otherwise
        if (!action.keepOpen) {
          this.remove(notification.id);
        }
      });
    });
    
    // Click handler
    if (notification.onClick) {
      element.addEventListener('click', () => {
        notification.onClick(notification);
      });
      element.style.cursor = 'pointer';
    }
    
    // Keyboard navigation
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.remove(notification.id);
      }
    });
    
    // Hover to pause auto-removal
    if (!notification.persistent && notification.duration > 0) {
      let pauseTimeout = null;
      
      element.addEventListener('mouseenter', () => {
        const progressBar = element.querySelector('.notification-progress-bar');
        if (progressBar) {
          progressBar.style.animationPlayState = 'paused';
        }
      });
      
      element.addEventListener('mouseleave', () => {
        const progressBar = element.querySelector('.notification-progress-bar');
        if (progressBar) {
          progressBar.style.animationPlayState = 'running';
        }
      });
    }
  }

  /**
   * Remove notification
   */
  remove(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification || !notification.element) return;
    
    const element = notification.element;
    
    // Trigger exit animation
    element.classList.add('animate-slide-out-right');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      // Remove from active notifications
      this.notifications.delete(notificationId);
      
      // Call onClose callback
      if (notification.onClose) {
        notification.onClose(notification);
      }
      
      // Process queue
      this.processQueue();
      
    }, this.animationDuration);
  }

  /**
   * Process notification queue
   */
  processQueue() {
    if (this.queue.length > 0 && this.notifications.size < this.maxNotifications) {
      const nextNotification = this.queue.shift();
      this.displayNotification(nextNotification);
    }
  }

  /**
   * Update existing notification
   */
  update(notificationId, updates) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    
    // Update notification object
    Object.assign(notification, updates);
    
    // Re-create element with updated content
    const oldElement = notification.element;
    const newElement = this.createNotificationElement(notification);
    notification.element = newElement;
    
    // Replace in DOM
    if (oldElement.parentNode) {
      oldElement.parentNode.replaceChild(newElement, oldElement);
    }
    
    return true;
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    // Remove all from DOM
    this.notifications.forEach(notification => {
      if (notification.element && notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
    });
    
    // Clear collections
    this.notifications.clear();
    this.queue.length = 0;
    
    console.log('🧹 All notifications cleared');
  }

  /**
   * Convenience methods for different notification types
   */
  success(message, options = {}) {
    return this.show({ ...options, message, type: 'success' });
  }

  error(message, options = {}) {
    return this.show({ ...options, message, type: 'error', duration: 6000 });
  }

  warning(message, options = {}) {
    return this.show({ ...options, message, type: 'warning', duration: 5000 });
  }

  info(message, options = {}) {
    return this.show({ ...options, message, type: 'info' });
  }

  loading(message, options = {}) {
    return this.show({ 
      ...options, 
      message, 
      type: 'loading', 
      persistent: true 
    });
  }

  /**
   * Show confirmation dialog
   */
  confirm(options) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      onConfirm = () => {},
      onCancel = () => {}
    } = options;
    
    return this.show({
      title,
      message,
      type: 'warning',
      persistent: true,
      actions: [
        {
          id: 'confirm',
          label: confirmText,
          callback: (notification) => {
            onConfirm(notification);
          }
        },
        {
          id: 'cancel',
          label: cancelText,
          callback: (notification) => {
            onCancel(notification);
          }
        }
      ]
    });
  }

  /**
   * Show progress notification
   */
  progress(options) {
    const {
      title = 'Processing...',
      message = '',
      progress = 0
    } = options;
    
    const id = this.show({
      title,
      message: `${message} (${progress}%)`,
      type: 'loading',
      persistent: true,
      html: true
    });
    
    return {
      id,
      update: (newProgress, newMessage) => {
        this.update(id, {
          message: `${newMessage || message} (${newProgress}%)`
        });
      },
      complete: (successMessage = 'Complete!') => {
        this.remove(id);
        this.success(successMessage);
      },
      error: (errorMessage = 'An error occurred') => {
        this.remove(id);
        this.error(errorMessage);
      }
    };
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + N to clear all notifications
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.clearAll();
      }
      
      // Escape to close latest notification
      if (e.key === 'Escape' && this.notifications.size > 0) {
        const latest = Array.from(this.notifications.values()).pop();
        if (latest) {
          this.remove(latest.id);
        }
      }
    });
  }

  /**
   * Setup browser notification permissions
   */
  async setupPermissions() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        // Don't request immediately, wait for user interaction
        console.log('📱 Browser notifications available but not requested');
      }
    }
  }

  /**
   * Request browser notification permission
   */
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log(`📱 Notification permission: ${permission}`);
        return permission === 'granted';
      } catch (error) {
        console.warn('⚠️ Notification permission request failed:', error);
        return false;
      }
    }
    return Notification.permission === 'granted';
  }

  /**
   * Show browser notification
   */
  async showBrowserNotification(title, options = {}) {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }
    
    try {
      const notification = new Notification(title, {
        icon: '/assets/favicon-32x32.png',
        badge: '/assets/favicon-16x16.png',
        ...options
      });
      
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
      return true;
    } catch (error) {
      console.warn('⚠️ Browser notification failed:', error);
      return false;
    }
  }

  /**
   * Utility methods
   */
  generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      active: this.notifications.size,
      queued: this.queue.length,
      total: this.notifications.size + this.queue.length,
      maxAllowed: this.maxNotifications
    };
  }

  /**
   * Set notification preferences
   */
  setPreferences(preferences) {
    const {
      maxNotifications = 5,
      defaultDuration = 4000,
      soundEnabled = true,
      animationsEnabled = true
    } = preferences;
    
    this.maxNotifications = maxNotifications;
    this.defaultDuration = defaultDuration;
    
    // Apply preferences
    if (!soundEnabled) {
      this.audioContext = null;
    }
    
    if (!animationsEnabled) {
      this.animationDuration = 0;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all notifications
    this.clearAll();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clear references
    this.notifications.clear();
    this.queue.length = 0;
    this.sounds.clear();
    
    this.isInitialized = false;
    console.log('🧹 Notification Manager cleanup complete');
  }
}