# 🖥️ Server Metrics Setup Guide

## Overview

The status monitor now includes real-time Oracle Cloud server monitoring with:
- ✅ CPU usage and load averages
- ✅ RAM usage (total, used, free, available)
- ✅ Disk usage (total, used, free)
- ✅ Network traffic (received/transmitted)
- ✅ Server uptime
- ✅ System information

---

## 📦 Files Created

```
status/
├── server-metrics-api.php      # Backend API endpoint
├── server-metrics.js           # Frontend display logic
└── SERVER_METRICS_SETUP.md     # This file
```

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Deploy the API Endpoint

Upload `server-metrics-api.php` to your Oracle Cloud server:

```bash
# Option 1: Via SCP
scp status/server-metrics-api.php user@your-server:/var/www/html/api/server-metrics.php

# Option 2: Via FTP
# Upload to: /var/www/html/api/server-metrics.php

# Option 3: Manually
# Copy the contents of server-metrics-api.php
# Create file on server at: /var/www/html/api/server-metrics.php
```

### Step 2: Set Permissions

```bash
ssh user@your-server
chmod 644 /var/www/html/api/server-metrics.php
chown www-data:www-data /var/www/html/api/server-metrics.php
```

### Step 3: Test the Endpoint

```bash
curl https://yourdomain.com/api/server-metrics.php
```

You should see JSON output with server metrics.

### Step 4: Update the URL

Edit `status/server-metrics.js` line 13:

```javascript
// Change this to your actual endpoint
const response = await fetch('/api/server-metrics.php');

// Or use full URL:
const response = await fetch('https://yourdomain.com/api/server-metrics.php');
```

### Step 5: Deploy Status Page

Upload the entire `status` folder to your subdomain as usual.

---

## 🎨 What You'll See

### Server Information Bar
```
┌─────────────────────────────────────────────────────┐
│ Hostname: oracle-server-1                           │
│ OS: Linux 5.15.0                                    │
│ Uptime: 15 days, 3 hours                            │
│ Server Time: 2026-05-23 18:00:00                    │
└─────────────────────────────────────────────────────┘
```

### Metrics Cards
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ CPU Usage    │ Memory Usage │ Disk Usage   │ Network      │
│              │              │              │              │
│   45.2%      │   62.8%      │   38.5%      │ ↓ 125.3 GB   │
│ 4 cores      │ 5.2GB/8GB    │ 15GB/40GB    │ ↑ 89.7 GB    │
│ [████░░░░░]  │ [██████░░░]  │ [███░░░░░░]  │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Color Coding
- 🟢 **Green** (0-70%): Healthy
- 🟡 **Yellow** (70-85%): Warning
- 🔴 **Red** (85-100%): Critical

---

## 🔧 Configuration

### Change Update Interval

Edit `server-metrics.js` to add auto-refresh:

```javascript
// Add at the end of the file
setInterval(() => {
    fetchServerMetrics();
}, 30000); // Refresh every 30 seconds
```

### Customize Thresholds

Edit `server-metrics.js` line 35-37:

```javascript
// Change these values to adjust color thresholds
const cpuColor = data.cpu.usage < 70 ? 'low' : data.cpu.usage < 85 ? 'medium' : 'high';
const memColor = data.memory.usage_percent < 70 ? 'low' : data.memory.usage_percent < 85 ? 'medium' : 'high';
const diskColor = data.disk.usage_percent < 70 ? 'low' : data.disk.usage_percent < 85 ? 'medium' : 'high';
```

### Add More Metrics

Edit `server-metrics-api.php` to add custom metrics:

```php
// Add after line 150
function getCustomMetric() {
    // Your custom logic here
    return [
        'value' => 123,
        'label' => 'Custom Metric'
    ];
}

// Add to response (line 165)
$metrics = [
    // ... existing metrics
    'custom' => getCustomMetric()
];
```

---

## 🔒 Security Considerations

### 1. Restrict Access (Recommended)

Add to `server-metrics-api.php`:

```php
// At the top of the file, after headers
$allowed_origins = ['https://status.yourdomain.com', 'https://yourdomain.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!in_array($origin, $allowed_origins)) {
    http_response_code(403);
    die(json_encode(['error' => 'Access denied']));
}
```

### 2. Add API Key Authentication

```php
// Check for API key
$api_key = $_GET['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
$valid_key = 'your-secret-key-here';

if ($api_key !== $valid_key) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid API key']));
}
```

Then update `server-metrics.js`:

```javascript
const response = await fetch('/api/server-metrics.php?key=your-secret-key-here');
```

### 3. Rate Limiting

Add to `.htaccess` in `/api/` directory:

```apache
<IfModule mod_ratelimit.c>
    SetOutputFilter RATE_LIMIT
    SetEnv rate-limit 400
</IfModule>
```

---

## 🐛 Troubleshooting

### Issue: "Unable to fetch server metrics"

**Causes:**
1. API endpoint not deployed
2. Wrong URL in `server-metrics.js`
3. CORS issues
4. PHP not installed

**Solutions:**
```bash
# Check if PHP is installed
php -v

# Check if file exists
ls -la /var/www/html/api/server-metrics.php

# Check PHP errors
tail -f /var/log/apache2/error.log

# Test endpoint directly
curl -v https://yourdomain.com/api/server-metrics.php
```

### Issue: Metrics show 0 or incorrect values

**Solution:**
```bash
# Check PHP permissions
sudo usermod -a -G www-data $USER

# Restart web server
sudo systemctl restart apache2
# or
sudo systemctl restart nginx
```

### Issue: CORS errors in browser console

**Solution:**
Add to `server-metrics-api.php`:

```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
```

---

## 📊 Metrics Explained

### CPU Usage
- **Usage %**: Current CPU utilization
- **Load Average**: System load (1, 5, 15 minutes)
- **Cores**: Number of CPU cores

### Memory Usage
- **Total**: Total RAM installed
- **Used**: Currently used RAM
- **Free**: Available RAM
- **Usage %**: Percentage of RAM in use

### Disk Usage
- **Total**: Total disk space
- **Used**: Used disk space
- **Free**: Available disk space
- **Usage %**: Percentage of disk in use

### Network Traffic
- **Received**: Total data received since boot
- **Transmitted**: Total data sent since boot

### Uptime
- **Formatted**: Human-readable uptime
- **Days**: Number of days online

---

## 🎯 Advanced Features

### 1. Add Process Monitoring

```php
function getTopProcesses() {
    $output = shell_exec('ps aux --sort=-%mem | head -n 6');
    // Parse and return top processes
    return $output;
}
```

### 2. Add Temperature Monitoring

```php
function getTemperature() {
    $temp = shell_exec('sensors | grep "Core 0" | awk \'{print $3}\'');
    return trim($temp);
}
```

### 3. Add Docker Stats

```php
function getDockerStats() {
    $stats = shell_exec('docker stats --no-stream --format "{{.Name}}: {{.CPUPerc}}"');
    return $stats;
}
```

---

## 📱 Mobile Optimization

The server metrics are fully responsive:
- **Desktop**: 4-column grid
- **Tablet**: 2-column grid
- **Mobile**: 1-column stack

---

## 🔄 Auto-Refresh

Metrics auto-refresh with the rest of the status page (every 60 seconds by default).

To change:
```javascript
// In status-checker.js, line 380
}, 30000); // Change to 30 seconds
```

---

## ✅ Verification Checklist

- [ ] `server-metrics-api.php` deployed to server
- [ ] File permissions set correctly (644)
- [ ] Endpoint accessible via browser
- [ ] Returns valid JSON
- [ ] CORS headers configured
- [ ] URL updated in `server-metrics.js`
- [ ] Status page shows metrics
- [ ] Metrics update on refresh
- [ ] Mobile view works correctly

---

## 📞 Support

If metrics aren't showing:

1. Check browser console for errors (F12)
2. Verify API endpoint returns JSON
3. Check server logs for PHP errors
4. Ensure PHP has permission to read system stats
5. Test with `curl` command

---

## 🎉 Result

You now have real-time server monitoring integrated into your status page!

**Features:**
- ✅ Live CPU, RAM, Disk monitoring
- ✅ Network traffic stats
- ✅ Server uptime tracking
- ✅ Color-coded health indicators
- ✅ Auto-refresh every 60 seconds
- ✅ Mobile responsive design

**Next Steps:**
1. Deploy the API endpoint
2. Test the metrics display
3. Customize thresholds if needed
4. Add security measures
5. Monitor your server health!

---

**Created:** May 2026  
**Version:** 1.0.0  
**Requires:** PHP 7.0+, Linux server
