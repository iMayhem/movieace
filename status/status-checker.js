// Service Configuration
const services = {
    coreApis: [
        {
            name: 'TMDB API',
            url: 'https://api.themoviedb.org/3/movie/popular',
            testType: 'api',
            requiresAuth: true
        },
        {
            name: 'AniList API',
            url: 'https://graphql.anilist.co',
            testType: 'graphql'
        },
        {
            name: 'Consumet API',
            url: 'https://api.consumet.org/meta/anilist/info/21',
            testType: 'api'
        }
    ],
    embedProviders: [
        {
            name: 'CineStream (Direct)',
            url: window.location.origin + '/player.html',
            testType: 'embed',
            note: 'Internal player'
        },
        {
            name: 'VidLink',
            url: 'https://vidlink.pro/movie/502356',
            testType: 'embed'
        },
        {
            name: 'VidEasy',
            url: 'https://player.videasy.net/movie/502356',
            testType: 'embed'
        },
        {
            name: 'VidSrc (to)',
            url: 'https://vidsrc.to/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'VidKing',
            url: 'https://www.vidking.net/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'Cinemaos',
            url: 'https://cinemaos.tech/player/502356',
            testType: 'embed'
        },
        {
            name: 'VidSrc RU',
            url: 'https://vidsrc-embed.ru/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'VidSrc SU',
            url: 'https://vidsrc-embed.su/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'VidSrcMe',
            url: 'https://vidsrcme.su/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'MultiEmbed',
            url: 'https://multiembed.mov/?video_id=502356&tmdb=1',
            testType: 'embed'
        },
        {
            name: 'Vsrc',
            url: 'https://vsrc.su/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'AutoEmbed',
            url: 'https://player.autoembed.app/embed/movie/502356',
            testType: 'embed'
        },
        {
            name: 'VidFast',
            url: 'https://vidfast.pro/movie/502356',
            testType: 'embed'
        },
        {
            name: '111Movies',
            url: 'https://111movies.com/movie/502356',
            testType: 'embed'
        },
        {
            name: 'Vidora',
            url: 'https://vidora.su/movie/502356',
            testType: 'embed'
        },
        {
            name: 'Smashy',
            url: 'https://player.smashystream.com/movie/502356',
            testType: 'embed'
        }
    ],
    animeProviders: [
        {
            name: 'AnimePlay (Sub)',
            url: 'https://animeplay.to/embed/one-piece-100',
            testType: 'embed'
        },
        {
            name: 'AnimePlay (Dub)',
            url: 'https://animeplay.to/embed/one-piece-dub-100',
            testType: 'embed'
        }
    ],
    backendServices: [
        {
            name: 'Supabase',
            url: 'https://eeyiragtylotwiozbgqp.supabase.co',
            testType: 'api'
        }
    ]
};

// Status tracking
let statusData = {
    operational: 0,
    degraded: 0,
    down: 0,
    responseTimes: []
};

// Check service status
async function checkService(service) {
    const startTime = performance.now();
    
    try {
        // For embed providers, we just check if the domain is reachable
        // For APIs, we make actual requests
        
        if (service.testType === 'embed') {
            // Use a simple HEAD request or fetch with no-cors
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            try {
                const response = await fetch(service.url, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                // no-cors mode returns opaque response, so we assume success if no error
                return {
                    status: 'operational',
                    responseTime: responseTime,
                    message: 'Reachable'
                };
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    return {
                        status: 'degraded',
                        responseTime: 10000,
                        message: 'Timeout (>10s)'
                    };
                }
                
                // For embed providers, network errors might be due to CORS
                // We'll do a secondary check by trying to load in an iframe
                return await checkViaIframe(service.url);
            }
        } else if (service.testType === 'api') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(service.url, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            if (response.ok || response.status === 401) { // 401 is ok for auth-required APIs
                return {
                    status: 'operational',
                    responseTime: responseTime,
                    message: `${response.status} OK`
                };
            } else {
                return {
                    status: 'degraded',
                    responseTime: responseTime,
                    message: `HTTP ${response.status}`
                };
            }
        } else if (service.testType === 'graphql') {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(service.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: '{ Media(id: 1) { id } }'
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            if (response.ok) {
                return {
                    status: 'operational',
                    responseTime: responseTime,
                    message: 'GraphQL OK'
                };
            } else {
                return {
                    status: 'degraded',
                    responseTime: responseTime,
                    message: `HTTP ${response.status}`
                };
            }
        }
    } catch (error) {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        return {
            status: 'down',
            responseTime: responseTime,
            message: error.message || 'Connection failed'
        };
    }
}

// Check via iframe (fallback for embed providers)
async function checkViaIframe(url) {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        
        const timeout = setTimeout(() => {
            document.body.removeChild(iframe);
            resolve({
                status: 'degraded',
                responseTime: 5000,
                message: 'Slow/CORS blocked'
            });
        }, 5000);
        
        iframe.onload = () => {
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            resolve({
                status: 'operational',
                responseTime: 2000,
                message: 'Loaded'
            });
        };
        
        iframe.onerror = () => {
            clearTimeout(timeout);
            document.body.removeChild(iframe);
            resolve({
                status: 'down',
                responseTime: 0,
                message: 'Failed to load'
            });
        };
        
        document.body.appendChild(iframe);
    });
}

// Render service card
function renderServiceCard(service, result) {
    const statusClass = result.status;
    const statusText = result.status === 'operational' ? 'Operational' : 
                      result.status === 'degraded' ? 'Degraded' : 'Down';
    
    return `
        <div class="service-card">
            <div class="service-info">
                <div class="service-name">
                    ${service.name}
                    ${service.note ? `<span style="font-size: 0.7rem; color: var(--bone-500); font-weight: 400;">(${service.note})</span>` : ''}
                </div>
                <div class="service-url">${service.url}</div>
            </div>
            <div class="service-meta">
                <div class="service-status ${statusClass}">
                    <div class="status-dot ${statusClass}"></div>
                    ${statusText}
                </div>
                ${result.responseTime ? `
                    <div class="service-response-time">
                        <strong>${result.responseTime}ms</strong>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Render checking state
function renderCheckingCard(service) {
    return `
        <div class="service-card">
            <div class="service-info">
                <div class="service-name">${service.name}</div>
                <div class="service-url">${service.url}</div>
            </div>
            <div class="service-meta">
                <div class="service-status checking">
                    <div class="spinner"></div>
                    Checking
                </div>
            </div>
        </div>
    `;
}

// Check all services
async function checkAllServices() {
    // Reset stats
    statusData = {
        operational: 0,
        degraded: 0,
        down: 0,
        responseTimes: []
    };
    
    // Update overall status
    document.getElementById('overall-status-dot').className = 'status-dot checking';
    document.getElementById('overall-status-text').textContent = 'Checking Systems...';
    
    // Render checking state for all services
    document.getElementById('core-apis').innerHTML = services.coreApis.map(s => renderCheckingCard(s)).join('');
    document.getElementById('embed-providers').innerHTML = services.embedProviders.map(s => renderCheckingCard(s)).join('');
    document.getElementById('anime-providers').innerHTML = services.animeProviders.map(s => renderCheckingCard(s)).join('');
    document.getElementById('backend-services').innerHTML = services.backendServices.map(s => renderCheckingCard(s)).join('');
    
    // Check all services in parallel
    const allChecks = [
        ...services.coreApis.map(async (service) => {
            const result = await checkService(service);
            updateStats(result);
            return { service, result, category: 'core-apis' };
        }),
        ...services.embedProviders.map(async (service) => {
            const result = await checkService(service);
            updateStats(result);
            return { service, result, category: 'embed-providers' };
        }),
        ...services.animeProviders.map(async (service) => {
            const result = await checkService(service);
            updateStats(result);
            return { service, result, category: 'anime-providers' };
        }),
        ...services.backendServices.map(async (service) => {
            const result = await checkService(service);
            updateStats(result);
            return { service, result, category: 'backend-services' };
        })
    ];
    
    // Wait for all checks to complete
    const results = await Promise.all(allChecks);
    
    // Group results by category
    const grouped = {
        'core-apis': [],
        'embed-providers': [],
        'anime-providers': [],
        'backend-services': []
    };
    
    results.forEach(({ service, result, category }) => {
        grouped[category].push({ service, result });
    });
    
    // Render results
    Object.keys(grouped).forEach(category => {
        const container = document.getElementById(category);
        container.innerHTML = grouped[category]
            .map(({ service, result }) => renderServiceCard(service, result))
            .join('');
    });
    
    // Update stats display
    updateStatsDisplay();
    
    // Update overall status
    updateOverallStatus();
    
    // Update last updated time
    document.getElementById('last-updated-time').textContent = new Date().toLocaleString();
}

// Update stats
function updateStats(result) {
    if (result.status === 'operational') {
        statusData.operational++;
    } else if (result.status === 'degraded') {
        statusData.degraded++;
    } else {
        statusData.down++;
    }
    
    if (result.responseTime && result.responseTime < 10000) {
        statusData.responseTimes.push(result.responseTime);
    }
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('stat-operational').textContent = statusData.operational;
    document.getElementById('stat-degraded').textContent = statusData.degraded;
    document.getElementById('stat-down').textContent = statusData.down;
    
    if (statusData.responseTimes.length > 0) {
        const avg = Math.round(
            statusData.responseTimes.reduce((a, b) => a + b, 0) / statusData.responseTimes.length
        );
        document.getElementById('stat-avg-response').textContent = avg + 'ms';
    } else {
        document.getElementById('stat-avg-response').textContent = 'N/A';
    }
}

// Update overall status
function updateOverallStatus() {
    const total = statusData.operational + statusData.degraded + statusData.down;
    const operationalPercent = (statusData.operational / total) * 100;
    
    let overallStatus = 'operational';
    let overallText = 'All Systems Operational';
    
    if (statusData.down > 0) {
        overallStatus = 'down';
        overallText = `${statusData.down} Service${statusData.down > 1 ? 's' : ''} Down`;
    } else if (statusData.degraded > 0) {
        overallStatus = 'degraded';
        overallText = `${statusData.degraded} Service${statusData.degraded > 1 ? 's' : ''} Degraded`;
    } else if (operationalPercent === 100) {
        overallStatus = 'operational';
        overallText = 'All Systems Operational';
    }
    
    document.getElementById('overall-status-dot').className = `status-dot ${overallStatus}`;
    document.getElementById('overall-status-text').textContent = overallText;
}

// Auto-refresh every 60 seconds
let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
        checkAllServices();
    }, 60000); // 60 seconds
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAllServices();
    startAutoRefresh();
});

// Stop auto-refresh when page is hidden (save resources)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
    } else {
        checkAllServices();
        startAutoRefresh();
    }
});
