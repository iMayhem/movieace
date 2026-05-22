/**
 * PM2 Ecosystem Configuration
 * Manages the Node.js resolver as a production daemon
 */

module.exports = {
  apps: [{
    name: 'movieace-resolver',
    script: './server.js',
    instances: 1, // Run 1 instance for low-memory VPS
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      NGINX_PROXY_BASE: 'http://161.118.191.46'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000
  }]
};
