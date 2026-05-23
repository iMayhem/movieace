<?php
/**
 * Server Metrics API Endpoint
 * 
 * This script provides real-time server health metrics for the status monitor.
 * Deploy this to your Oracle Cloud server at: /api/server-metrics.php
 * 
 * Usage: https://yourdomain.com/api/server-metrics.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Function to get CPU usage
function getCPUUsage() {
    $load = sys_getloadavg();
    $cpuCount = shell_exec('nproc');
    $cpuCount = intval(trim($cpuCount));
    
    // Calculate CPU usage percentage (1-minute load average)
    $cpuUsage = ($load[0] / $cpuCount) * 100;
    
    return [
        'usage' => round($cpuUsage, 2),
        'load_1min' => round($load[0], 2),
        'load_5min' => round($load[1], 2),
        'load_15min' => round($load[2], 2),
        'cores' => $cpuCount
    ];
}

// Function to get memory usage
function getMemoryUsage() {
    $free = shell_exec('free -b');
    $free = (string)trim($free);
    $free_arr = explode("\n", $free);
    $mem = explode(" ", $free_arr[1]);
    $mem = array_filter($mem);
    $mem = array_merge($mem);
    
    $memTotal = $mem[1];
    $memUsed = $mem[2];
    $memFree = $mem[3];
    $memAvailable = isset($mem[6]) ? $mem[6] : $memFree;
    
    $memUsagePercent = ($memUsed / $memTotal) * 100;
    
    return [
        'total' => formatBytes($memTotal),
        'used' => formatBytes($memUsed),
        'free' => formatBytes($memFree),
        'available' => formatBytes($memAvailable),
        'usage_percent' => round($memUsagePercent, 2),
        'total_bytes' => intval($memTotal),
        'used_bytes' => intval($memUsed)
    ];
}

// Function to get disk usage
function getDiskUsage() {
    $diskTotal = disk_total_space('/');
    $diskFree = disk_free_space('/');
    $diskUsed = $diskTotal - $diskFree;
    $diskUsagePercent = ($diskUsed / $diskTotal) * 100;
    
    return [
        'total' => formatBytes($diskTotal),
        'used' => formatBytes($diskUsed),
        'free' => formatBytes($diskFree),
        'usage_percent' => round($diskUsagePercent, 2),
        'total_bytes' => $diskTotal,
        'used_bytes' => $diskUsed
    ];
}

// Function to get network stats
function getNetworkStats() {
    $rx_bytes = 0;
    $tx_bytes = 0;
    
    // Read network stats from /proc/net/dev
    $netdev = file_get_contents('/proc/net/dev');
    $lines = explode("\n", $netdev);
    
    foreach ($lines as $line) {
        if (strpos($line, ':') !== false) {
            $parts = preg_split('/\s+/', trim($line));
            if (count($parts) >= 10 && !in_array($parts[0], ['lo:', 'docker0:'])) {
                $rx_bytes += intval($parts[1]);
                $tx_bytes += intval($parts[9]);
            }
        }
    }
    
    return [
        'received' => formatBytes($rx_bytes),
        'transmitted' => formatBytes($tx_bytes),
        'received_bytes' => $rx_bytes,
        'transmitted_bytes' => $tx_bytes
    ];
}

// Function to get system uptime
function getUptime() {
    $uptime = shell_exec('uptime -p');
    $uptime = str_replace('up ', '', trim($uptime));
    
    $uptimeSeconds = intval(shell_exec('cat /proc/uptime | awk \'{print $1}\''));
    
    return [
        'formatted' => $uptime,
        'seconds' => $uptimeSeconds,
        'days' => floor($uptimeSeconds / 86400)
    ];
}

// Function to get server info
function getServerInfo() {
    return [
        'hostname' => gethostname(),
        'os' => php_uname('s') . ' ' . php_uname('r'),
        'php_version' => phpversion(),
        'server_time' => date('Y-m-d H:i:s'),
        'timezone' => date_default_timezone_get()
    ];
}

// Helper function to format bytes
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    
    return round($bytes, $precision) . ' ' . $units[$pow];
}

// Build response
try {
    $metrics = [
        'status' => 'operational',
        'timestamp' => time(),
        'server' => getServerInfo(),
        'cpu' => getCPUUsage(),
        'memory' => getMemoryUsage(),
        'disk' => getDiskUsage(),
        'network' => getNetworkStats(),
        'uptime' => getUptime()
    ];
    
    echo json_encode($metrics, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
