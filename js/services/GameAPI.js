/**
 * GameAPI Service (Rewritten for Clarity and Correctness)
 * Handles all API communications with the RAWG API.
 */

export class GameAPI {
  constructor(apiKey = '72ad754cd1d84657bb6f3ade5992b659') {
    this.apiKey = apiKey;
    // IMPORTANT: Base URL must end with a trailing slash!
    this.baseURL = 'https://api.rawg.io/api/';
    this.isOnline = navigator.onLine;

    // A simple in-memory cache to reduce duplicate requests.
    this.cache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    
    // Hardcoded game facts for enhanced information
    this.gameFacts = {
      'god-of-war': { fact: 'The God of War series on PSP maintained console-quality visuals and gameplay, proving handheld gaming could compete with home consoles!', trivia: 'Chains of Olympus was developed specifically for PSP and featured some of the most impressive graphics on the platform.' },
      'dante-s-inferno': { fact: 'This game adapts the first part of Dante\'s Divine Comedy, bringing classic literature to interactive entertainment!', trivia: 'The game features over 60 famous quotes from the original poem throughout the journey.' },
      'half-life': { fact: 'Half-Life on PSP is a remarkable homebrew port that showcases the incredible dedication of the PSP modding community!', trivia: 'This port was created entirely by fans and runs surprisingly well on the PSP hardware.' },
      'metal-slug': { fact: 'The Metal Slug series is legendary for its incredibly detailed pixel art and buttery-smooth animations!', trivia: 'Each Metal Slug game contains over 10,000 individual animation frames.' },
      'final-fantasy': { fact: 'Crisis Core introduced the Digital Mind Wave system and delivered one of gaming\'s most heartbreaking endings!', trivia: 'The game sold over 3 million copies worldwide and is considered one of the best PSP exclusives.' },
      'persona': { fact: 'Persona 3 Portable added a female protagonist route, doubling the game\'s content and perspective!', trivia: 'The female route features different social links and story elements, making it almost a new game.' },
      'monster-hunter': { fact: 'Monster Hunter Freedom Unite is known for consuming thousands of hours of players\' lives - in the best way possible!', trivia: 'The game features over 500 quests and became a cultural phenomenon in Japan.' },
      'default': { fact: 'This game represents the golden age of handheld gaming when consoles fit in your pocket but delivered full console experiences!', trivia: 'The PSP was revolutionary for its time, featuring graphics comparable to PS2.' }
    };
  }

  /**
   * The core method for making API requests.
   * This is now the single source of truth for all API communication.
   */
  async makeRequest(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseURL);
    url.searchParams.set('key', this.apiKey);

    // Add any additional parameters to the URL
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const cacheKey = url.toString();

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Using cached data for:', endpoint);
        return cached.data;
      }
    }
    
    console.log('🌐 Making API Request:', cacheKey);

    try {
      const response = await fetch(cacheKey, {
        headers: {
          // THIS HEADER IS REQUIRED BY THE RAWG API
          'User-Agent': 'PSP Game Explorer/1.0.0'
        }
      });

      if (!response.ok) {
        // If the server responds with an error (like 404, 500, etc.)
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Store successful response in cache
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;

    } catch (error) {
      // This will catch network errors (like CORS) or the error thrown above
      console.error(`❌ API request failed for ${endpoint}:`, error);
      // Re-throw the error so the calling function knows something went wrong.
      throw error;
    }
  }

/**
 * Search for games with advanced filtering and sorting.
 */
  async searchGames(query, options = {}) {
    const params = {
      search: query,
      page_size: options.pageSize || 20,
      page: options.page || 1,
      ordering: options.ordering || '-rating', // Default sort order
    };

    // Explicitly add filters if they are provided in the options
    if (options.platforms) {
      params.platforms = options.platforms;
    }
    if (options.genres) {
      params.genres = options.genres;
    }

    const data = await this.makeRequest('games', params);
    return {
      games: data.results.map(game => this.formatGameData(game)),
      total: data.count,
      hasNext: !!data.next,
      hasPrevious: !!data.previous
    };
  }

  /**
   * Get details for a single game by its slug (ID).
   */
  async getGameDetails(gameSlug) {
    // The endpoint is just the game's unique slug
    const game = await this.makeRequest(`games/${gameSlug}`);
    
    // Fetch screenshots in parallel for speed
    const screenshots = await this.makeRequest(`games/${gameSlug}/screenshots`);

    return {
      ...this.formatGameData(game),
      screenshots: screenshots.results,
      funFact: this.getGameFact(game.name),
      trivia: this.getGameTrivia(game.name)
    };
  }

  /**
   * Get featured PSP games.
   */
  async getFeaturedGames() {
    try {
      const params = {
        platforms: '17', // Platform ID for PSP
        ordering: '-rating',
        page_size: 4,
        metacritic: '80,100' // Highly rated games
      };
      const data = await this.makeRequest('games', params);
      return data.results.map(game => this.formatGameData(game));
    } catch (error) {
      console.warn('⚠️ Could not fetch featured games, using fallback data.');
      return this.getFallbackFeaturedGames();
    }
  }
  
  // --- Helper and Fallback Methods (Copied from original) ---

  formatGameData(game) {
    return { id: game.id, slug: game.slug, name: game.name, description: game.description_raw || game.description || '', released: game.released, rating: game.rating || 0, ratingTop: game.rating_top || 5, ratingsCount: game.ratings_count || 0, metacritic: game.metacritic, image: game.background_image, platforms: game.platforms?.map(p => ({ id: p.platform.id, name: p.platform.name, slug: p.platform.slug })) || [], genres: game.genres?.map(g => ({ id: g.id, name: g.name, slug: g.slug })) || [], };
  }
  getGameFact(gameName) { const gameKey = gameName.toLowerCase().replace(/[^\w]/g, '-'); for (const [key, data] of Object.entries(this.gameFacts)) { if (gameKey.includes(key) && key !== 'default') { return data.fact; } } return this.gameFacts.default.fact; }
  getGameTrivia(gameName) { const gameKey = gameName.toLowerCase().replace(/[^\w]/g, '-'); for (const [key, data] of Object.entries(this.gameFacts)) { if (gameKey.includes(key) && key !== 'default') { return data.trivia; } } return this.gameFacts.default.trivia; }
  getFallbackFeaturedGames() { return [ { id: 3243, slug: 'god-of-war-chains-of-olympus', name: 'God of War: Chains of Olympus', rating: 4.5, image: 'https://media.rawg.io/media/games/648/648ce3b3165314a2b3734493a2a11b8b.jpg', genres: [{ name: 'Action' }], platforms: [{ name: 'PSP' }] }, { id: 5882, slug: 'crisis-core-final-fantasy-vii', name: 'Crisis Core: Final Fantasy VII', rating: 4.4, image: 'https://media.rawg.io/media/games/13a/13a52c3993c4a4533b073c88b8576a35.jpg', genres: [{ name: 'RPG' }], platforms: [{ name: 'PSP' }] }, { id: 3266, slug: 'persona-3-portable', name: 'Persona 3 Portable', rating: 4.6, image: 'https://media.rawg.io/media/games/228/228e22291cfc202a6858235e4e731a54.jpg', genres: [{ name: 'RPG' }], platforms: [{ name: 'PSP' }] }, { id: 3253, slug: 'monster-hunter-freedom-unite', name: 'Monster Hunter Freedom Unite', rating: 4.3, image: 'https://media.rawg.io/media/games/f80/f80d77ab673b53bc1328a8af87bf2b51.jpg', genres: [{ name: 'Action RPG' }], platforms: [{ name: 'PSP' }] } ]; }
  
  // Dummy init method to prevent other parts of the app from breaking.
  async init() {
    console.log('🎮 Game API Initialized (Rewritten Version)');
  }

  /**
 * Get a list of game genres.
 */
async getGenres() {
  try {
    const data = await this.makeRequest('genres', { page_size: 20 });
    // The original code had a fallback, but for now, we'll just return the data.
    return data.results.map(genre => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
      image: genre.image_background,
      gameCount: genre.games_count,
    }));
  } catch (error) {
    console.warn('⚠️ Could not fetch genres.');
    return []; // Return an empty array on failure
  }
}

  /**
   * Gets a paginated list of games for a specific genre slug.
   */
  async getGamesByGenre(genreSlug, options = {}) {
    try {
      const params = {
        genres: genreSlug,
        platforms: '17', // Crucial: Filter for only PSP games
        page: options.page || 1,
        page_size: options.pageSize || 20,
        ordering: options.ordering || '-rating'
      };
      const data = await this.makeRequest('games', params);
      return {
        games: data.results.map(game => this.formatGameData(game)),
        total: data.count,
        hasNext: !!data.next,
        hasPrevious: !!data.previous
      };
    } catch (error) {
      console.error(`❌ API request failed for genre ${genreSlug}:`, error);
      throw error;
    }
  }
}