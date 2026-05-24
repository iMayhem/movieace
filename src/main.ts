import { createApp } from 'vue'
import './assets/styles/main.scss'
import App from './App.vue'
import { router } from './routes'

// Create app instance
const app = createApp(App)

// Use router
app.use(router)

// Mount app
app.mount('#app')

// Performance: Report Web Vitals (optional - can be removed in production)
if (import.meta.env.DEV) {
  // Only in development
  console.log('[Performance] App mounted')
}