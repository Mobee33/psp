# 🎮 PSP Game Explorer

An industry-grade, interactive web application for exploring PlayStation Portable games. Features a modern design, real-time API integration, and comprehensive game collection management.

## ✨ Features

- **🎯 Game Discovery**: Search and explore 500+ PSP games with detailed information
- **📊 Real-time Data**: Powered by RAWG API for up-to-date ratings and screenshots
- **💾 Collection Management**: Track owned, wishlist, completed, and favorite games
- **🎨 Multiple Themes**: Dark, Light, Neon Cyberpunk, and Retro Gaming themes
- **📱 Progressive Web App**: Install and use offline with full PWA support
- **🔍 Advanced Search**: Smart search with filters, autocomplete, and search history
- **📈 Analytics**: Built-in user behavior tracking and performance monitoring
- **♿ Accessibility**: Full accessibility support with WCAG compliance
- **🌐 Offline Support**: Works offline with intelligent caching

## 🚀 Quick Start (Plug & Play)

### Method 1: Direct File Setup

1. **Download all files** from this repository
2. **Organize files** according to the folder structure below
3. **Generate assets** using the Asset Generator (see Assets section)
4. **Open `index.html`** in your web browser
5. **Done!** The app will work immediately

### Method 2: Web Server (Recommended)

For full PWA features and proper API functionality:

1. **Set up files** as described above
2. **Serve files** using any web server:
   - **Python**: `python -m http.server 8000`
   - **Node.js**: `npx serve .`
   - **PHP**: `php -S localhost:8000`
   - **Live Server**: Use VS Code Live Server extension
3. **Open** `http://localhost:8000` in your browser

## 📁 Folder Structure

```
PSP-Game-Explorer/
├── index.html                 # Main HTML file
├── manifest.json             # PWA manifest
├── sw.js                     # Service worker
├── README.md                 # This file
├── asset-generator.html      # Asset generation tool
├── js/
│   ├── app.js               # Main application
│   ├── components/
│   │   ├── UIManager.js     # UI management
│   │   ├── NotificationManager.js  # Notifications
│   │   └── SearchManager.js # Search functionality
│   └── services/
│       ├── GameAPI.js       # API service (rename GameApi.js)
│       ├── Router.js        # Client-side routing
│       ├── StorageManager.js    # Data persistence
│       ├── ThemeManager.js  # Theme management
│       ├── CollectionManager.js # Game collections
│       └── AnalyticsManager.js  # Analytics
├── styles/
│   ├── main.css            # Core styles
│   ├── components.css      # Component styles
│   └── animations.css      # Animations
└── assets/
    ├── icons/              # PWA icons (various sizes)
    ├── screenshots/        # App screenshots
    ├── favicon-16x16.png   # Browser favicon
    └── favicon-32x32.png   # Browser favicon
```

## 🎨 Generating Assets

The app requires several image assets for proper PWA functionality:

### Using the Asset Generator

1. **Open** `asset-generator.html` in your browser
2. **Click** "Download All Assets" button
3. **Save** all downloaded files to the `assets/` folder
4. **Organize** icons into `assets/icons/` subfolder

### Required Assets

- **Favicons**: 16x16, 32x32 PNG files
- **PWA Icons**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 PNG files
- **Screenshots**: Optional placeholder screenshots for app stores

## ⚙️ Configuration

### API Setup

The app uses the RAWG Video Games Database API:

1. **Get API Key**: Visit [RAWG.io](https://rawg.io/apidocs) and sign up
2. **Update API Key**: In `js/services/GameAPI.js`, replace the API key:
   ```javascript
   this.apiKey = 'YOUR_API_KEY_HERE';
   ```

### Customization

- **Themes**: Edit `js/services/ThemeManager.js` to add custom themes
- **Game Data**: Modify `js/services/GameAPI.js` to add custom game facts
- **Styling**: Update CSS files in `styles/` folder
- **Features**: Enable/disable features in `js/app.js` configuration

## 🔧 Technical Details

### Technologies Used

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Architecture**: Component-based with service layer
- **APIs**: RAWG Video Games Database
- **Storage**: LocalStorage, IndexedDB, Cache API
- **PWA**: Service Worker, Web App Manifest
- **Performance**: Lazy loading, intelligent caching, debounced search

### Browser Support

- **Modern Browsers**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- **Progressive Enhancement**: Graceful fallbacks for older browsers
- **Mobile**: Full responsive design with touch support

### Performance Features

- **Lazy Loading**: Images and content load on demand
- **Caching**: Intelligent API response caching
- **Debouncing**: Optimized search performance
- **Code Splitting**: Modular JavaScript architecture
- **Compression**: Gzip-ready static assets

## 🎮 Usage Guide

### Basic Navigation

- **Home**: Overview and featured games
- **Games**: Browse all PSP games with filters
- **Genres**: Explore games by category
- **Collection**: Manage your personal game library
- **Search**: Use Ctrl+K or click search icon

### Collection Management

- **Add Games**: Click game cards and use "Add to Collection"
- **Organize**: Use different lists (Owned, Wishlist, Completed, etc.)
- **Rate Games**: Add personal ratings and reviews
- **Export/Import**: Backup your collection data

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Open search
- **Escape**: Close modals
- **Arrow Keys**: Navigate results
- **Enter**: Select highlighted item

## 🔒 Privacy & Data

- **Local Storage**: All user data stays on your device
- **No Tracking**: No third-party analytics or tracking
- **API Usage**: Only communicates with RAWG API for game data
- **Offline First**: Works without internet after initial load

## 🐛 Troubleshooting

### Common Issues

**App won't load**:
- Ensure all files are in correct folder structure
- Check browser console for errors
- Verify asset files are present

**API not working**:
- Check internet connection
- Verify API key in GameAPI.js
- Check browser network tab for API errors

**PWA features not working**:
- Use a web server (not file:// protocol)
- Check service worker registration in browser dev tools
- Ensure manifest.json is accessible

**Styling issues**:
- Check that all CSS files are loading
- Verify font loading from Google Fonts
- Clear browser cache

### Development Mode

Enable debug logging by opening browser console and setting:
```javascript
localStorage.setItem('psp_debug_mode', 'true');
```

## 🚀 Deployment

### Static Hosting

Deploy to any static hosting service:

- **Netlify**: Drag and drop the folder
- **Vercel**: Connect GitHub repository
- **GitHub Pages**: Enable in repository settings
- **Firebase Hosting**: Use Firebase CLI
- **Surge.sh**: Use `surge` command

### Custom Domain

Update these files for custom domain deployment:

1. **manifest.json**: Update `start_url` and `scope`
2. **sw.js**: Update cache names if needed
3. **index.html**: Update meta tags and canonical URLs

## 📊 Analytics

The app includes built-in analytics for usage insights:

- **User Behavior**: Page views, interactions, search patterns
- **Performance**: Load times, API response times, errors
- **Collections**: Most popular games and genres
- **A/B Testing**: Built-in experiment framework

Analytics data is stored locally and never transmitted externally.

## 🎨 Theming

Create custom themes by editing `ThemeManager.js`:

```javascript
this.themes.myTheme = {
  name: 'My Custom Theme',
  colors: {
    primary: '#your-color',
    background: '#your-bg',
    // ... other colors
  }
};
```

## 🤝 Contributing

This is a complete, standalone application. To contribute:

1. **Fork** the repository
2. **Make** your changes
3. **Test** thoroughly
4. **Submit** a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **RAWG.io**: For the comprehensive games database API
- **PSP Community**: For keeping retro gaming alive
- **Open Source**: For the tools and libraries that made this possible

---

**Made with 💜 for PSP gaming enthusiasts**

For support or questions, please open an issue in the repository.