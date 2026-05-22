# MovieAce - Vue Movie Streaming Platform

A modern Vue.js movie streaming platform with a clean, responsive UI.

## 📁 Project Structure

```
movieace/
├── src/                     # Vue 3 source code
│   ├── components/          # Reusable components
│   ├── pages/               # Page components
│   ├── routes/              # Vue Router configuration
│   ├── composables/         # Composable functions
│   ├── lib/                 # Utility libraries
│   └── assets/              # Styles and images
├── public/                  # Static assets
├── netlify/               # Netlify configuration
├── package.json           # Dependencies
└── vite.config.ts         # Vite configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- yarn

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## 🛠️ Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next generation frontend tooling
- **Vue Router** - Client-side routing
- **VueUse** - Collection of Vue composition utilities
- **Artplayer** - HTML5 video player
- **Axios** - HTTP client
- **Swiper** - Touch slider
- **Lodash** - Utility library

## 📁 Project Structure Details

### Components
- `cards/` - Tile and card components for movie/TV listings
- `detail/` - Detail page components (cast, seasons, trailer)
- `discover/` - Filter and discovery components

### Pages
- Home page
- Movie listing
- TV show listing
- Movie/TV detail pages
- Search results

### Composables
- `useStream.ts` - Stream resolution and playback

### Routes
- `/` - Home
- `/movies` - Movies
- `/tv` - TV Shows
- `/movie/:id` - Movie detail
- `/tv/:id` - TV detail
- `/search` - Search results

## 🎨 Styling

- SCSS with BEM methodology
- CSS variables for theming
- Responsive design with mobile-first approach

## 📦 Deployment

### Netlify
The project is configured for automatic deployment to Netlify:
- Push to main branch → Auto-deploy
- Preview deployments for PRs

### Local Development
```bash
yarn dev
# Server runs on http://localhost:5173
```

## 🧪 Testing

Run tests:
```bash
yarn test
```

## 📝 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

**Version**: 1.0.0  
**Last Updated**: May 22, 2026
