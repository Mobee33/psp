/**
 * ThemeManager - Theme and Appearance Management
 * Handles dark/light themes, custom themes, and visual preferences
 */

export class ThemeManager {
  constructor() {
    this.currentTheme = 'dark';
    this.systemPreference = null;
    this.customThemes = new Map();
    this.isInitialized = false;
    
    // Default themes
    this.themes = {
      dark: {
        name: 'Dark Gaming',
        description: 'Perfect for extended gaming sessions',
        colors: {
          primary: '#00ffff',
          secondary: '#ff006e',
          accent: '#8338ec',
          success: '#06ffa5',
          warning: '#ffaa00',
          error: '#ff4757',
          background: '#0a0a0a',
          surface: '#1a1a2e',
          surfaceVariant: '#16213e',
          onBackground: '#e6e6e6',
          onSurface: '#bbb',
          onSurfaceMuted: '#888'
        },
        fonts: {
          primary: 'Rajdhani, -apple-system, BlinkMacSystemFont, sans-serif',
          heading: 'Orbitron, monospace'
        }
      },
      light: {
        name: 'Light Classic',
        description: 'Clean and bright for daytime use',
        colors: {
          primary: '#0066cc',
          secondary: '#cc0066',
          accent: '#6600cc',
          success: '#00cc66',
          warning: '#cc6600',
          error: '#cc0000',
          background: '#ffffff',
          surface: '#f8f9fa',
          surfaceVariant: '#e9ecef',
          onBackground: '#212529',
          onSurface: '#495057',
          onSurfaceMuted: '#6c757d'
        },
        fonts: {
          primary: 'Rajdhani, -apple-system, BlinkMacSystemFont, sans-serif',
          heading: 'Orbitron, monospace'
        }
      },
      neon: {
        name: 'Neon Cyberpunk',
        description: 'High contrast cyberpunk aesthetic',
        colors: {
          primary: '#ff0080',
          secondary: '#00ff80',
          accent: '#8000ff',
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0040',
          background: '#000000',
          surface: '#0d0d0d',
          surfaceVariant: '#1a1a1a',
          onBackground: '#ffffff',
          onSurface: '#e0e0e0',
          onSurfaceMuted: '#a0a0a0'
        },
        fonts: {
          primary: 'Orbitron, monospace',
          heading: 'Orbitron, monospace'
        }
      },
      retro: {
        name: 'Retro Gaming',
        description: 'Nostalgic colors inspired by classic consoles',
        colors: {
          primary: '#ffa500',
          secondary: '#ff4500',
          accent: '#32cd32',
          success: '#00ff7f',
          warning: '#ffd700',
          error: '#dc143c',
          background: '#2f1b14',
          surface: '#4a2c20',
          surfaceVariant: '#3d241a',
          onBackground: '#f5deb3',
          onSurface: '#deb887',
          onSurfaceMuted: '#bc9a6a'
        },
        fonts: {
          primary: 'Rajdhani, -apple-system, BlinkMacSystemFont, sans-serif',
          heading: 'Orbitron, monospace'
        }
      }
    };
    
    // Animation preferences
    this.animationSettings = {
      reducedMotion: false,
      animationSpeed: 1.0,
      enableParticles: true,
      enableTransitions: true
    };
    
    // Accessibility preferences
    this.a11ySettings = {
      highContrast: false,
      largeText: false,
      focusIndicators: true,
      screenReaderOptimized: false
    };
  }

  /**
   * Initialize theme manager
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('🎨 Initializing Theme Manager...');
    
    // Detect system preference
    this.detectSystemPreference();
    
    // Load saved preferences
    await this.loadPreferences();
    
    // Setup media query listeners
    this.setupMediaQueryListeners();
    
    // Apply initial theme
    this.applyTheme(this.currentTheme);
    
    // Setup accessibility features
    this.setupAccessibility();
    
    this.isInitialized = true;
    console.log('✅ Theme Manager initialized');
  }

  /**
   * Detect system color scheme preference
   */
  detectSystemPreference() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)');
      
      if (darkModeQuery.matches) {
        this.systemPreference = 'dark';
      } else if (lightModeQuery.matches) {
        this.systemPreference = 'light';
      } else {
        this.systemPreference = 'no-preference';
      }
      
      console.log(`🖥️ System theme preference: ${this.systemPreference}`);
    }
  }

  /**
   * Load theme preferences from storage
   */
  async loadPreferences() {
    try {
      // Load from localStorage or default to system preference
      const savedTheme = localStorage.getItem('psp_theme_preference');
      const savedAnimations = localStorage.getItem('psp_animation_settings');
      const savedA11y = localStorage.getItem('psp_accessibility_settings');
      
      if (savedTheme) {
        this.currentTheme = savedTheme;
      } else if (this.systemPreference && this.systemPreference !== 'no-preference') {
        this.currentTheme = this.systemPreference;
      }
      
      if (savedAnimations) {
        this.animationSettings = {
          ...this.animationSettings,
          ...JSON.parse(savedAnimations)
        };
      }
      
      if (savedA11y) {
        this.a11ySettings = {
          ...this.a11ySettings,
          ...JSON.parse(savedA11y)
        };
      }
      
      // Check for prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.animationSettings.reducedMotion = true;
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load theme preferences:', error);
    }
  }

  /**
   * Save theme preferences to storage
   */
  savePreferences() {
    try {
      localStorage.setItem('psp_theme_preference', this.currentTheme);
      localStorage.setItem('psp_animation_settings', JSON.stringify(this.animationSettings));
      localStorage.setItem('psp_accessibility_settings', JSON.stringify(this.a11ySettings));
    } catch (error) {
      console.warn('⚠️ Failed to save theme preferences:', error);
    }
  }

  /**
   * Setup media query listeners for system changes
   */
  setupMediaQueryListeners() {
    if (!window.matchMedia) return;
    
    // Listen for system theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleSystemThemeChange = () => {
      this.detectSystemPreference();
      
      // Auto-switch theme if user hasn't set a preference
      const hasUserPreference = localStorage.getItem('psp_theme_preference');
      if (!hasUserPreference && this.systemPreference !== 'no-preference') {
        this.setTheme(this.systemPreference);
      }
    };
    
    const handleReducedMotionChange = (e) => {
      this.animationSettings.reducedMotion = e.matches;
      this.applyAnimationSettings();
      console.log(`🎭 Reduced motion: ${e.matches ? 'enabled' : 'disabled'}`);
    };
    
    darkModeQuery.addListener(handleSystemThemeChange);
    lightModeQuery.addListener(handleSystemThemeChange);
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  /**
   * Apply theme to document
   */
  applyTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn(`⚠️ Theme not found: ${themeName}`);
      return;
    }
    
    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Apply font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });
    
    // Set theme attribute
    document.body.setAttribute('data-theme', themeName);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme.colors.primary);
    
    // Apply animation settings
    this.applyAnimationSettings();
    
    // Apply accessibility settings
    this.applyAccessibilitySettings();
    
    console.log(`🎨 Applied theme: ${theme.name}`);
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme: themeName, colors: theme.colors }
    }));
  }

  /**
   * Set theme
   */
  setTheme(themeName) {
    if (!this.themes[themeName]) {
      console.warn(`⚠️ Invalid theme: ${themeName}`);
      return false;
    }
    
    this.currentTheme = themeName;
    this.applyTheme(themeName);
    this.savePreferences();
    
    return true;
  }

  /**
   * Toggle between dark and light themes
   */
  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return {
      name: this.currentTheme,
      ...this.themes[this.currentTheme]
    };
  }

  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Object.keys(this.themes).map(key => ({
      id: key,
      ...this.themes[key]
    }));
  }

  /**
   * Create custom theme
   */
  createCustomTheme(id, themeData) {
    if (this.themes[id]) {
      console.warn(`⚠️ Theme already exists: ${id}`);
      return false;
    }
    
    // Validate theme data
    const requiredColors = ['primary', 'secondary', 'background', 'surface', 'onBackground', 'onSurface'];
    const hasRequiredColors = requiredColors.every(color => themeData.colors && themeData.colors[color]);
    
    if (!hasRequiredColors) {
      console.error('❌ Custom theme missing required colors:', requiredColors);
      return false;
    }
    
    // Add custom theme
    this.themes[id] = {
      name: themeData.name || `Custom Theme ${id}`,
      description: themeData.description || 'Custom user theme',
      colors: {
        ...this.themes.dark.colors, // Use dark as base
        ...themeData.colors
      },
      fonts: {
        ...this.themes.dark.fonts, // Use dark as base
        ...themeData.fonts
      },
      custom: true
    };
    
    // Save custom themes
    this.saveCustomThemes();
    
    console.log(`✅ Created custom theme: ${id}`);
    return true;
  }

  /**
   * Delete custom theme
   */
  deleteCustomTheme(id) {
    if (!this.themes[id] || !this.themes[id].custom) {
      console.warn(`⚠️ Cannot delete non-custom theme: ${id}`);
      return false;
    }
    
    delete this.themes[id];
    this.saveCustomThemes();
    
    // Switch to default if current theme was deleted
    if (this.currentTheme === id) {
      this.setTheme('dark');
    }
    
    console.log(`🗑️ Deleted custom theme: ${id}`);
    return true;
  }

  /**
   * Save custom themes to storage
   */
  saveCustomThemes() {
    try {
      const customThemes = {};
      Object.entries(this.themes).forEach(([id, theme]) => {
        if (theme.custom) {
          customThemes[id] = theme;
        }
      });
      
      localStorage.setItem('psp_custom_themes', JSON.stringify(customThemes));
    } catch (error) {
      console.warn('⚠️ Failed to save custom themes:', error);
    }
  }

  /**
   * Load custom themes from storage
   */
  loadCustomThemes() {
    try {
      const savedThemes = localStorage.getItem('psp_custom_themes');
      if (savedThemes) {
        const customThemes = JSON.parse(savedThemes);
        Object.entries(customThemes).forEach(([id, theme]) => {
          this.themes[id] = theme;
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to load custom themes:', error);
    }
  }

  /**
   * Apply animation settings
   */
  applyAnimationSettings() {
    const root = document.documentElement;
    
    // Set animation speed
    root.style.setProperty('--animation-speed', this.animationSettings.animationSpeed);
    
    // Handle reduced motion
    if (this.animationSettings.reducedMotion) {
      root.style.setProperty('--transition-duration', '0.01ms');
      root.style.setProperty('--animation-duration', '0.01ms');
      document.body.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--transition-duration');
      root.style.removeProperty('--animation-duration');
      document.body.classList.remove('reduce-motion');
    }
    
    // Toggle particles
    document.body.classList.toggle('no-particles', !this.animationSettings.enableParticles);
    
    // Toggle transitions
    document.body.classList.toggle('no-transitions', !this.animationSettings.enableTransitions);
  }

  /**
   * Set animation preferences
   */
  setAnimationSettings(settings) {
    this.animationSettings = {
      ...this.animationSettings,
      ...settings
    };
    
    this.applyAnimationSettings();
    this.savePreferences();
  }

  /**
   * Setup accessibility features
   */
  setupAccessibility() {
    // High contrast detection
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.a11ySettings.highContrast = true;
    }
    
    // Large text detection
    if (window.matchMedia('(prefers-reduced-data: reduce)').matches) {
      this.a11ySettings.largeText = true;
    }
    
    this.applyAccessibilitySettings();
  }

  /**
   * Apply accessibility settings
   */
  applyAccessibilitySettings() {
    const body = document.body;
    
    // High contrast
    body.classList.toggle('high-contrast', this.a11ySettings.highContrast);
    
    // Large text
    body.classList.toggle('large-text', this.a11ySettings.largeText);
    
    // Focus indicators
    body.classList.toggle('focus-indicators', this.a11ySettings.focusIndicators);
    
    // Screen reader optimization
    body.classList.toggle('screen-reader', this.a11ySettings.screenReaderOptimized);
    
    // Update CSS custom properties for accessibility
    if (this.a11ySettings.highContrast) {
      document.documentElement.style.setProperty('--contrast-multiplier', '1.5');
    } else {
      document.documentElement.style.removeProperty('--contrast-multiplier');
    }
  }

  /**
   * Set accessibility preferences
   */
  setAccessibilitySettings(settings) {
    this.a11ySettings = {
      ...this.a11ySettings,
      ...settings
    };
    
    this.applyAccessibilitySettings();
    this.savePreferences();
  }

  /**
   * Update meta theme-color for mobile browsers
   */
  updateMetaThemeColor(color) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.content = color;
  }

  /**
   * Generate theme CSS string
   */
  generateThemeCSS(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return '';
    
    let css = `:root {\n`;
    
    // Add color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`;
    });
    
    // Add font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      css += `  --font-${key}: ${value};\n`;
    });
    
    css += `}\n`;
    
    return css;
  }

  /**
   * Export theme configuration
   */
  exportTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    return {
      id: themeName,
      ...theme,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Import theme configuration
   */
  importTheme(themeData) {
    try {
      const { id, name, description, colors, fonts } = themeData;
      
      if (!id || !colors) {
        throw new Error('Invalid theme data format');
      }
      
      return this.createCustomTheme(id, {
        name,
        description,
        colors,
        fonts
      });
    } catch (error) {
      console.error('❌ Theme import failed:', error);
      return false;
    }
  }

  /**
   * Get theme statistics
   */
  getThemeStats() {
    const totalThemes = Object.keys(this.themes).length;
    const customThemes = Object.values(this.themes).filter(t => t.custom).length;
    
    return {
      total: totalThemes,
      builtin: totalThemes - customThemes,
      custom: customThemes,
      current: this.currentTheme,
      systemPreference: this.systemPreference
    };
  }

  /**
   * Reset to default theme
   */
  resetToDefault() {
    this.setTheme('dark');
    
    // Reset animation settings
    this.animationSettings = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      animationSpeed: 1.0,
      enableParticles: true,
      enableTransitions: true
    };
    
    // Reset accessibility settings
    this.a11ySettings = {
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: false,
      focusIndicators: true,
      screenReaderOptimized: false
    };
    
    this.applyAnimationSettings();
    this.applyAccessibilitySettings();
    this.savePreferences();
    
    console.log('🔄 Reset to default theme settings');
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Remove any injected styles
    const injectedStyles = document.querySelectorAll('style[data-theme-manager]');
    injectedStyles.forEach(style => style.remove());
    
    // Reset to system defaults
    document.body.removeAttribute('data-theme');
    document.body.className = document.body.className
      .replace(/high-contrast|large-text|focus-indicators|screen-reader|reduce-motion|no-particles|no-transitions/g, '')
      .trim();
    
    console.log('🧹 Theme Manager cleanup complete');
  }
}