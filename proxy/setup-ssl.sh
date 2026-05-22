#!/bin/bash
# Setup SSL for proxy.moovie.fun
# Run this AFTER pointing DNS to 161.118.191.46

set -e

echo "=== SSL Setup for proxy.moovie.fun ==="
echo ""
echo "Prerequisites:"
echo "1. DNS A record for proxy.moovie.fun must point to 161.118.191.46"
echo "2. Port 80 must be open (for Let's Encrypt verification)"
echo ""
read -p "Have you pointed the DNS? (yes/no): " dns_ready

if [ "$dns_ready" != "yes" ]; then
    echo "Please point DNS first, then run this script again."
    exit 1
fi

# Stop nginx temporarily for certbot standalone mode
echo "Stopping nginx..."
sudo pkill nginx || true

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    cd /tmp
    wget -q https://dl.eff.org/certbot-auto
    sudo mv certbot-auto /usr/local/bin/certbot
    sudo chmod +x /usr/local/bin/certbot
fi

# Get certificate
echo "Getting SSL certificate from Let's Encrypt..."
sudo certbot certonly --standalone \
    -d proxy.moovie.fun \
    --non-interactive \
    --agree-tos \
    --email admin@moovie.fun \
    --preferred-challenges http

# Update nginx config to use SSL
echo "Updating nginx configuration..."
cat > /tmp/nginx-ssl.conf << 'EOF'
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile           on;
    tcp_nopush         on;
    tcp_nodelay        on;
    keepalive_timeout  65;
    gzip               off;

    log_format main '$remote_addr - $request_uri [$status] '
                    '$body_bytes_sent bytes ref="$http_referer"';
    access_log /var/log/nginx/proxy_access.log main;
    error_log  /var/log/nginx/proxy_error.log warn;

    upstream aoneroom_api {
        server h5.aoneroom.com:443;
        keepalive 32;
    }

    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=stream:10m rate=120r/m;

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        listen [::]:80;
        server_name proxy.moovie.fun;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name proxy.moovie.fun;

        ssl_certificate     /etc/letsencrypt/live/proxy.moovie.fun/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/proxy.moovie.fun/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;

        location = /health {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header Content-Type text/plain;
            return 200 'ok';
        }

        location /api/ {
            limit_req zone=api burst=10 nodelay;

            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, HEAD, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Range, Content-Type, Authorization' always;

            if ($request_method = 'OPTIONS') {
                return 204;
            }

            rewrite ^/api/(.*)$ /$1 break;

            proxy_pass         https://h5.aoneroom.com;
            proxy_ssl_server_name on;
            proxy_http_version 1.1;
            proxy_set_header   Connection "";
            proxy_set_header   Host h5.aoneroom.com;
            proxy_set_header   Referer "https://h5.aoneroom.com";
            proxy_set_header   Origin  "https://h5.aoneroom.com";
            proxy_set_header   X-Forwarded-For "";
            proxy_set_header   X-Real-IP "";

            proxy_connect_timeout 10s;
            proxy_read_timeout    30s;
        }

        # Proxy all other requests to Node.js on port 8080
        location / {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, HEAD, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Range, Content-Type, Authorization' always;
            add_header 'Access-Control-Expose-Headers' 'Content-Length, Content-Range' always;

            if ($request_method = 'OPTIONS') {
                return 204;
            }

            proxy_pass http://127.0.0.1:8080;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_buffering off;
            proxy_request_buffering off;
            proxy_connect_timeout 10s;
            proxy_read_timeout 120s;
        }
    }
}
EOF

sudo cp /tmp/nginx-ssl.conf /etc/nginx/nginx.conf

# Test config
echo "Testing nginx configuration..."
sudo nginx -t

# Start nginx
echo "Starting nginx with SSL..."
sudo /usr/sbin/nginx

echo ""
echo "=== SSL Setup Complete! ==="
echo ""
echo "Your proxy is now running with SSL at:"
echo "  https://proxy.moovie.fun"
echo ""
echo "Test it:"
echo "  curl https://proxy.moovie.fun/health"
echo ""
echo "Certificate will auto-renew via certbot."
echo "To manually renew: sudo certbot renew"
