/**
 * UIManager - Professional UI Controller (Rewritten for Stability and Features)
 * 
 * This file handles all UI interactions, animations, and component management.
 * It merges the feature-rich concepts from the "Claude" version with the stability
 * of the original, while fixing critical bugs and improving overall architecture.
 */
import { curatedGames } from '../services/CuratedGames.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        this.currentPage = 'home';
        this.currentGamesPage = 1;
        this.currentGenrePage = 1;

        this.activeGenre = null;
        this.activeFilters = {
            genres: ''
        };
        this.currentSort = {
            field: '-rating',
            direction: 'desc'
        };

        this.modals = new Map();
        this.observers = new Map();

        this.state = {
            isMobile: window.innerWidth <= 768,
            currentModal: null,
            loadingStates: new Set()
        };

        // Bind methods to ensure 'this' context is correct
        this.handleNavClick = this.handleNavClick.bind(this);
        this.handleResize = this.debounce(this.handleResize.bind(this), 250);

        this.lightboxImages = [];
        this.currentLightboxIndex = 0;
        this.handleLightboxKeydown = this.handleLightboxKeydown.bind(this);

        this.curatedGenres = Object.keys(curatedGames);
        this.activeCuratedTab = this.curatedGenres[0];
        this.gamesPerPage = 8;
        this.currentPageByGenre = {}; // Tracks pagination for each genre
    }

    /**
     * Initializes the entire UI Manager.
     * Sets up navigation, modals, responsive listeners, and other UI components.
     */
       async init() {
        console.log('🎨 Initializing Professional UI Manager (Rewritten)...');

        // Core UI setup functions
        this.setupResponsive();
        this.initializeNavigation();
        this.initializeModals();
        this.setupIntersectionObservers();
        this.setupKeyboardNavigation();
        this.initializeComponents();

        // Load the dynamic content for the home page
        try {
            console.log('📊 UI Manager loading initial home page data...');

            // Fetch the list of all genres for the "Explore by Genre" section
            const genres = await this.app.gameAPI.getGenres();
            
            // Set up the new "Curator's Collection" with tabs and paginated games.
            // This replaces the old `loadFeaturedGames`.
            this.setupCuratedSection();

            // Populate the "Explore by Genre" section lower down on the homepage.
            this.loadGenres(genres);

            // Animate the statistics in the hero section.
            this.animateStats();
            
            console.log('✅ Initial home page data loaded by UI Manager.');
        } catch (error) {
            // If data loading fails, log the error and show a user-friendly message.
            console.error('❌ UI Manager failed to load initial data:', error);
            this.showErrorMessage('Could not load initial game data. Please refresh.');
        }

        console.log('✅ Professional UI Manager initialized successfully.');
    }

    animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.target, 10);
                    if (!isNaN(target)) {
                        this.animateCounter(entry.target, 0, target, 2000);
                    }
                    observer.unobserve(entry.target);
                }
            });
        });
        
        statNumbers.forEach(stat => observer.observe(stat));
    }

animateCounter(element, start, target, duration) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
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
     * Sets up media query listeners to adapt the UI to different screen sizes.
     */
    setupResponsive() {
        const mobileQuery = window.matchMedia('(max-width: 768px)');
        const updateViewport = () => {
            this.state.isMobile = mobileQuery.matches;
            document.body.classList.toggle('mobile', this.state.isMobile);
            document.body.classList.toggle('desktop', !this.state.isMobile);
        };
        mobileQuery.addEventListener('change', updateViewport);
        updateViewport();
    }

    /**
     * Attaches event listeners to all primary navigation elements.
     */
    initializeNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', this.handleNavClick);
        });
        document.getElementById('search-btn')?.addEventListener('click', () => this.app.search.open());
        document.getElementById('theme-btn')?.addEventListener('click', () => this.app.theme.toggle());
        document.getElementById('user-btn')?.addEventListener('click', () => this.showUserMenu());
    }
    
    /**
     * Handles clicks on the main navigation links to switch between pages.
     * @param {Event} event - The click event.
     */
    handleNavClick(event) {
        event.preventDefault();
        const link = event.currentTarget;
        const page = link.dataset.page;

        if (page && page !== this.currentPage) {
            this.navigateToPage(page);
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            this.app.analytics.track('page_navigation', { from: this.currentPage, to: page });
        }
    }

    /**
     * Transitions from the current page to a new page with animations.
     * @param {string} pageId - The ID of the page to navigate to (e.g., 'home', 'games').
     */
    navigateToPage(pageId) {
        const currentPageEl = document.getElementById(`${this.currentPage}-page`);
        if (currentPageEl) {
            currentPageEl.classList.remove('active');
        }

        const newPageEl = document.getElementById(`${pageId}-page`);
        if (newPageEl) {
            newPageEl.classList.add('active');
        }

        this.currentPage = pageId;
        this.loadPageContent(pageId);

        if (history.pushState) {
            const newUrl = pageId === 'home' ? '/' : `/${pageId}`;
            history.pushState({ page: pageId }, '', newUrl);
        }
    }

    /**
     * Loads the necessary data for a given page.
     * @param {string} pageId - The ID of the page being loaded.
     */
    async loadPageContent(pageId) {
        try {
            switch (pageId) {
                case 'games':
                    await this.loadGamesPage();
                    break;
                case 'genres':
                    await this.loadGenresPage();
                    break;
                case 'collection':
                    await this.loadCollectionPage();
                    break;
            }
        } catch (error) {
            console.error(`❌ Error loading content for ${pageId}:`, error);
            this.showErrorMessage(`Failed to load the ${pageId} page.`);
        }
    }

    /**
     * Initializes the modal system by finding modal elements and attaching close handlers.
     */
    initializeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            this.modals.set(modal.id, modal);
            modal.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal(modal.id));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * Opens a specific modal.
     * @param {string} modalId - The ID of the modal element to open.
     */
    openModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.state.currentModal = modalId;
        }
    }

    /**
     * Closes a specific modal or the currently active one.
     * @param {string} [modalId] - The ID of the modal to close. If null, closes the active modal.
     */
    closeModal(modalId) {
        const idToClose = modalId || this.state.currentModal;
        const modal = this.modals.get(idToClose);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.state.currentModal = null;
        }
    }

    /**
     * Fetches and displays the details for a specific game in a modal.
     * @param {string} gameSlug - The unique slug/ID of the game.
     */
    async showGameDetails(gameSlug) {
        const modalContent = document.getElementById('game-modal-content');
        if (!modalContent) return;

        this.openModal('game-modal');
        modalContent.innerHTML = this.createGameLoadingCardHTML();

        try {
            const game = await this.app.gameAPI.getGameDetails(gameSlug);
            this.lightboxImages = game.screenshots.map(s => s.image);
            document.getElementById('game-modal-title').textContent = game.name;
            modalContent.innerHTML = this.createGameCardHTML(game);
            this.setupScreenshotClickListeners();
        } catch (error) {
            console.error('❌ Error showing game details:', error);
            this.closeModal('game-modal');
            this.app.notifications.error('Failed to load game details.');
        }
    }

    /**
     * Generates the HTML for a detailed game card view inside the modal.
     * @param {object} game - The game data object from the API.
     * @returns {string} The generated HTML string.
     */
    createGameCardHTML(game) {
        const genres = game.genres.map(g => `<span class="game-tag">${g.name}</span>`).join('');
        const screenshots = game.screenshots.map(s => `<img src="${s.image}" alt="Screenshot of ${game.name}" class="game-screenshot" loading="lazy">`).join('');

        return `
            <div class="game-hero">
                <img src="${game.image}" alt="" class="game-hero-bg" onerror="this.style.display='none';">
                <div class="game-hero-overlay">
                    <h2 class="game-title">${game.name}</h2>
                    <div class="game-meta-bar">
                        <span class="game-rating-large">⭐ ${game.rating.toFixed(1)}</span>
                        <span class="game-release-date">Released: ${game.released || 'N/A'}</span>
                    </div>
                </div>
            </div>
            <div class="game-content">
                <div class="game-section">
                    <h3 class="game-section-title">Description</h3>
                    <p class="game-description">${game.description || 'No description available.'}</p>
                </div>
                <div class="game-section">
                    <h3 class="game-section-title">Details</h3>
                    <div class="game-stats">${genres}</div>
                </div>
                ${screenshots ? `
                <div class="game-section">
                    <h3 class="game-section-title">Screenshots</h3>
                    <div class="game-screenshots">${screenshots}</div>
                </div>` : ''}
            </div>
        `;
    }

    /**
     * Generates the HTML for a loading placeholder inside the game detail modal.
     * @returns {string} The generated HTML string.
     */
    createGameLoadingCardHTML() {
        return `
            <div class="modal-loading">
                <div class="modal-spinner"></div>
                <span>Loading epic game details...</span>
            </div>
        `;
    }
    
    /**
     * Fetches data and populates the main games page.
     */
    async loadGamesPage() {
        const gamesGrid = document.getElementById('games-grid');
        if (!gamesGrid) return;

        this.showLoadingState('games-grid');

        try {
            const [gamesData, genres] = await Promise.all([
                this.app.gameAPI.searchGames('', { pageSize: 20, platforms: '17', ordering: this.currentSort.field }),
                this.app.gameAPI.getGenres()
            ]);

            this.populateGenreFilter(genres);
            this.renderGamesGrid(gamesData.games, gamesGrid);
            this.setupPagination('games-pagination', gamesData);
            this.setupFilterEventListeners();

        } catch (error) {
            this.showErrorState('games-grid', 'Failed to load games. Please check your connection.');
        } finally {
            this.hideLoadingState('games-grid');
        }
    }

    /**
     * Sets up event listeners for the filter and sort controls on the games page.
     */
    setupFilterEventListeners() {
        const genreFilter = document.getElementById('genre-filter');
        const sortFilter = document.getElementById('sort-filter');
        const sortDirectionBtn = document.getElementById('sort-direction-btn');
        
        // Remove old listeners to prevent duplicates
        genreFilter?.removeEventListener('change', this._boundGenreChange);
        sortFilter?.removeEventListener('change', this._boundSortChange);
        sortDirectionBtn?.removeEventListener('click', this._boundSortDirChange);

        // Bind new listeners
        this._boundGenreChange = (e) => {
            this.activeFilters.genres = e.target.value;
            this.applyFiltersAndReloadGames();
        };
        this._boundSortChange = (e) => {
            this.currentSort.field = e.target.value;
            this.applyFiltersAndReloadGames();
        };
        this._boundSortDirChange = () => {
            this.currentSort.direction = this.currentSort.direction === 'desc' ? 'asc' : 'desc';
            this.applyFiltersAndReloadGames();
        };

        genreFilter?.addEventListener('change', this._boundGenreChange);
        sortFilter?.addEventListener('change', this._boundSortChange);
        sortDirectionBtn?.addEventListener('click', this._boundSortDirChange);
    }
    
    /**
     * Re-fetches and re-renders the games grid based on the current filter and sort state.
     */
    async applyFiltersAndReloadGames() {
        this.currentGamesPage = 1; // Reset to page 1 for new filters
        await this.loadGamesPageWithNumber(1);
    }

    /**
     * Fetches a specific page number of games and updates the view.
     * @param {number} pageNumber - The page number to fetch.
     */
    async loadGamesPageWithNumber(pageNumber) {
        const gamesGrid = document.getElementById('games-grid');
        if (!gamesGrid) return;

        this.showLoadingState('games-grid');
        
        let ordering = this.currentSort.field;
        if (this.currentSort.direction === 'desc' && !ordering.startsWith('-')) {
            ordering = `-${ordering}`;
        } else if (this.currentSort.direction === 'asc' && ordering.startsWith('-')) {
            ordering = ordering.substring(1);
        }

        try {
            const gamesData = await this.app.gameAPI.searchGames('', {
                pageSize: 20,
                platforms: '17',
                page: pageNumber,
                genres: this.activeFilters.genres || null,
                ordering: ordering
            });

            this.renderGamesGrid(gamesData.games, gamesGrid);
            this.setupPagination('games-pagination', gamesData);
            gamesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            this.showErrorState('games-grid', 'Failed to load games.');
        } finally {
            this.hideLoadingState('games-grid');
        }
    }

    /**
     * Renders a grid of game cards into a specified container.
     * @param {Array<object>} games - An array of game data objects.
     * @param {HTMLElement} container - The container element to render into.
     */
    renderGamesGrid(games, container) {
    if (!games || games.length === 0) {
        container.innerHTML = `<div class="search-empty"><div class="search-empty-text">No games found for this selection.</div></div>`;
        return;
    }

    // Use map to generate the HTML for each game card
    container.innerHTML = games.map(game => {
        const hasImage = !!game.image;
        const gameTitleEscaped = game.name.replace(/'/g, "\\'"); // Escape quotes for the onerror string
        const gameYear = game.released ? new Date(game.released).getFullYear() : '';
        let imagePart;

        if (hasImage) {
            // If an image URL exists, render the <img> tag with our robust onerror handler
            imagePart = `
                <img src="${game.image}" 
                     alt="${game.name}" class="game-card-image" loading="lazy" 
                     onerror="this.outerHTML = document.getElementById('no-image-template').innerHTML.replace('{{TITLE}}', '${gameTitleEscaped}');">
            `;
        } else {
            // If there's no image URL, render the placeholder directly using the template
            imagePart = document.getElementById('no-image-template').innerHTML.replace('{{TITLE}}', gameTitleEscaped);
        }

        return `
            <div class="game-card" data-game-slug="${game.slug}">
                <div class="game-card-image-container">
                    ${imagePart}
                </div>
                <div class="game-card-content">
                    <h3 class="game-card-title">${game.name}</h3>
                    <div class="game-card-meta">
                        <span class="game-rating">⭐ ${game.rating.toFixed(1)}</span>
                        <span>${gameYear}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Re-attach click handlers to the newly rendered cards
    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => this.showGameDetails(card.dataset.gameSlug));
    });
}

    /**
     * Populates the genre filter dropdown with options.
     * @param {Array<object>} genres - An array of genre data objects.
     */
    populateGenreFilter(genres) {
        const genreFilter = document.getElementById('genre-filter');
        if (!genreFilter) return;

        genreFilter.innerHTML = '<option value="">All Genres</option>';
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.slug;
            option.textContent = genre.name;
            genreFilter.appendChild(option);
        });
    }
    
    /**
     * Sets up pagination controls.
     * @param {string} containerId - The ID of the pagination container element.
     * @param {object} data - The API response data containing next/previous page info.
     */
    setupPagination(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let paginationHTML = '';
        if (data.hasPrevious) {
            paginationHTML += `<button class="pagination-btn" data-page="prev">Previous</button>`;
        }
        paginationHTML += `<span class="pagination-info">Page ${this.currentGamesPage}</span>`;
        if (data.hasNext) {
            paginationHTML += `<button class="pagination-btn" data-page="next">Next</button>`;
        }
        container.innerHTML = paginationHTML;

        container.querySelector('[data-page="prev"]')?.addEventListener('click', () => {
            if (this.currentGamesPage > 1) {
                this.currentGamesPage--;
                this.loadGamesPageWithNumber(this.currentGamesPage);
            }
        });
        container.querySelector('[data-page="next"]')?.addEventListener('click', () => {
            this.currentGamesPage++;
            this.loadGamesPageWithNumber(this.currentGamesPage);
        });
    }

    /**
     * Loads and renders the main genres page.
     */
    async loadGenresPage() {
    // UPDATE THE ID ON THE LINE BELOW
    const genresGrid = document.getElementById('genres-list-grid'); 
    if (!genresGrid) return;
    this.showLoadingState('genres-list-grid'); // Also update here
    try {
        const genres = await this.app.gameAPI.getGenres();
        this.renderDetailedGenres(genres, genresGrid);
    } catch (error) {
        this.showErrorState('genres-list-grid', 'Failed to load genres.'); // And here
    } finally {
        this.hideLoadingState('genres-list-grid'); // And here
    }
}

    /**
     * Renders detailed genre cards.
     * @param {Array<object>} genres - An array of genre data.
     * @param {HTMLElement} container - The container to render into.
     */
    renderDetailedGenres(genres, container) {
        container.innerHTML = genres.map(genre => `
            <div class="genre-card" data-genre-slug="${genre.slug}" data-genre-name="${genre.name}">
                <div class="genre-header">
                    <h3 class="genre-title">${genre.name}</h3>
                    <span class="game-count">${genre.gameCount.toLocaleString()} games</span>
                </div>
                <button class="explore-btn">Explore</button>
            </div>
        `).join('');
        container.querySelectorAll('.genre-card').forEach(card => {
            card.addEventListener('click', () => {
                const slug = card.dataset.genreSlug;
                const name = card.dataset.genreName;
                this.navigateToPage('genre-detail');
                this.loadGamesForGenre({ slug, name });
            });
        });
    }

    /**
     * Loads games for a specific genre and displays them on the genre detail page.
     * @param {object} genre - An object containing the genre slug and name.
     */
    async loadGamesForGenre(genre) {
        this.activeGenre = genre;
        this.currentGenrePage = 1; // Reset page count
        const genreGrid = document.getElementById('genre-detail-grid');
        const genreTitle = document.getElementById('genre-detail-title');

        if (!genreGrid || !genreTitle) return;

        genreTitle.textContent = `${genre.name} Games`;
        this.showLoadingState('genre-detail-grid');

        try {
            const gamesData = await this.app.gameAPI.getGamesByGenre(genre.slug, { page: 1 });
            this.renderGamesGrid(gamesData.games, genreGrid);
            this.setupPaginationForGenre('genre-detail-pagination', gamesData);
        } catch (error) {
            this.showErrorState('genre-detail-grid', 'Failed to load games for this genre.');
        } finally {
            this.hideLoadingState('genre-detail-grid');
        }
    }

    /**
     * Sets up pagination specifically for the genre detail page.
     * @param {string} containerId - The ID of the pagination container element.
     * @param {object} data - The API response data.
     */
    setupPaginationForGenre(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let paginationHTML = '';
        if (data.hasPrevious) {
            paginationHTML += `<button class="pagination-btn" data-page="prev">Previous</button>`;
        }
        paginationHTML += `<span class="pagination-info">Page ${this.currentGenrePage}</span>`;
        if (data.hasNext) {
            paginationHTML += `<button class="pagination-btn" data-page="next">Next</button>`;
        }
        container.innerHTML = paginationHTML;

        const loadPage = async (page) => {
            const genreGrid = document.getElementById('genre-detail-grid');
            this.showLoadingState('genre-detail-grid');
            try {
                const gamesData = await this.app.gameAPI.getGamesByGenre(this.activeGenre.slug, { page });
                this.renderGamesGrid(gamesData.games, genreGrid);
                this.currentGenrePage = page;
                this.setupPaginationForGenre(containerId, gamesData);
                genreGrid.scrollIntoView({ behavior: 'smooth' });
            } finally {
                this.hideLoadingState('genre-detail-grid');
            }
        };

        container.querySelector('[data-page="prev"]')?.addEventListener('click', () => loadPage(this.currentGenrePage - 1));
        container.querySelector('[data-page="next"]')?.addEventListener('click', () => loadPage(this.currentGenrePage + 1));
    }

    /**
     * Shows a placeholder for the user menu.
     */
    showUserMenu() {
        this.app.notifications.info('User profiles are coming soon!');
    }

    /**
     * Displays a loading spinner and message in a given container.
     * @param {string} elementId - The ID of the container element.
     */
    showLoadingState(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="loading-screen"><div class="loading-content"><div class="loading-spinner"></div></div></div>`;
        }
    }

    /**
     * Removes the loading state from a container.
     * @param {string} elementId - The ID of the container element.
     */
    hideLoadingState(elementId) {
        // The loading state is replaced by content, so this function is implicitly handled
        // by the rendering functions.
    }

    /**
     * Displays an error message in a given container.
     * @param {string} elementId - The ID of the container element.
     * @param {string} message - The error message to display.
     */
    showErrorState(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="search-empty"><div class="search-empty-text">${message}</div></div>`;
        }
    }

    /**
     * Debounces a function to prevent it from being called too frequently.
     * @param {Function} func - The function to debounce.
     * @param {number} delay - The debounce delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- Other methods from the original file can be added here as needed ---
    // (e.g., handleTouch, handleSwipe, setupIntersectionObservers, etc.)

    /**
     * Debounced resize handler.
     */
    handleResize() {
        this.setupResponsive();
    }
    
    /**
     * Sets up Intersection Observers for animations on scroll.
     */
    setupIntersectionObservers() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.stagger-fade-in, .stagger-slide-up').forEach(el => observer.observe(el));
    }
    
    /**
     * Initializes miscellaneous components like tooltips and lazy loading.
     */
    initializeComponents() {
        // Simplified lazy loading for images
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                        }
                        img.classList.remove('lazy');
                        obs.unobserve(img);
                    }
                });
            });
            document.querySelectorAll('img[loading="lazy"]').forEach(img => imageObserver.observe(img));

             const lightbox = document.getElementById('screenshot-lightbox');
            if (lightbox) {
                lightbox.querySelector('.lightbox-close')?.addEventListener('click', () => this.closeLightbox());
                lightbox.querySelector('.lightbox-nav.next')?.addEventListener('click', () => this.showNextImage());
                lightbox.querySelector('.lightbox-nav.prev')?.addEventListener('click', () => this.showPrevImage());
            }
        }
    }

    /**
 * Attaches click listeners to each screenshot thumbnail in the game detail modal.
 */
setupScreenshotClickListeners() {
    document.querySelectorAll('.game-screenshot').forEach((img, index) => {
        img.addEventListener('click', () => {
            this.openLightbox(index);
        });
    });
}

/**
 * Opens the lightbox and displays the selected image.
 * @param {number} startIndex - The index of the image to display first.
 */
openLightbox(startIndex = 0) {
    this.currentLightboxIndex = startIndex;
    const lightbox = document.getElementById('screenshot-lightbox');
    if (!lightbox) return;

    this.updateLightboxContent();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Add keyboard navigation
    document.addEventListener('keydown', this.handleLightboxKeydown);
}

/**
 * Closes the lightbox.
 */
closeLightbox() {
    const lightbox = document.getElementById('screenshot-lightbox');
    if (!lightbox) return;

    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    
    // Remove keyboard navigation to prevent conflicts
    document.removeEventListener('keydown', this.handleLightboxKeydown);
}

/**
 * Updates the lightbox image, counter, and navigation buttons.
 */
updateLightboxContent() {
    const lightboxImage = document.querySelector('.lightbox-image');
    const counter = document.querySelector('.lightbox-counter');
    const prevBtn = document.querySelector('.lightbox-nav.prev');
    const nextBtn = document.querySelector('.lightbox-nav.next');

    if (!lightboxImage || !counter || !prevBtn || !nextBtn) return;
    
    // Set the image source
    lightboxImage.src = this.lightboxImages[this.currentLightboxIndex];
    
    // Update the counter text
    counter.textContent = `${this.currentLightboxIndex + 1} / ${this.lightboxImages.length}`;

    // Show/hide navigation buttons at the start/end
    prevBtn.classList.toggle('hidden', this.currentLightboxIndex === 0);
    nextBtn.classList.toggle('hidden', this.currentLightboxIndex === this.lightboxImages.length - 1);
}

    /**
     * Handles keyboard events for lightbox navigation (Arrows and Escape).
     * @param {KeyboardEvent} e - The keyboard event.
     */
    handleLightboxKeydown(e) {
        if (e.key === 'ArrowRight') {
            this.showNextImage();
        } else if (e.key === 'ArrowLeft') {
            this.showPrevImage();
        } else if (e.key === 'Escape') {
            this.closeLightbox();
        }
    }

    showNextImage() {
        if (this.currentLightboxIndex < this.lightboxImages.length - 1) {
            this.currentLightboxIndex++;
            this.updateLightboxContent();
        }
    }

    showPrevImage() {
        if (this.currentLightboxIndex > 0) {
            this.currentLightboxIndex--;
            this.updateLightboxContent();
        }
    }

    /**
     * Sets up global keyboard navigation shortcuts.
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            if (event.key === 'Escape') {
                this.closeModal(this.state.currentModal);
            }
        });
    }

   /**
 * Sets up the entire curated collection section, including tabs and initial content.
 */
setupCuratedSection() {
    this.renderCuratedTabs();
    this.displayCuratedGamesForGenre(this.activeCuratedTab);
}

/**
 * Renders the genre tabs into the tab container.
 */
renderCuratedTabs() {
    const tabsContainer = document.getElementById('curated-tabs-container');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = this.curatedGenres.map(genre => `
        <button class="curated-tab ${genre === this.activeCuratedTab ? 'active' : ''}" data-genre="${genre}">
            ${genre}
        </button>
    `).join('');

    tabsContainer.querySelectorAll('.curated-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            this.activeCuratedTab = tab.dataset.genre;
            this.renderCuratedTabs(); // Re-render to update active class
            this.displayCuratedGamesForGenre(this.activeCuratedTab, 1); // Go to page 1 of new tab
        });
    });
}

/**
 * Displays games for the selected curated genre with pagination.
 * This definitive version uses a multi-stage, resilient fetching pipeline:
 * 1. Tries to fetch by the precise, pre-verified slug.
 * 2. If that fails, it updates the UI to a "Searching..." state.
 * 3. It then performs a fallback API search by title.
 * 4. It intelligently validates search results to find the best match.
 * 5. Only shows "Data Not Found" after all stages have failed.
 * @param {string} genre - The genre to display games for.
 * @param {number} [page=1] - The page number to display.
 */
async displayCuratedGamesForGenre(genre, page = 1) {
    this.currentPageByGenre[genre] = page;
    const grid = document.getElementById('curated-games-grid');
    const linkContainer = document.getElementById('curated-link-container');

    if (!grid || !linkContainer) return;
    if (this.activeCuratedTab !== genre) return; // Prevent race conditions

    const categoryData = curatedGames[genre];
    if (!categoryData || !categoryData.games) {
        grid.innerHTML = `<div class="search-empty-text">No games listed for this genre.</div>`;
        linkContainer.innerHTML = '';
        return;
    }

    linkContainer.innerHTML = `<a href="${categoryData.link}" target="_blank" rel="noopener noreferrer">View original list on Backloggd</a>`;

    const allGameObjects = categoryData.games;
    const totalPages = Math.ceil(allGameObjects.length / this.gamesPerPage);
    const startIndex = (page - 1) * this.gamesPerPage;
    const endIndex = startIndex + this.gamesPerPage; 
    const pageGameObjects = allGameObjects.slice(startIndex, endIndex);

    grid.innerHTML = pageGameObjects.map((_, index) => this.createGameCardPlaceholderHTML(startIndex + index)).join('');

    // Process all games on the page concurrently
    await Promise.all(pageGameObjects.map(async (gameObject, index) => {
        const placeholderId = startIndex + index;
        const result = await this.fetchCuratedGameData(gameObject, genre, placeholderId);
        
        // Final check for race condition before rendering
        if (this.activeCuratedTab !== genre) return;

        const placeholder = grid.querySelector(`[data-placeholder-id="${placeholderId}"]`);
        if (placeholder) {
            let finalHTML;
            if (result.status === 'found') {
                finalHTML = this.createGameCardHTMLFromData(result.data, gameObject.title);
            } else {
                finalHTML = this.createGameCardNotFoundHTML(gameObject.title);
            }
            placeholder.outerHTML = finalHTML;
            
            if (result.status === 'found') {
                const newCard = grid.querySelector(`[data-game-slug="${result.data.slug}"]`);
                newCard?.addEventListener('click', () => this.showGameDetails(result.data.slug));
            }
        }
    }));

    this.renderCuratedPagination(genre, page, totalPages);
}

/**
 * Robustly fetches data for a single curated game using a multi-stage fallback strategy.
 * @param {object} gameObject - The game object from our curated list ({title, slug}).
 * @param {string} currentGenre - The currently active genre tab, for race condition checking.
 * @param {number} placeholderId - The unique ID of the placeholder element for UI updates.
 * @returns {Promise<{status: 'found'|'not_found', data: object|null}>}
 */
async fetchCuratedGameData(gameObject, currentGenre, placeholderId) {
    // Stage 1: Attempt to fetch with the precise slug
    try {
        const gameData = await this.app.gameAPI.getGameDetails(gameObject.slug);
        if (this.activeCuratedTab !== currentGenre) return { status: 'aborted' };
        if (gameData) return { status: 'found', data: gameData };
    } catch (slugError) {
        console.warn(`Slug fetch failed for "${gameObject.title}". Initiating fallback search.`);
    }

    // Stage 2: Update UI and perform fallback search by title
    const placeholder = document.querySelector(`[data-placeholder-id="${placeholderId}"]`);
    if (placeholder) {
        placeholder.classList.remove('skeleton');
        placeholder.innerHTML = this.createGameCardSearchingHTML(gameObject.title);
    }
    
    try {
        const searchResult = await this.app.gameAPI.searchGames(gameObject.title, { pageSize: 5, platforms: '17' });
        if (this.activeCuratedTab !== currentGenre) return { status: 'aborted' };

        // Stage 3: Validate results to find the best match
        const bestMatch = this.findBestMatch(gameObject.title, searchResult.games);
        if (bestMatch) {
            return { status: 'found', data: bestMatch };
        }
    } catch (searchError) {
        console.error(`Fallback search failed for "${gameObject.title}":`, searchError);
    }
    
    // Stage 4: If all else fails
    return { status: 'not_found', data: null };
}

/**
 * Finds the best game match from a list of search results using string similarity.
 * @param {string} targetTitle - The original title we are looking for.
 * @param {Array<object>} results - The array of game objects from the API search.
 * @returns {object|null} The best matching game object or null.
 */
findBestMatch(targetTitle, results) {
    if (!results || results.length === 0) return null;

    const normalizedTarget = targetTitle.toLowerCase();

    // Prioritize exact match
    const exactMatch = results.find(game => game.name.toLowerCase() === normalizedTarget);
    if (exactMatch) return exactMatch;

    // Score other results based on similarity (Levenshtein distance)
    const scoredResults = results.map(game => ({
        game,
        score: this.levenshteinDistance(normalizedTarget, game.name.toLowerCase())
    })).sort((a, b) => a.score - b.score); // Lower score (distance) is better

    // Return the best match if its score is reasonably low
    if (scoredResults[0].score < (targetTitle.length / 2)) {
        return scoredResults[0].game;
    }

    return null;
}

/**
 * Calculates the Levenshtein distance between two strings (a measure of similarity).
 * @param {string} a The first string.
 * @param {string} b The second string.
 * @returns {number} The distance value. Lower is more similar.
 */
levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,      // deletion
                matrix[j - 1][i] + 1,      // insertion
                matrix[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Creates HTML for a card in a "searching..." state.
 * @param {string} title - The title of the game being searched for.
 * @returns {string} HTML for the searching card.
 */
createGameCardSearchingHTML(title) {
    return `
        <div class="game-card-content" style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
            <div class="modal-spinner" style="margin-bottom: 10px;"></div>
            <h3 class="game-card-title" style="text-align: center; font-size: 0.9rem;">Finding "${title}"...</h3>
        </div>
    `;
}

/**
 * Creates HTML for a card when a game could not be found.
 * @param {string} title - The title of the game that was not found.
 * @returns {string} HTML for the "not found" card.
 */
createGameCardNotFoundHTML(title) {
    return `
        <div class="game-card game-card-placeholder">
            <div class="game-card-placeholder-content">
                <h3 class="game-card-placeholder-title">${title}</h3>
                <span class="game-card-placeholder-meta">Data Not Found</span>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for a skeleton loading placeholder for a game card.
 * @param {number} id - A unique ID for the placeholder element.
 * @returns {string} The HTML for the placeholder.
 */
createGameCardPlaceholderHTML(id) {
    return `<div class="game-card skeleton" data-placeholder-id="${id}"><div class="skeleton-image"></div><div class="skeleton-title"></div></div>`;
}

/**
 * Creates the final HTML for a game card from API data.
 * @param {object} game - The game data object from the API.
 * @param {string} displayTitle - The title from our curated list for consistency.
 * @returns {string} The HTML for the game card.
 */
createGameCardHTMLFromData(game, displayTitle) {
    const hasImage = !!game.image;

    // If there's an image, create the standard card.
    if (hasImage) {
        return `
            <div class="game-card" data-game-slug="${game.slug}">
                <img src="${game.image}" 
                     alt="${displayTitle}" class="game-card-image" loading="lazy" 
                     onerror="this.parentElement.innerHTML = document.getElementById('no-image-template').innerHTML.replace('{{TITLE}}', '${displayTitle.replace(/'/g, "\\'")}');">
                <div class="game-card-content">
                    <h3 class="game-card-title">${displayTitle}</h3>
                </div>
            </div>
        `;
    } 
    // If there is NO image, create a styled placeholder card.
    else {
        return `
            <div class="game-card game-card-placeholder no-image" data-game-slug="${game.slug}">
                <div class="game-card-placeholder-content">
                    <h3 class="game-card-placeholder-title">${displayTitle}</h3>
                </div>
            </div>
        `;
    }
}

/**
 * Renders the pagination controls for the curated section.
 */
renderCuratedPagination(genre, currentPage, totalPages) {
    const paginationContainer = document.getElementById('curated-pagination');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    if (currentPage > 1) {
        html += `<button class="pagination-btn prev">Previous</button>`;
    }

    html += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;

    if (currentPage < totalPages) {
        html += `<button class="pagination-btn next">Next</button>`;
    }

    paginationContainer.innerHTML = html;

    paginationContainer.querySelector('.prev')?.addEventListener('click', () => {
        this.displayCuratedGamesForGenre(genre, currentPage - 1);
    });

    paginationContainer.querySelector('.next')?.addEventListener('click', () => {
        this.displayCuratedGamesForGenre(genre, currentPage + 1);
    });
}


    loadGenres(genres) {
        const container = document.getElementById('genre-grid');
        if (!container) return;
        container.innerHTML = genres.slice(0, 8).map(genre => `
            <div class="genre-card" data-genre-slug="${genre.slug}" data-genre-name="${genre.name}">
                <div class="genre-header">
                    <h3 class="genre-title">${genre.name}</h3>
                </div>
                <button class="explore-btn">Explore</button>
            </div>
        `).join('');
        container.querySelectorAll('.genre-card').forEach(card => {
            card.addEventListener('click', () => {
                const slug = card.dataset.genreSlug;
                const name = card.dataset.genreName;
                this.navigateToPage('genre-detail');
                this.loadGamesForGenre({ slug, name });
            });
        });
    }
}