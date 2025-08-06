/**
 * Service Worker for CryptoSentinel Mention Monitoring
 * Enables background monitoring when the app is closed
 */

const CACHE_NAME = 'cryptosentinel-monitor-v1';
const MONITORING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_BACKGROUND_TIME = 30 * 60 * 1000; // 30 minutes

let activeMonitors = new Map();
let monitoringTimer = null;
let backgroundStartTime = null;

// Install event
self.addEventListener('install', (event) => {
  console.log('Mention Monitor Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Mention Monitor Service Worker activated');
  event.waitUntil(clients.claim());
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'INIT_MONITORS':
      initializeMonitors(data.monitors);
      break;
    case 'START_MONITORING':
      startBackgroundMonitoring();
      break;
    case 'STOP_MONITORING':
      stopBackgroundMonitoring();
      break;
    case 'UPDATE_MONITOR':
      updateMonitor(data.monitor);
      break;
    case 'REMOVE_MONITOR':
      removeMonitor(data.monitorId);
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Background sync for monitoring
self.addEventListener('sync', (event) => {
  if (event.tag === 'mention-monitoring') {
    event.waitUntil(performBackgroundMonitoring());
  }
});

// Push notifications for alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'mention-alert',
      data: data,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'CryptoSentinel Alert', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/alerts')
    );
  }
});

/**
 * Initialize monitors from main thread
 */
function initializeMonitors(monitors) {
  activeMonitors.clear();
  
  monitors.forEach(monitor => {
    if (monitor.isActive) {
      activeMonitors.set(monitor.id, {
        ...monitor,
        lastBackgroundCheck: null
      });
    }
  });
  
  console.log(`Initialized ${activeMonitors.size} active monitors`);
}

/**
 * Start background monitoring
 */
function startBackgroundMonitoring() {
  if (monitoringTimer) {
    clearInterval(monitoringTimer);
  }
  
  backgroundStartTime = Date.now();
  
  monitoringTimer = setInterval(async () => {
    // Stop monitoring after max background time
    if (Date.now() - backgroundStartTime > MAX_BACKGROUND_TIME) {
      stopBackgroundMonitoring();
      return;
    }
    
    await performBackgroundMonitoring();
  }, MONITORING_INTERVAL);
  
  console.log('Background monitoring started');
}

/**
 * Stop background monitoring
 */
function stopBackgroundMonitoring() {
  if (monitoringTimer) {
    clearInterval(monitoringTimer);
    monitoringTimer = null;
  }
  
  backgroundStartTime = null;
  console.log('Background monitoring stopped');
}

/**
 * Perform background monitoring check
 */
async function performBackgroundMonitoring() {
  if (activeMonitors.size === 0) {
    return;
  }
  
  console.log(`Performing background monitoring for ${activeMonitors.size} monitors`);
  
  for (const [monitorId, monitor] of activeMonitors) {
    try {
      await processMonitorInBackground(monitor);
    } catch (error) {
      console.error(`Background monitoring error for ${monitorId}:`, error);
    }
  }
}

/**
 * Process a single monitor in background
 */
async function processMonitorInBackground(monitor) {
  const now = Date.now();
  const timeSinceLastCheck = monitor.lastBackgroundCheck ? now - monitor.lastBackgroundCheck : MONITORING_INTERVAL;
  
  // Skip if checked recently
  if (timeSinceLastCheck < MONITORING_INTERVAL) {
    return;
  }
  
  try {
    // Simplified monitoring for background
    const results = await performLightweightMonitoring(monitor);
    
    if (results && results.alerts.length > 0) {
      await sendBackgroundAlerts(monitor, results.alerts);
    }
    
    // Update last check time
    monitor.lastBackgroundCheck = now;
    
  } catch (error) {
    console.error(`Error in background monitoring for ${monitor.id}:`, error);
  }
}

/**
 * Lightweight monitoring for background operation
 */
async function performLightweightMonitoring(monitor) {
  // This is a simplified version that focuses on critical alerts only
  // Full monitoring happens in the main thread
  
  const results = {
    monitorId: monitor.id,
    timestamp: Date.now(),
    alerts: [],
    volume: 0
  };
  
  // Check for high-priority conditions only
  // In a real implementation, you'd make API calls here
  // For now, we'll simulate based on stored data
  
  const mockMentionCount = Math.floor(Math.random() * 100);
  results.volume = mockMentionCount;
  
  // Check for mention spikes (simplified)
  if (mockMentionCount > monitor.alertThresholds.mentionSpike) {
    results.alerts.push({
      type: 'mention_spike',
      severity: 'high',
      message: `Background alert: ${mockMentionCount} mentions detected`,
      timestamp: results.timestamp
    });
  }
  
  return results;
}

/**
 * Send alerts from background monitoring
 */
async function sendBackgroundAlerts(monitor, alerts) {
  for (const alert of alerts) {
    try {
      // Send push notification
      await self.registration.showNotification(
        `CryptoSentinel: ${monitor.keywords.join(', ')}`,
        {
          body: alert.message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: `alert-${monitor.id}`,
          data: {
            monitorId: monitor.id,
            alert: alert
          },
          actions: [
            {
              action: 'view',
              title: 'View Details'
            }
          ]
        }
      );
      
      // Send to webhooks if configured
      for (const webhook of monitor.webhooks || []) {
        await sendWebhookFromBackground(webhook, monitor, alert);
      }
      
    } catch (error) {
      console.error('Error sending background alert:', error);
    }
  }
}

/**
 * Send webhook from background
 */
async function sendWebhookFromBackground(webhook, monitor, alert) {
  try {
    const payload = {
      source: 'background_monitoring',
      monitor: {
        id: monitor.id,
        keywords: monitor.keywords
      },
      alert,
      timestamp: Date.now()
    };
    
    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webhook.headers
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error(`Background webhook failed for ${webhook.url}:`, error);
  }
}

/**
 * Update monitor configuration
 */
function updateMonitor(monitor) {
  if (activeMonitors.has(monitor.id)) {
    activeMonitors.set(monitor.id, {
      ...monitor,
      lastBackgroundCheck: activeMonitors.get(monitor.id).lastBackgroundCheck
    });
  }
}

/**
 * Remove monitor
 */
function removeMonitor(monitorId) {
  activeMonitors.delete(monitorId);
}

/**
 * Handle fetch events (for caching)
 */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for monitoring-related resources
  if (event.request.method === 'GET' && 
      (event.request.url.includes('/api/') || 
       event.request.url.includes('twitter.com') ||
       event.request.url.includes('coingecko.com'))) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Return cached response and update in background
            fetch(event.request).then(fetchResponse => {
              cache.put(event.request, fetchResponse.clone());
            }).catch(() => {
              // Ignore fetch errors in background
            });
            return response;
          }
          
          // Fetch and cache
          return fetch(event.request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
  }
});

console.log('Mention Monitor Service Worker loaded');
