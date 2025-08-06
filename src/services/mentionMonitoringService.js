/**
 * Mention Monitoring Service for CryptoSentinel
 * Real-time monitoring and alerting system for cryptocurrency mentions
 * 
 * ARCHITECTURE OVERVIEW:
 * =====================
 * 
 * 1. MONITORING LAYERS:
 *    - Frontend: Real-time dashboard updates via WebSocket/SSE
 *    - Service Worker: Background monitoring when app is closed
 *    - Edge Function: Server-side continuous monitoring (Vercel/Netlify)
 *    - Webhook Endpoints: External service integrations
 * 
 * 2. DATA FLOW:
 *    Twitter API → Rate Limiter → Data Processor → Alert Engine → Notification System
 *    
 * 3. STORAGE:
 *    - In-Memory: Active monitoring sessions, rate limits
 *    - LocalStorage: User preferences, cached data
 *    - External DB: Historical data, analytics (optional)
 * 
 * 4. SCALABILITY:
 *    - Horizontal: Multiple edge functions across regions
 *    - Vertical: Batch processing, queue management
 *    - Caching: Multi-layer caching strategy
 */

import twitterService from './twitterService.js';
import sentimentService from './sentimentService.js';
import alertService from './alertService.js';

class MentionMonitoringService {
  constructor() {
    this.activeMonitors = new Map();
    this.monitoringQueue = [];
    this.isProcessing = false;
    this.processingInterval = null;
    this.rateLimitManager = new RateLimitManager();
    this.alertThresholds = new Map();
    this.webhookEndpoints = new Map();
    
    // Configuration
    this.config = {
      maxConcurrentMonitors: 10,
      processingInterval: 30000, // 30 seconds
      batchSize: 5,
      retryAttempts: 3,
      alertCooldown: 300000, // 5 minutes
      dataRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.initializeService();
  }

  /**
   * Initialize the monitoring service
   */
  async initializeService() {
    try {
      await this.loadStoredMonitors();
      await this.startProcessingLoop();
      this.setupServiceWorker();
      console.log('Mention Monitoring Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mention Monitoring Service:', error);
    }
  }

  /**
   * Create a new mention monitor
   */
  async createMonitor(config) {
    const {
      id = this.generateMonitorId(),
      keywords,
      accounts = [],
      alertThresholds = {},
      filters = {},
      webhooks = [],
      isActive = true
    } = config;

    const monitor = {
      id,
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      accounts,
      alertThresholds: {
        mentionSpike: alertThresholds.mentionSpike || 50,
        sentimentChange: alertThresholds.sentimentChange || 0.3,
        volumeIncrease: alertThresholds.volumeIncrease || 100,
        influencerMention: alertThresholds.influencerMention || true,
        ...alertThresholds
      },
      filters: {
        minFollowers: filters.minFollowers || 100,
        minEngagement: filters.minEngagement || 5,
        excludeRetweets: filters.excludeRetweets || false,
        languages: filters.languages || ['en'],
        ...filters
      },
      webhooks,
      isActive,
      createdAt: Date.now(),
      lastProcessed: null,
      stats: {
        totalMentions: 0,
        alertsTriggered: 0,
        avgSentiment: 0,
        lastAlert: null
      },
      data: {
        recentMentions: [],
        sentimentHistory: [],
        volumeHistory: [],
        alertHistory: []
      }
    };

    this.activeMonitors.set(id, monitor);
    await this.saveMonitorToStorage(monitor);
    
    if (isActive) {
      this.addToProcessingQueue(id);
    }

    return monitor;
  }

  /**
   * Update an existing monitor
   */
  async updateMonitor(id, updates) {
    const monitor = this.activeMonitors.get(id);
    if (!monitor) {
      throw new Error(`Monitor ${id} not found`);
    }

    const updatedMonitor = { ...monitor, ...updates, updatedAt: Date.now() };
    this.activeMonitors.set(id, updatedMonitor);
    await this.saveMonitorToStorage(updatedMonitor);

    return updatedMonitor;
  }

  /**
   * Delete a monitor
   */
  async deleteMonitor(id) {
    const monitor = this.activeMonitors.get(id);
    if (!monitor) {
      throw new Error(`Monitor ${id} not found`);
    }

    this.activeMonitors.delete(id);
    this.removeFromProcessingQueue(id);
    await this.removeMonitorFromStorage(id);

    return true;
  }

  /**
   * Get monitor by ID
   */
  getMonitor(id) {
    return this.activeMonitors.get(id);
  }

  /**
   * Get all monitors
   */
  getAllMonitors() {
    return Array.from(this.activeMonitors.values());
  }

  /**
   * Start/stop monitor
   */
  async toggleMonitor(id, isActive) {
    const monitor = await this.updateMonitor(id, { isActive });
    
    if (isActive) {
      this.addToProcessingQueue(id);
    } else {
      this.removeFromProcessingQueue(id);
    }

    return monitor;
  }

  /**
   * Process a single monitor
   */
  async processMonitor(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor || !monitor.isActive) {
      return null;
    }

    try {
      // Check rate limits
      if (!await this.rateLimitManager.canMakeRequest('twitter', monitor.keywords.length)) {
        console.log(`Rate limit reached for monitor ${monitorId}, skipping...`);
        return null;
      }

      const results = {
        monitorId,
        timestamp: Date.now(),
        mentions: [],
        alerts: [],
        sentiment: null,
        volume: 0
      };

      // Fetch mentions for each keyword
      for (const keyword of monitor.keywords) {
        try {
          const mentions = await twitterService.searchMentions(keyword, {
            maxResults: 100,
            startTime: monitor.lastProcessed ? new Date(monitor.lastProcessed).toISOString() : undefined
          });

          if (mentions.tweets && mentions.tweets.length > 0) {
            const filteredMentions = this.filterMentions(mentions.tweets, monitor.filters);
            results.mentions.push(...filteredMentions);
            results.volume += filteredMentions.length;
          }

          // Rate limiting delay
          await this.delay(1000);
        } catch (error) {
          console.error(`Error fetching mentions for keyword ${keyword}:`, error);
        }
      }

      // Analyze sentiment if we have mentions
      if (results.mentions.length > 0) {
        try {
          const sentimentAnalysis = await this.analyzeMentionsSentiment(results.mentions);
          results.sentiment = sentimentAnalysis;
        } catch (error) {
          console.error(`Error analyzing sentiment for monitor ${monitorId}:`, error);
        }
      }

      // Check for alerts
      const alerts = await this.checkAlertConditions(monitor, results);
      results.alerts = alerts;

      // Update monitor data
      await this.updateMonitorData(monitor, results);

      // Send alerts if any
      if (alerts.length > 0) {
        await this.sendAlerts(monitor, alerts);
      }

      return results;
    } catch (error) {
      console.error(`Error processing monitor ${monitorId}:`, error);
      return null;
    }
  }

  /**
   * Filter mentions based on monitor criteria
   */
  filterMentions(mentions, filters) {
    return mentions.filter(mention => {
      // Min followers check
      if (filters.minFollowers && mention.author?.followers_count < filters.minFollowers) {
        return false;
      }

      // Min engagement check
      if (filters.minEngagement && mention.engagement < filters.minEngagement) {
        return false;
      }

      // Exclude retweets
      if (filters.excludeRetweets && mention.text.startsWith('RT @')) {
        return false;
      }

      // Language filter
      if (filters.languages && filters.languages.length > 0) {
        if (!filters.languages.includes(mention.lang)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Analyze sentiment of mentions
   */
  async analyzeMentionsSentiment(mentions) {
    try {
      const texts = mentions.slice(0, 20).map(m => m.text); // Limit to 20 for performance
      const sentimentResults = await Promise.allSettled(
        texts.map(text => sentimentService.analyzeSingleText(text))
      );

      const validResults = sentimentResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      if (validResults.length === 0) {
        return null;
      }

      const avgSentiment = validResults.reduce((sum, result) => sum + (result.sentiment_score || 0), 0) / validResults.length;
      const avgConfidence = validResults.reduce((sum, result) => sum + (result.confidence || 0), 0) / validResults.length;

      return {
        average_sentiment: avgSentiment,
        average_confidence: avgConfidence,
        total_analyzed: validResults.length,
        distribution: this.calculateSentimentDistribution(validResults)
      };
    } catch (error) {
      console.error('Error analyzing mentions sentiment:', error);
      return null;
    }
  }

  /**
   * Calculate sentiment distribution
   */
  calculateSentimentDistribution(results) {
    const distribution = { positive: 0, negative: 0, neutral: 0 };
    
    results.forEach(result => {
      const sentiment = result.sentiment || 'neutral';
      if (sentiment === 'positive' || result.sentiment_score > 0.6) {
        distribution.positive++;
      } else if (sentiment === 'negative' || result.sentiment_score < 0.4) {
        distribution.negative++;
      } else {
        distribution.neutral++;
      }
    });

    const total = results.length;
    return {
      positive: Math.round((distribution.positive / total) * 100),
      negative: Math.round((distribution.negative / total) * 100),
      neutral: Math.round((distribution.neutral / total) * 100)
    };
  }

  /**
   * Check alert conditions
   */
  async checkAlertConditions(monitor, results) {
    const alerts = [];
    const thresholds = monitor.alertThresholds;
    const now = Date.now();

    // Check if we're in cooldown period
    if (monitor.stats.lastAlert && (now - monitor.stats.lastAlert) < this.config.alertCooldown) {
      return alerts;
    }

    // Mention spike alert
    if (thresholds.mentionSpike && results.volume > thresholds.mentionSpike) {
      alerts.push({
        type: 'mention_spike',
        severity: 'high',
        message: `Mention spike detected: ${results.volume} mentions (threshold: ${thresholds.mentionSpike})`,
        data: { volume: results.volume, threshold: thresholds.mentionSpike },
        timestamp: now
      });
    }

    // Sentiment change alert
    if (thresholds.sentimentChange && results.sentiment && monitor.stats.avgSentiment) {
      const sentimentDiff = Math.abs(results.sentiment.average_sentiment - monitor.stats.avgSentiment);
      if (sentimentDiff > thresholds.sentimentChange) {
        alerts.push({
          type: 'sentiment_change',
          severity: 'medium',
          message: `Significant sentiment change detected: ${sentimentDiff.toFixed(2)} change`,
          data: { 
            current: results.sentiment.average_sentiment, 
            previous: monitor.stats.avgSentiment,
            change: sentimentDiff 
          },
          timestamp: now
        });
      }
    }

    // Influencer mention alert
    if (thresholds.influencerMention) {
      const influencerMentions = results.mentions.filter(mention => 
        mention.author?.followers_count > 100000 || mention.author?.verified
      );
      
      if (influencerMentions.length > 0) {
        alerts.push({
          type: 'influencer_mention',
          severity: 'high',
          message: `${influencerMentions.length} influencer mention(s) detected`,
          data: { 
            count: influencerMentions.length,
            influencers: influencerMentions.map(m => ({
              username: m.author?.username,
              followers: m.author?.followers_count,
              text: m.text.substring(0, 100)
            }))
          },
          timestamp: now
        });
      }
    }

    return alerts;
  }

  /**
   * Update monitor data with new results
   */
  async updateMonitorData(monitor, results) {
    // Update stats
    monitor.stats.totalMentions += results.volume;
    monitor.stats.lastProcessed = results.timestamp;
    
    if (results.sentiment) {
      monitor.stats.avgSentiment = results.sentiment.average_sentiment;
    }

    if (results.alerts.length > 0) {
      monitor.stats.alertsTriggered += results.alerts.length;
      monitor.stats.lastAlert = results.timestamp;
    }

    // Update data arrays (keep last 1000 items)
    monitor.data.recentMentions = [
      ...results.mentions.slice(0, 50),
      ...monitor.data.recentMentions
    ].slice(0, 1000);

    if (results.sentiment) {
      monitor.data.sentimentHistory.push({
        timestamp: results.timestamp,
        sentiment: results.sentiment.average_sentiment,
        confidence: results.sentiment.average_confidence
      });
      monitor.data.sentimentHistory = monitor.data.sentimentHistory.slice(-100);
    }

    monitor.data.volumeHistory.push({
      timestamp: results.timestamp,
      volume: results.volume
    });
    monitor.data.volumeHistory = monitor.data.volumeHistory.slice(-100);

    if (results.alerts.length > 0) {
      monitor.data.alertHistory.push(...results.alerts);
      monitor.data.alertHistory = monitor.data.alertHistory.slice(-50);
    }

    // Save to storage
    await this.saveMonitorToStorage(monitor);
  }

  /**
   * Send alerts through configured channels
   */
  async sendAlerts(monitor, alerts) {
    for (const alert of alerts) {
      try {
        // Send through alert service
        await alertService.sendAlert({
          type: alert.type,
          severity: alert.severity,
          title: `Monitor Alert: ${monitor.keywords.join(', ')}`,
          message: alert.message,
          data: alert.data,
          monitorId: monitor.id
        });

        // Send to webhooks
        for (const webhook of monitor.webhooks) {
          await this.sendWebhookAlert(webhook, monitor, alert);
        }
      } catch (error) {
        console.error('Error sending alert:', error);
      }
    }
  }

  /**
   * Send alert to webhook endpoint
   */
  async sendWebhookAlert(webhook, monitor, alert) {
    try {
      const payload = {
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
      console.error(`Webhook alert failed for ${webhook.url}:`, error);
    }
  }

  /**
   * Processing loop management
   */
  async startProcessingLoop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.monitoringQueue.length > 0) {
        await this.processQueue();
      }
    }, this.config.processingInterval);
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const batch = this.monitoringQueue.splice(0, this.config.batchSize);
      const processingPromises = batch.map(monitorId => this.processMonitor(monitorId));
      
      await Promise.allSettled(processingPromises);
      
      // Re-add active monitors to queue
      batch.forEach(monitorId => {
        const monitor = this.activeMonitors.get(monitorId);
        if (monitor && monitor.isActive) {
          this.addToProcessingQueue(monitorId);
        }
      });
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  addToProcessingQueue(monitorId) {
    if (!this.monitoringQueue.includes(monitorId)) {
      this.monitoringQueue.push(monitorId);
    }
  }

  removeFromProcessingQueue(monitorId) {
    const index = this.monitoringQueue.indexOf(monitorId);
    if (index > -1) {
      this.monitoringQueue.splice(index, 1);
    }
  }

  /**
   * Storage management
   */
  async saveMonitorToStorage(monitor) {
    try {
      const key = `monitor_${monitor.id}`;
      localStorage.setItem(key, JSON.stringify(monitor));
    } catch (error) {
      console.error('Error saving monitor to storage:', error);
    }
  }

  async removeMonitorFromStorage(monitorId) {
    try {
      const key = `monitor_${monitorId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing monitor from storage:', error);
    }
  }

  async loadStoredMonitors() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('monitor_'));
      
      for (const key of keys) {
        try {
          const monitor = JSON.parse(localStorage.getItem(key));
          this.activeMonitors.set(monitor.id, monitor);
          
          if (monitor.isActive) {
            this.addToProcessingQueue(monitor.id);
          }
        } catch (error) {
          console.error(`Error loading monitor from ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading stored monitors:', error);
    }
  }

  /**
   * Service Worker setup for background monitoring
   */
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-mention-monitor.js')
        .then(registration => {
          console.log('Mention Monitor Service Worker registered:', registration);
          
          // Send active monitors to service worker
          if (registration.active) {
            registration.active.postMessage({
              type: 'INIT_MONITORS',
              monitors: Array.from(this.activeMonitors.values())
            });
          }
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }

  /**
   * Utility methods
   */
  generateMonitorId() {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const monitors = Array.from(this.activeMonitors.values());
    
    return {
      totalMonitors: monitors.length,
      activeMonitors: monitors.filter(m => m.isActive).length,
      totalMentions: monitors.reduce((sum, m) => sum + m.stats.totalMentions, 0),
      totalAlerts: monitors.reduce((sum, m) => sum + m.stats.alertsTriggered, 0),
      queueSize: this.monitoringQueue.length,
      isProcessing: this.isProcessing,
      rateLimitStatus: this.rateLimitManager.getStatus()
    };
  }

  /**
   * Export/Import monitors
   */
  exportMonitors() {
    return {
      version: '1.0',
      timestamp: Date.now(),
      monitors: Array.from(this.activeMonitors.values())
    };
  }

  async importMonitors(data) {
    if (!data.monitors || !Array.isArray(data.monitors)) {
      throw new Error('Invalid import data');
    }

    for (const monitor of data.monitors) {
      monitor.id = this.generateMonitorId(); // Generate new ID
      await this.createMonitor(monitor);
    }

    return data.monitors.length;
  }
}

/**
 * Rate Limit Manager
 */
class RateLimitManager {
  constructor() {
    this.limits = new Map();
    this.resetInterval = 15 * 60 * 1000; // 15 minutes
    
    // Twitter API v2 rate limits
    this.rateLimits = {
      twitter: {
        requests: 300,
        window: 15 * 60 * 1000, // 15 minutes
        current: 0,
        resetTime: Date.now() + this.resetInterval
      }
    };
  }

  async canMakeRequest(service, requestCount = 1) {
    const limit = this.rateLimits[service];
    if (!limit) return true;

    // Reset if window expired
    if (Date.now() > limit.resetTime) {
      limit.current = 0;
      limit.resetTime = Date.now() + limit.window;
    }

    // Check if we can make the request
    if (limit.current + requestCount <= limit.requests) {
      limit.current += requestCount;
      return true;
    }

    return false;
  }

  getStatus() {
    const status = {};
    
    for (const [service, limit] of Object.entries(this.rateLimits)) {
      status[service] = {
        remaining: Math.max(0, limit.requests - limit.current),
        resetTime: limit.resetTime,
        resetIn: Math.max(0, limit.resetTime - Date.now())
      };
    }

    return status;
  }
}

export default new MentionMonitoringService();
