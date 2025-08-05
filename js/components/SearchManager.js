/**
 * SearchManager - Advanced Search System (Rewritten for Stability)
 * Handles search functionality, autocomplete, filters, and search history.
 * This version corrects the critical TypeError by separating the DOM element
 * from the data array and fixes broken image placeholders.
 */

export class SearchManager {
  constructor(gameAPI, uiManager) {
    this.gameAPI = gameAPI;
    this.ui = uiManager;
    this.isInitialized = false;

    // Search state
    this.currentQuery = '';
    this.currentFilters = {};
    this.searchResults = []; // This will ONLY hold the search result data array
    this.resultsContainer = null; // This will hold the reference to the DOM element
    this.searchHistory = [];
    this.suggestions = [];
    this.isSearching = false;

    // Search configuration
    this.config = {
      minQueryLength: 2,
      debounceDelay: 300,
      maxHistoryItems: 50,
      maxSuggestions: 8,
      enableAutocomplete: true,
      enableSearchHistory: true
    };

    // Search filters (can be expanded later)
    this.availableFilters = {
      genres: { label: 'Genres', type: 'multiselect', options: [] },
      platforms: { label: 'Platforms', type: 'multiselect', options: ['PSP', 'PS1'] },
      rating: { label: 'Minimum Rating', type: 'range', min: 0, max: 5, step: 0.1 },
      releaseYear: { label: 'Release Year', type: 'range', min: 1994, max: 2024 },
    };

    // Bind methods
    this.handleSearchInput = this.debounce(this.handleSearchInput.bind(this), this.config.debounceDelay);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Initialize search manager
   */
  async init() {
    if (this.isInitialized) return;
    console.log('🔍 Initializing Search Manager...');
    this.setupSearchElements();
    await this.loadSearchHistory();
    await this.initializeFilters();
    this.setupKeyboardShortcuts();
    this.isInitialized = true;
    console.log('✅ Search Manager initialized');
  }

  /**
   * Setup search DOM elements and event listeners
   */
  setupSearchElements() {
    this.searchModal = document.getElementById('search-modal');
    this.searchInput = document.getElementById('search-input');
    this.resultsContainer = document.getElementById('search-results'); // Correctly assign to resultsContainer
    this.searchCloseBtn = document.getElementById('search-modal-close');
    this.searchClearBtn = document.getElementById('search-clear');

    if (!this.searchModal || !this.searchInput || !this.resultsContainer) {
      console.warn('⚠️ Search elements not found in DOM');
      return;
    }

    this.searchInput.addEventListener('input', this.handleSearchInput);
    this.searchInput.addEventListener('keydown', this.handleKeyDown);
    this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleSearchBlur.bind(this));
    this.searchCloseBtn?.addEventListener('click', () => this.close());
    this.searchClearBtn?.addEventListener('click', () => this.clearSearch());
    this.searchModal.addEventListener('click', (e) => {
      if (e.target === this.searchModal) {
        this.close();
      }
    });
  }

  /**
   * Open search modal
   */
  open() {
    if (!this.searchModal) return;
    this.searchModal.classList.add('active');
    setTimeout(() => this.searchInput?.focus(), 100);
    if (!this.currentQuery) this.showSearchHistory();
    this.ui.app?.analytics.track('search_opened');
  }

  /**
   * Close search modal
   */
  close() {
    if (!this.searchModal) return;
    this.searchModal.classList.remove('active');
    this.clearResults();
    this.ui.app?.analytics.track('search_closed');
  }

  /**
   * Handle search input
   */
  async handleSearchInput(event) {
    const query = event.target.value.trim();
    this.currentQuery = query;

    if (query.length === 0) {
      this.showSearchHistory();
      return;
    }

    if (query.length < this.config.minQueryLength) {
      this.clearResults();
      return;
    }

    this.showLoadingState();
    try {
      const results = await this.gameAPI.searchGames(query, { pageSize: 20 });
      this.searchResults = results.games; // Store data
      this.displayResults(this.searchResults);
    } catch (error) {
      console.error('❌ Search failed:', error);
      this.showErrorState('Search failed. Please try again.');
    }
  }

  /**
   * Display search results
   */
  displayResults(games) {
    if (!this.resultsContainer) return;
    if (games.length === 0) {
      this.showNoResults();
      return;
    }
    const resultsHTML = games.map(game => this.createSearchResultHTML(game)).join('');
    this.resultsContainer.innerHTML = `<div class="search-results-list">${resultsHTML}</div>`;
    this.setupResultClickHandlers();
    this.addToHistory(this.currentQuery);
  }

  /**
   * Create HTML for a single search result item
   */
  createSearchResultHTML(game) {
    return `
      <div class="search-result" data-game-slug="${game.slug}">
        <img src="${game.image || '/assets/placeholder-game.jpg'}" 
             alt="${game.name}" 
             class="search-result-image"
             loading="lazy"
             onerror="this.onerror=null; this.src='/assets/placeholder-game.jpg';">
        <div class="search-result-content">
          <div class="search-result-title">${this.highlightSearchTerms(game.name)}</div>
          <div class="search-result-meta">
            ${game.rating ? `⭐ ${game.rating.toFixed(1)}` : ''}
            ${game.released ? `• ${new Date(game.released).getFullYear()}` : ''}
          </div>
        </div>
      </div>
    `;
  }

  highlightSearchTerms(text) {
    if (!this.currentQuery) return text;
    const terms = this.currentQuery.split(/\s+/).filter(term => term.length > 1);
    let highlightedText = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    return highlightedText;
  }

  /**
   * Setup click handlers for search results
   */
  setupResultClickHandlers() {
    this.resultsContainer?.querySelectorAll('.search-result').forEach(result => {
      result.addEventListener('click', () => {
        const gameSlug = result.dataset.gameSlug;
        if (gameSlug) {
          this.close();
          this.ui.showGameDetails(gameSlug);
        }
      });
    });
  }

  /**
   * Show search history
   */
  showSearchHistory() {
    if (!this.resultsContainer || !this.config.enableSearchHistory) return;
    if (this.searchHistory.length === 0) {
      this.showEmptyState();
      return;
    }
    const historyHTML = `
      <div class="search-history">
        <h3>Recent Searches</h3>
        ${this.searchHistory.slice(0, 10).map(item => `
          <div class="search-history-item" data-query="${item.query}">
            <span>${item.query}</span>
            <button class="remove-history-item" data-query="${item.query}">×</button>
          </div>
        `).join('')}
      </div>
    `;
    this.resultsContainer.innerHTML = historyHTML;
    this.setupHistoryClickHandlers();
  }

  setupHistoryClickHandlers() {
    this.resultsContainer?.querySelectorAll('.search-history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-history-item')) return;
        const query = item.dataset.query;
        if (this.searchInput) {
          this.searchInput.value = query;
          this.handleSearchInput({ target: this.searchInput });
        }
      });
    });
    this.resultsContainer?.querySelectorAll('.remove-history-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFromHistory(btn.dataset.query);
        });
    });
  }
  
  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event) {
    const key = event.key;
    if (key === 'Escape') this.close();
    if (key === 'Enter') {
      event.preventDefault();
      const selected = this.resultsContainer?.querySelector('.selected');
      if (selected) {
        selected.click();
      }
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      this.navigateResults(key === 'ArrowDown' ? 'down' : 'up');
    }
  }

  navigateResults(direction) {
    const items = this.resultsContainer?.querySelectorAll('.search-result, .search-history-item');
    if (!items || items.length === 0) return;

    let currentIndex = -1;
    items.forEach((item, index) => {
        if (item.classList.contains('selected')) {
            currentIndex = index;
        }
    });

    items[currentIndex]?.classList.remove('selected');
    let nextIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= items.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = items.length - 1;

    items[nextIndex]?.classList.add('selected');
    items[nextIndex]?.scrollIntoView({ block: 'nearest' });
  }
  
  handleSearchFocus() {
    if (!this.currentQuery && this.config.enableSearchHistory) {
      this.showSearchHistory();
    }
  }

  handleSearchBlur() {
    setTimeout(() => {
      this.resultsContainer?.querySelector('.selected')?.classList.remove('selected');
    }, 200);
  }

  async addToHistory(query) {
    if (!query) return;
    this.searchHistory = this.searchHistory.filter(item => item.query !== query);
    this.searchHistory.unshift({ query, timestamp: Date.now() });
    this.searchHistory = this.searchHistory.slice(0, this.config.maxHistoryItems);
    await this.saveSearchHistory();
  }
  
  async removeFromHistory(query) {
      this.searchHistory = this.searchHistory.filter(item => item.query !== query);
      await this.saveSearchHistory();
      this.showSearchHistory(); // Refresh the view
  }

  async loadSearchHistory() {
    try {
      const stored = localStorage.getItem('psp_search_history');
      this.searchHistory = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('⚠️ Failed to load search history:', error);
      this.searchHistory = [];
    }
  }

  async saveSearchHistory() {
    localStorage.setItem('psp_search_history', JSON.stringify(this.searchHistory));
  }
  
  async initializeFilters() {
    try {
      const genres = await this.gameAPI.getGenres();
      this.availableFilters.genres.options = genres.map(g => ({ value: g.id, label: g.name }));
    } catch (error) {
      console.warn('⚠️ Failed to initialize filters:', error);
    }
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
    });
  }

  clearSearch() {
    if (this.searchInput) this.searchInput.value = '';
    this.currentQuery = '';
    this.clearResults();
    this.showEmptyState();
  }

  clearResults() {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = '';
    }
    this.searchResults = []; // Clear the data array
  }

  showLoadingState() {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `<div class="modal-loading"><div class="modal-spinner"></div><span>Searching...</span></div>`;
    }
  }

  showNoResults() {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `<div class="search-empty"><div class="search-empty-text">No games found for "${this.currentQuery}"</div></div>`;
    }
  }

  showEmptyState() {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <div class="search-empty-text">Find your favorite PSP games</div>
        </div>`;
    }
  }

  showErrorState(message) {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = `<div class="search-empty"><div class="search-empty-text" style="color: var(--error-color);">${message}</div></div>`;
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  destroy() {
    this.searchInput?.removeEventListener('input', this.handleSearchInput);
    this.searchInput?.removeEventListener('keydown', this.handleKeyDown);
    console.log('🧹 Search Manager cleanup complete');
  }
}