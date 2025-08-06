/**
 * Real-time Alert Service for CryptoSentinel
 * Manages mention alerts, sentiment alerts, and notification delivery
 */

import twitterService from './twitterService.js';
import sentimentService from './sentimentService.js';

class AlertService {
  constructor() {
    this.alerts = new Map();
    this.activeMonitors = new Map();
    this.notificationQueue = [];
    this.isProcessing = false;
    this.checkInterval = 60000; // 1 minute
    this.maxRetries = 3;
    
    // Initialize with localStorage persistence
    this.loadAlertsFromStorage();
    this.startMonitoring();
  }

  /**
   * Create a new alert
   */
  async createAlert(alertConfig) {
    const alert = {
      id: this.generateAlertId(),
      ...alertConfig,
      status: 'active',
      created: new Date().toISOString(),
      triggered: 0,
      lastTriggered: null,
      lastChecked: null
    };

    // Validate alert configuration
    const validation = this.validateAlert(alert);
    if (!validation.valid) {
      throw new Error(`Invalid alert configuration: ${validation.errors.join(', ')}`);
    }

    this.alerts.set(alert.id, alert);
    this.saveAlertsToStorage();

    // Start monitoring if alert is active
    if (alert.status === 'active') {
      await this.startAlertMonitoring(alert);
    }

    return alert;
  }

  /**
   * Update existing alert
   */
  async updateAlert(alertId, updates) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const updatedAlert = { ...alert, ...updates, updated: new Date().toISOString() };
    
    // Validate updated configuration
    const validation = this.validateAlert(updatedAlert);
    if (!validation.valid) {
      throw new Error(`Invalid alert configuration: ${validation.errors.join(', ')}`);
    }

    this.alerts.set(alertId, updatedAlert);
    this.saveAlertsToStorage();

    // Restart monitoring with new configuration
    await this.stopAlertMonitoring(alertId);
    if (updatedAlert.status === 'active') {
      await this.startAlertMonitoring(updatedAlert);
    }

    return updatedAlert;
  }

  /**
   * Delete alert
   */
  async deleteAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    await this.stopAlertMonitoring(alertId);
    this.alerts.delete(alertId);
    this.saveAlertsToStorage();

    return true;
  }

  /**
   * Get all alerts
   */
  getAllAlerts() {
    return Array.from(this.alerts.values()).sort((a, b) => 
      new Date(b.created) - new Date(a.created)
    );
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId) {
    return this.alerts.get(alertId);
  }

  /**
   * Start monitoring for a specific alert
   */
  async startAlertMonitoring(alert) {
    if (this.activeMonitors.has(alert.id)) {
      return; // Already monitoring
    }

    const monitor = {
      alert,
      intervalId: setInterval(async () => {
        await this.checkAlert(alert.id);
      }, this.checkInterval),
      lastCheck: Date.now()
    };

    this.activeMonitors.set(alert.id, monitor);
    console.log(`Started monitoring alert: ${alert.id} (${alert.type})`);
  }

  /**
   * Stop monitoring for a specific alert
   */
  async stopAlertMonitoring(alertId) {
    const monitor = this.activeMonitors.get(alertId);
    if (monitor) {
      clearInterval(monitor.intervalId);
      this.activeMonitors.delete(alertId);
      console.log(`Stopped monitoring alert: ${alertId}`);
    }
  }

  /**
   * Check if alert conditions are met
   */
  async checkAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return;
    }

    try {
      alert.lastChecked = new Date().toISOString();
      let shouldTrigger = false;
      let triggerData = null;

      switch (alert.type) {
        case 'mention_increase':
          ({ shouldTrigger, triggerData } = await this.checkMentionIncrease(alert));
          break;
        case 'sentiment_change':
          ({ shouldTrigger, triggerData } = await this.checkSentimentChange(alert));
          break;
        case 'new_mention':
          ({ shouldTrigger, triggerData } = await this.checkNewMention(alert));
          break;
        case 'influencer_mention':
          ({ shouldTrigger, triggerData } = await this.checkInfluencerMention(alert));
          break;
        case 'volume_spike':
          ({ shouldTrigger, triggerData } = await this.checkVolumeSpike(alert));
          break;
        default:
          console.warn(`Unknown alert type: ${alert.type}`);
          return;
      }

      if (shouldTrigger) {
        await this.triggerAlert(alert, triggerData);
      }

      // Update alert in storage
      this.alerts.set(alertId, alert);
      this.saveAlertsToStorage();

    } catch (error) {
      console.error(`Error checking alert ${alertId}:`, error);
      alert.lastError = error.message;
      alert.lastErrorTime = new Date().toISOString();
    }
  }

  /**
   * Check for mention increase
   */
  async checkMentionIncrease(alert) {
    const { project, threshold } = alert.config;
    const thresholdPercent = parseFloat(threshold) / 100;

    // Get current mentions
    const currentMentions = await twitterService.searchMentions(project, {
      maxResults: 100,
      startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() // Last hour
    });

    // Get baseline mentions (previous hour)
    const baselineMentions = await twitterService.searchMentions(project, {
      maxResults: 100,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    });

    const currentCount = currentMentions.tweets.length;
    const baselineCount = baselineMentions.tweets.length;
    const increase = baselineCount > 0 ? (currentCount - baselineCount) / baselineCount : 0;

    const shouldTrigger = increase >= thresholdPercent;

    return {
      shouldTrigger,
      triggerData: {
        current_mentions: currentCount,
        baseline_mentions: baselineCount,
        increase_percent: Math.round(increase * 100),
        threshold_percent: Math.round(thresholdPercent * 100)
      }
    };
  }

  /**
   * Check for sentiment changes
   */
  async checkSentimentChange(alert) {
    const { project, threshold, direction } = alert.config;
    const thresholdValue = parseFloat(threshold);

    const sentiment = await sentimentService.analyzeProjectSentiment(project, {
      timeframe: '1h',
      sampleSize: 50
    });

    let shouldTrigger = false;
    const currentScore = sentiment.sentiment_score * 100; // Convert to percentage

    if (direction === 'positive' && currentScore >= thresholdValue) {
      shouldTrigger = true;
    } else if (direction === 'negative' && currentScore <= -thresholdValue) {
      shouldTrigger = true;
    } else if (direction === 'any' && Math.abs(currentScore) >= thresholdValue) {
      shouldTrigger = true;
    }

    return {
      shouldTrigger,
      triggerData: {
        current_sentiment: sentiment.overall_sentiment,
        sentiment_score: currentScore,
        confidence: sentiment.confidence,
        threshold: thresholdValue,
        direction
      }
    };
  }

  /**
   * Check for new mentions
   */
  async checkNewMention(alert) {
    const { project, threshold } = alert.config;
    const minMentions = parseInt(threshold);

    const mentions = await twitterService.searchMentions(project, {
      maxResults: 100,
      startTime: new Date(Date.now() - this.checkInterval).toISOString()
    });

    const shouldTrigger = mentions.tweets.length >= minMentions;

    return {
      shouldTrigger,
      triggerData: {
        new_mentions: mentions.tweets.length,
        threshold: minMentions,
        top_mentions: mentions.tweets.slice(0, 3).map(tweet => ({
          text: tweet.text.substring(0, 100) + '...',
          author: tweet.author.username,
          engagement: tweet.engagement
        }))
      }
    };
  }

  /**
   * Check for influencer mentions
   */
  async checkInfluencerMention(alert) {
    const { project } = alert.config;

    const mentions = await twitterService.monitorHighSignalAccounts([project]);
    const shouldTrigger = mentions.length > 0;

    return {
      shouldTrigger,
      triggerData: {
        influencer_mentions: mentions.length,
        mentions: mentions.slice(0, 3).map(mention => ({
          text: mention.text.substring(0, 100) + '...',
          account_weight: mention.account_weight,
          account_category: mention.account_category
        }))
      }
    };
  }

  /**
   * Check for volume spikes
   */
  async checkVolumeSpike(alert) {
    const { project, threshold } = alert.config;
    const thresholdPercent = parseFloat(threshold) / 100;

    // Get current volume (last hour)
    const currentMentions = await twitterService.searchMentions(project, {
      maxResults: 100,
      startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    });

    // Calculate average volume over last 24 hours
    const historicalMentions = await twitterService.searchMentions(project, {
      maxResults: 100,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });

    const currentVolume = currentMentions.tweets.length;
    const averageVolume = historicalMentions.tweets.length / 24; // Per hour average
    const spike = averageVolume > 0 ? (currentVolume - averageVolume) / averageVolume : 0;

    const shouldTrigger = spike >= thresholdPercent;

    return {
      shouldTrigger,
      triggerData: {
        current_volume: currentVolume,
        average_volume: Math.round(averageVolume),
        spike_percent: Math.round(spike * 100),
        threshold_percent: Math.round(thresholdPercent * 100)
      }
    };
  }

  /**
   * Trigger alert and send notification
   */
  async triggerAlert(alert, triggerData) {
    alert.triggered += 1;
    alert.lastTriggered = new Date().toISOString();

    const notification = {
      id: this.generateNotificationId(),
      alertId: alert.id,
      type: alert.type,
      project: alert.config.project,
      title: this.generateAlertTitle(alert, triggerData),
      message: this.generateAlertMessage(alert, triggerData),
      data: triggerData,
      timestamp: new Date().toISOString(),
      delivered: false,
      retries: 0
    };

    // Add to notification queue
    this.notificationQueue.push(notification);

    // Process notifications
    if (!this.isProcessing) {
      this.processNotificationQueue();
    }

    console.log(`Alert triggered: ${alert.id} - ${notification.title}`);
  }

  /**
   * Generate alert title
   */
  generateAlertTitle(alert, triggerData) {
    const { project } = alert.config;
    
    switch (alert.type) {
      case 'mention_increase':
        return `${project} Mentions Increased by ${triggerData.increase_percent}%`;
      case 'sentiment_change':
        return `${project} Sentiment Alert: ${triggerData.current_sentiment.toUpperCase()}`;
      case 'new_mention':
        return `${project} New Mentions: ${triggerData.new_mentions}`;
      case 'influencer_mention':
        return `${project} Mentioned by Influencers`;
      case 'volume_spike':
        return `${project} Volume Spike: +${triggerData.spike_percent}%`;
      default:
        return `${project} Alert Triggered`;
    }
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(alert, triggerData) {
    const { project } = alert.config;
    
    switch (alert.type) {
      case 'mention_increase':
        return `${project} mentions increased from ${triggerData.baseline_mentions} to ${triggerData.current_mentions} (${triggerData.increase_percent}% increase)`;
      case 'sentiment_change':
        return `${project} sentiment is now ${triggerData.current_sentiment} with a score of ${triggerData.sentiment_score}% (confidence: ${Math.round(triggerData.confidence * 100)}%)`;
      case 'new_mention':
        return `${project} has ${triggerData.new_mentions} new mentions in the last hour`;
      case 'influencer_mention':
        return `${project} was mentioned by ${triggerData.influencer_mentions} high-signal accounts`;
      case 'volume_spike':
        return `${project} mention volume spiked to ${triggerData.current_volume} (${triggerData.spike_percent}% above average)`;
      default:
        return `Alert triggered for ${project}`;
    }
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue() {
    if (this.isProcessing || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      
      try {
        await this.deliverNotification(notification);
        notification.delivered = true;
      } catch (error) {
        console.error(`Failed to deliver notification ${notification.id}:`, error);
        notification.retries += 1;
        
        if (notification.retries < this.maxRetries) {
          // Re-queue for retry
          this.notificationQueue.push(notification);
        }
      }

      // Rate limiting
      await this.delay(100);
    }

    this.isProcessing = false;
  }

  /**
   * Deliver notification based on method
   */
  async deliverNotification(notification) {
    const alert = this.alerts.get(notification.alertId);
    if (!alert) return;

    const { notificationMethod } = alert.config;

    switch (notificationMethod) {
      case 'browser':
        await this.sendBrowserNotification(notification);
        break;
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'webhook':
        await this.sendWebhookNotification(notification);
        break;
      case 'console':
      default:
        console.log(`🚨 ALERT: ${notification.title} - ${notification.message}`);
        break;
    }
  }

  /**
   * Send browser notification
   */
  async sendBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/crypto-icon.png',
        tag: notification.alertId
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/crypto-icon.png',
          tag: notification.alertId
        });
      }
    }
  }

  /**
   * Send email notification (placeholder)
   */
  async sendEmailNotification(notification) {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Email notification: ${notification.title}`);
    console.log(`To: user@example.com`);
    console.log(`Message: ${notification.message}`);
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(notification) {
    const alert = this.alerts.get(notification.alertId);
    const webhookUrl = alert.config.webhookUrl;
    
    if (!webhookUrl) return;

    const payload = {
      alert_id: notification.alertId,
      type: notification.type,
      project: notification.project,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.timestamp
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`);
    }
  }

  /**
   * Validate alert configuration
   */
  validateAlert(alert) {
    const errors = [];

    if (!alert.type) {
      errors.push('Alert type is required');
    }

    if (!alert.config || !alert.config.project) {
      errors.push('Project is required');
    }

    if (!alert.config.notificationMethod) {
      errors.push('Notification method is required');
    }

    // Type-specific validations
    switch (alert.type) {
      case 'mention_increase':
      case 'volume_spike':
        if (!alert.config.threshold || isNaN(parseFloat(alert.config.threshold))) {
          errors.push('Valid threshold percentage is required');
        }
        break;
      case 'sentiment_change':
        if (!alert.config.threshold || isNaN(parseFloat(alert.config.threshold))) {
          errors.push('Valid threshold value is required');
        }
        if (!['positive', 'negative', 'any'].includes(alert.config.direction)) {
          errors.push('Valid direction (positive/negative/any) is required');
        }
        break;
      case 'new_mention':
        if (!alert.config.threshold || isNaN(parseInt(alert.config.threshold))) {
          errors.push('Valid mention count threshold is required');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Start global monitoring system
   */
  startMonitoring() {
    // Start monitoring for all active alerts
    this.alerts.forEach(alert => {
      if (alert.status === 'active') {
        this.startAlertMonitoring(alert);
      }
    });

    console.log(`Alert monitoring started for ${this.activeMonitors.size} alerts`);
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring() {
    this.activeMonitors.forEach((monitor, alertId) => {
      this.stopAlertMonitoring(alertId);
    });
    console.log('All alert monitoring stopped');
  }

  /**
   * Utility functions
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Persistence methods
   */
  saveAlertsToStorage() {
    try {
      const alertsArray = Array.from(this.alerts.entries());
      localStorage.setItem('cryptosentinel_alerts', JSON.stringify(alertsArray));
    } catch (error) {
      console.error('Failed to save alerts to storage:', error);
    }
  }

  loadAlertsFromStorage() {
    try {
      const stored = localStorage.getItem('cryptosentinel_alerts');
      if (stored) {
        const alertsArray = JSON.parse(stored);
        this.alerts = new Map(alertsArray);
      }
    } catch (error) {
      console.error('Failed to load alerts from storage:', error);
      this.alerts = new Map();
    }
  }
}

export default new AlertService();

