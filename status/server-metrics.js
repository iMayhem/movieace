// Server Metrics Display
async function fetchServerMetrics() {
    const container = document.getElementById('server-metrics-container');
    
    // Show loading state
    container.innerHTML = `
        <div class="server-metrics">
            <div style="text-align: center; padding: 2rem; color: var(--bone-500);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p>Loading server metrics...</p>
            </div>
        </div>
    `;
    
    try {
        // Fetch metrics from your API endpoint
        // Change this URL to your actual endpoint
        const response = await fetch('/api/server-metrics.php');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display metrics
        displayServerMetrics(data);
    } catch (error) {
        // Show error state
        container.innerHTML = `
            <div class="server-metrics">
                <div style="text-align: center; padding: 2rem; color: var(--red);">
                    <p style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</p>
                    <p style="font-weight: 600; margin-bottom: 0.5rem;">Unable to fetch server metrics</p>
                    <p style="font-size: 0.85rem; color: var(--bone-500);">${error.message}</p>
                    <p style="font-size: 0.75rem; color: var(--bone-500); margin-top: 1rem;">
                        Make sure to deploy server-metrics-api.php to your server
                    </p>
                </div>
            </div>
        `;
    }
}

function displayServerMetrics(data) {
    const container = document.getElementById('server-metrics-container');
    
    // Determine status colors based on usage
    const cpuColor = data.cpu.usage < 70 ? 'low' : data.cpu.usage < 85 ? 'medium' : 'high';
    const memColor = data.memory.usage_percent < 70 ? 'low' : data.memory.usage_percent < 85 ? 'medium' : 'high';
    const diskColor = data.disk.usage_percent < 70 ? 'low' : data.disk.usage_percent < 85 ? 'medium' : 'high';
    
    container.innerHTML = `
        <div class="server-metrics">
            <!-- Server Info -->
            <div class="server-info">
                <div class="server-info-item">
                    <div class="server-info-label">Hostname</div>
                    <div class="server-info-value">${data.server.hostname}</div>
                </div>
                <div class="server-info-item">
                    <div class="server-info-label">Operating System</div>
                    <div class="server-info-value">${data.server.os}</div>
                </div>
                <div class="server-info-item">
                    <div class="server-info-label">Uptime</div>
                    <div class="server-info-value">${data.uptime.formatted}</div>
                </div>
                <div class="server-info-item">
                    <div class="server-info-label">Server Time</div>
                    <div class="server-info-value">${data.server.server_time}</div>
                </div>
            </div>
            
            <!-- Metrics Grid -->
            <div class="metrics-grid">
                <!-- CPU Usage -->
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">CPU Usage</span>
                    </div>
                    <div class="metric-value">${data.cpu.usage.toFixed(1)}%</div>
                    <div class="metric-subtext">${data.cpu.cores} cores • Load: ${data.cpu.load_1min}</div>
                    <div class="metric-bar">
                        <div class="metric-bar-fill ${cpuColor}" style="width: ${Math.min(data.cpu.usage, 100)}%"></div>
                    </div>
                </div>
                
                <!-- Memory Usage -->
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Memory Usage</span>
                    </div>
                    <div class="metric-value">${data.memory.usage_percent.toFixed(1)}%</div>
                    <div class="metric-subtext">${data.memory.used} / ${data.memory.total}</div>
                    <div class="metric-bar">
                        <div class="metric-bar-fill ${memColor}" style="width: ${data.memory.usage_percent}%"></div>
                    </div>
                </div>
                
                <!-- Disk Usage -->
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Disk Usage</span>
                    </div>
                    <div class="metric-value">${data.disk.usage_percent.toFixed(1)}%</div>
                    <div class="metric-subtext">${data.disk.used} / ${data.disk.total}</div>
                    <div class="metric-bar">
                        <div class="metric-bar-fill ${diskColor}" style="width: ${data.disk.usage_percent}%"></div>
                    </div>
                </div>
                
                <!-- Network Stats -->
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Network Traffic</span>
                    </div>
                    <div class="metric-value" style="font-size: 1.2rem;">
                        ↓ ${data.network.received}
                    </div>
                    <div class="metric-subtext">
                        ↑ ${data.network.transmitted}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Add to the main checkAllServices function
const originalCheckAllServices = checkAllServices;
checkAllServices = async function() {
    await originalCheckAllServices();
    await fetchServerMetrics();
};

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchServerMetrics();
});
