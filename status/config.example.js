/**
 * Status Monitor Configuration Example
 * 
 * Copy this file to customize your status monitor.
 * This is an example showing how to add custom services.
 */

// Example: Adding a custom API
const customAPI = {
    name: 'My Custom API',
    url: 'https://api.mysite.com/health',
    testType: 'api',
    requiresAuth: false
};

// Example: Adding a custom embed provider
const customEmbed = {
    name: 'My Custom Embed',
    url: 'https://embed.mysite.com/movie/123',
    testType: 'embed',
    note: 'Custom provider'
};

// Example: Adding a GraphQL API
const customGraphQL = {
    name: 'My GraphQL API',
    url: 'https://graphql.mysite.com',
    testType: 'graphql'
};

// Example: Adding a database/backend service
const customBackend = {
    name: 'My Database',
    url: 'https://db.mysite.com/health',
    testType: 'api'
};

/**
 * To use these custom services:
 * 
 * 1. Open status-checker.js
 * 2. Find the 'services' object (around line 2)
 * 3. Add your custom service to the appropriate category:
 * 
 * const services = {
 *     coreApis: [
 *         // ... existing services
 *         customAPI  // Add your custom API here
 *     ],
 *     embedProviders: [
 *         // ... existing services
 *         customEmbed  // Add your custom embed here
 *     ],
 *     // ... other categories
 * };
 */

/**
 * Test Types Explained:
 * 
 * 'api' - Standard REST API
 *   - Sends GET request
 *   - Checks HTTP status code
 *   - 200-299 = Operational
 *   - 400-499 = Degraded
 *   - 500+ or timeout = Down
 * 
 * 'embed' - Embed/iframe provider
 *   - Attempts to load in iframe
 *   - Checks if resource is reachable
 *   - May show false negatives due to CORS
 * 
 * 'graphql' - GraphQL endpoint
 *   - Sends POST request with test query
 *   - Checks response status
 *   - Validates GraphQL response
 */

/**
 * Timeout Configuration:
 * 
 * Default timeout is 10 seconds (10000ms)
 * To change, edit status-checker.js line ~85:
 * 
 * const timeoutId = setTimeout(() => controller.abort(), 10000);
 *                                                         ^^^^^^
 *                                                         Change this value
 */

/**
 * Auto-refresh Configuration:
 * 
 * Default refresh interval is 60 seconds (60000ms)
 * To change, edit status-checker.js line ~380:
 * 
 * autoRefreshInterval = setInterval(() => {
 *     checkAllServices();
 * }, 60000);  // Change this value
 *    ^^^^^^
 */

/**
 * Color Customization:
 * 
 * Edit CSS variables in index.html (lines 14-30):
 * 
 * :root {
 *     --ember: #ff5a1f;      // Primary brand color
 *     --violet: #6366f1;     // Accent color
 *     --green: #10b981;      // Operational status
 *     --yellow: #f59e0b;     // Degraded status
 *     --red: #ef4444;        // Down status
 * }
 */

/**
 * Branding Customization:
 * 
 * Edit index.html:
 * 
 * Line 91: <h1 class="logo">moovie ✦</h1>
 *          Change "moovie" to your brand name
 * 
 * Line 92: <p class="subtitle">Real-time System Status Monitor</p>
 *          Change subtitle text
 */

// Export for reference (not used in actual implementation)
export const exampleConfig = {
    customAPI,
    customEmbed,
    customGraphQL,
    customBackend
};
