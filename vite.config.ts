import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Remove whitespace for smaller bundle
          whitespace: 'condense'
        }
      }
    })
  ],
  
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'vue-vendor': ['vue', 'vue-router'],
          'ui-vendor': ['@vueuse/core'],
          'player-vendor': ['artplayer', 'hls.js'],
          'utils-vendor': ['axios', 'lodash', 'lodash.debounce'],
          'swiper-vendor': ['swiper']
        },
        
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico|webp)$/i.test(assetInfo.name)) {
            return `assets/img/[name]-[hash].${ext}`;
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[ext]/[name]-[hash].${ext}`;
        }
      }
    },
    
    // Increase chunk size warning limit (we're optimizing chunks)
    chunkSizeWarningLimit: 1000,
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Source maps only for debugging (disable in production)
    sourcemap: false,
    
    // Optimize asset inlining
    assetsInlineLimit: 4096 // 4kb - inline small assets as base64
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@vueuse/core',
      'artplayer',
      'hls.js',
      'axios',
      'lodash',
      'lodash.debounce',
      'swiper'
    ],
    exclude: ['@supabase/supabase-js'] // Exclude large deps that are lazy-loaded
  },
  
  // Server optimization for dev
  server: {
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  
  // Enable esbuild for faster builds
  esbuild: {
    legalComments: 'none',
    treeShaking: true
  }
})