/**
 * Comprehensive Monitoring Service for CryptoSentinel
 * Orchestrates high-signal account monitoring, project tracking, and real-time insights
 */

import twitterService from './twitterService.js';
import sentimentService from './sentimentService.js';
import alertService from './alertService.js';

class MonitoringService {
  constructor() {
    this.monitoredProjects = new Map();
    this.highSignalAccounts = new Map();
    this.monitoringInterval = 5 * 60 * 1000; // 5 minutes
    this.isMonitoring = false;
    this.monitoringIntervalId = null;
    this.dataCache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
    
    this.initializeDefaultProjects();
  }

  /**
   * Initialize with default crypto projects to monitor
   */
  initializeDefaultProjects() {
    const defaultProjects = [
      { 
        symbol: 'BTC', 
        name: 'Bitcoin', 
        priority: 'high',
        keywords: ['bitcoin', 'btc', '$btc', '#bitcoin']
      },
      { 
        symbol: 'ETH', 
        name: 'Ethereum', 
        priority: 'high',
        keywords: ['ethereum', 'eth', '$eth', '#ethereum']
      },
      { 
        symbol: 'SOL', 
        name: 'Solana', 
        priority: 'medium',
        keywords: ['solana', 'sol', '$sol', '#solana']
      },
      { 
        symbol: 'ADA', 
        name: 'Cardano', 
        priority: 'medium',
        keywords: ['cardano', 'ada', '$ada', '#cardano']
      },
      { 
        symbol: 'MATIC', 
        name: 'Polygon', 
        priority: 'medium',
        keywords: ['polygon', 'matic', '$matic', '#polygon']
      }
    ];

    defaultProjects.forEach(project => {
      this.monitoredProjects.set(project.symbol, {
        ...project,
        added: new Date().toISOString(),
        status: 'active',
        lastUpdate: null,
        metrics: {
          totalMentions: 0,
          sentimentScore: 0,
          influencerMentions: 0,
          trendDirection: 'stable'
        }
      });
    });
  }

  /**
   * Start comprehensive monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting CryptoSentinel monitoring...');

    // Initial data collection
    await this.performMonitoringCycle();

    // Set up recurring monitoring
    this.monitoringIntervalId = setInterval(async () => {
      await this.performMonitoringCycle();
    }, this.monitoringInterval);

    console.log(`✅ Monitoring started for ${this.monitoredProjects.size} projects`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringIntervalId) {
      clearInterval(this.monitoringIntervalId);
      this.monitoringIntervalId = null;
    }

    console.log('🛑 Monitoring stopped');
  }

  /**
   * Perform a complete monitoring cycle
   */
  async performMonitoringCycle() {
    console.log('🔄 Starting monitoring cycle...');
    
    try {
      // 1. Update high-signal accounts
      await this.updateHighSignalAccounts();

      // 2. Monitor each project
      const monitoringPromises = Array.from(this.monitoredProjects.values())
        .filter(project => project.status === 'active')
        .map(project => this.monitorProject(project));

      await Promise.allSettled(monitoringPromises);

      // 3. Generate market insights
      await this.generateMarketOverview();

      // 4. Check for emerging trends
      await this.detectEmergingTrends();

      console.log('✅ Monitoring cycle completed');

    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error);
    }
  }

  /**
   * Monitor a specific project
   */
  async monitorProject(project) {
    try {
      console.log(`📊 Monitoring ${project.name} (${project.symbol})`);

      // Get recent mentions
      const mentions = await twitterService.searchMentions(project.name, {
        maxResults: 100,
        startTime: new Date(Date.now() - this.monitoringInterval).toISOString()
      });

      // Analyze sentiment
      const sentiment = await sentimentService.analyzeProjectSentiment(project.name, {
        timeframe: '1h',
        sampleSize: 50
      });

      // Check for influencer mentions
      const influencerMentions = await twitterService.monitorHighSignalAccounts([project.symbol]);

      // Update project metrics
      const updatedProject = {
        ...project,
        lastUpdate: new Date().toISOString(),
        metrics: {
          totalMentions: mentions.tweets.length,
          sentimentScore: sentiment.sentiment_score,
          influencerMentions: influencerMentions.length,
          trendDirection: sentiment.trend_analysis.direction,
          confidence: sentiment.confidence,
          engagement: this.calculateAverageEngagement(mentions.tweets)
        },
        recentData: {
          mentions: mentions.tweets.slice(0, 5),
          sentiment: sentiment,
          influencerActivity: influencerMentions.slice(0, 3)
        }
      };

      this.monitoredProjects.set(project.symbol, updatedProject);

      // Cache the data
      this.cacheProjectData(project.symbol, updatedProject);

      console.log(`✅ ${project.name}: ${mentions.tweets.length} mentions, sentiment: ${sentiment.overall_sentiment}`);

    } catch (error) {
      console.error(`❌ Error monitoring ${project.name}:`, error);
    }
  }

  /**
   * Update high-signal accounts data
   */
  async updateHighSignalAccounts() {
    try {
      const accounts = await twitterService.getHighSignalAccounts();
      
      for (const account of accounts) {
        this.highSignalAccounts.set(account.username, {
          ...account,
          lastUpdate: new Date().toISOString(),
          recentActivity: []
        });
      }

      console.log(`📡 Updated ${accounts.length} high-signal accounts`);
    } catch (error) {
      console.error('❌ Error updating high-signal accounts:', error);
    }
  }

  /**
   * Generate market overview
   */
  async generateMarketOverview() {
    try {
      const projects = Array.from(this.monitoredProjects.values());
      const activeProjects = projects.filter(p => p.status === 'active' && p.lastUpdate);

      if (activeProjects.length === 0) {
        return null;
      }

      // Calculate market-wide metrics
      const totalMentions = activeProjects.reduce((sum, p) => sum + p.metrics.totalMentions, 0);
      const avgSentiment = activeProjects.reduce((sum, p) => sum + p.metrics.sentimentScore, 0) / activeProjects.length;
      const totalInfluencerMentions = activeProjects.reduce((sum, p) => sum + p.metrics.influencerMentions, 0);

      // Identify top performers
      const topByMentions = [...activeProjects]
        .sort((a, b) => b.metrics.totalMentions - a.metrics.totalMentions)
        .slice(0, 3);

      const topBySentiment = [...activeProjects]
        .sort((a, b) => b.metrics.sentimentScore - a.metrics.sentimentScore)
        .slice(0, 3);

      const marketOverview = {
        timestamp: new Date().toISOString(),
        summary: {
          totalProjects: activeProjects.length,
          totalMentions,
          averageSentiment: Math.round(avgSentiment * 100) / 100,
          totalInfluencerMentions,
          marketMood: this.determineMarketMood(avgSentiment)
        },
        topPerformers: {
          byMentions: topByMentions.map(p => ({
            symbol: p.symbol,
            name: p.name,
            mentions: p.metrics.totalMentions
          })),
          bySentiment: topBySentiment.map(p => ({
            symbol: p.symbol,
            name: p.name,
            sentiment: p.metrics.sentimentScore
          }))
        },
        trends: {
          improving: activeProjects.filter(p => p.metrics.trendDirection === 'improving').length,
          declining: activeProjects.filter(p => p.metrics.trendDirection === 'declining').length,
          stable: activeProjects.filter(p => p.metrics.trendDirection === 'stable').length
        }
      };

      this.cacheData('market_overview', marketOverview);
      console.log(`📈 Market overview: ${totalMentions} mentions, sentiment: ${marketOverview.summary.marketMood}`);

      return marketOverview;

    } catch (error) {
      console.error('❌ Error generating market overview:', error);
      return null;
    }
  }

  /**
   * Detect emerging trends and new projects
   */
  async detectEmergingTrends() {
    try {
      // Get trending topics from Twitter
      const trendingTopics = await twitterService.getTrendingTopics();
      
      // Filter for crypto-related trends
      const cryptoTrends = trendingTopics.filter(topic => 
        this.isCryptoRelated(topic.topic)
      );

      // Look for new project mentions
      const newProjects = await this.identifyNewProjects(cryptoTrends);

      const emergingTrends = {
        timestamp: new Date().toISOString(),
        cryptoTrends: cryptoTrends.slice(0, 10),
        newProjects: newProjects.slice(0, 5),
        recommendations: this.generateTrendRecommendations(cryptoTrends, newProjects)
      };

      this.cacheData('emerging_trends', emergingTrends);
      console.log(`🔍 Detected ${cryptoTrends.length} crypto trends, ${newProjects.length} new projects`);

      return emergingTrends;

    } catch (error) {
      console.error('❌ Error detecting emerging trends:', error);
      return null;
    }
  }

  /**
   * Add a new project to monitoring
   */
  async addProject(projectConfig) {
    const { symbol, name, priority = 'medium', keywords = [] } = projectConfig;

    if (this.monitoredProjects.has(symbol)) {
      throw new Error(`Project ${symbol} is already being monitored`);
    }

    const project = {
      symbol: symbol.toUpperCase(),
      name,
      priority,
      keywords: keywords.length > 0 ? keywords : [name.toLowerCase(), symbol.toLowerCase()],
      added: new Date().toISOString(),
      status: 'active',
      lastUpdate: null,
      metrics: {
        totalMentions: 0,
        sentimentScore: 0,
        influencerMentions: 0,
        trendDirection: 'stable'
      }
    };

    this.monitoredProjects.set(symbol, project);

    // If monitoring is active, start monitoring this project immediately
    if (this.isMonitoring) {
      await this.monitorProject(project);
    }

    console.log(`➕ Added ${name} (${symbol}) to monitoring`);
    return project;
  }

  /**
   * Remove a project from monitoring
   */
  removeProject(symbol) {
    const project = this.monitoredProjects.get(symbol);
    if (!project) {
      throw new Error(`Project ${symbol} not found`);
    }

    this.monitoredProjects.delete(symbol);
    this.clearProjectCache(symbol);

    console.log(`➖ Removed ${project.name} (${symbol}) from monitoring`);
    return true;
  }

  /**
   * Get monitoring status and statistics
   */
  getMonitoringStatus() {
    const projects = Array.from(this.monitoredProjects.values());
    const activeProjects = projects.filter(p => p.status === 'active');
    const recentlyUpdated = projects.filter(p => 
      p.lastUpdate && (Date.now() - new Date(p.lastUpdate).getTime()) < this.monitoringInterval * 2
    );

    return {
      isMonitoring: this.isMonitoring,
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      recentlyUpdated: recentlyUpdated.length,
      highSignalAccounts: this.highSignalAccounts.size,
      lastCycle: this.getLastCycleTime(),
      nextCycle: this.getNextCycleTime(),
      cacheSize: this.dataCache.size
    };
  }

  /**
   * Get all monitored projects
   */
  getMonitoredProjects() {
    return Array.from(this.monitoredProjects.values())
      .sort((a, b) => {
        // Sort by priority, then by last update
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        const aTime = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
        const bTime = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
        return bTime - aTime;
      });
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    const cached = this.dataCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.dataCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Utility methods
   */
  calculateAverageEngagement(tweets) {
    if (!tweets.length) return 0;
    return tweets.reduce((sum, tweet) => sum + tweet.engagement, 0) / tweets.length;
  }

  determineMarketMood(avgSentiment) {
    if (avgSentiment > 0.3) return 'bullish';
    if (avgSentiment < -0.3) return 'bearish';
    return 'neutral';
  }

  isCryptoRelated(topic) {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain',
      'defi', 'nft', 'web3', 'solana', 'cardano', 'polygon',
      'trading', 'hodl', 'altcoin', 'memecoin'
    ];
    
    return cryptoKeywords.some(keyword => 
      topic.toLowerCase().includes(keyword)
    );
  }

  async identifyNewProjects(trends) {
    // In production, this would use more sophisticated analysis
    const potentialProjects = trends
      .filter(trend => trend.topic.startsWith('$') || trend.topic.includes('coin'))
      .map(trend => ({
        name: trend.topic,
        volume: trend.volume,
        sentiment: trend.sentiment,
        confidence: 0.6 // Placeholder
      }));

    return potentialProjects;
  }

  generateTrendRecommendations(trends, newProjects) {
    const recommendations = [];

    if (trends.length > 0) {
      recommendations.push({
        type: 'trending',
        message: `${trends[0].topic} is trending with high volume`,
        action: 'Consider monitoring this topic'
      });
    }

    if (newProjects.length > 0) {
      recommendations.push({
        type: 'new_project',
        message: `New project detected: ${newProjects[0].name}`,
        action: 'Research and consider adding to watchlist'
      });
    }

    return recommendations;
  }

  cacheProjectData(symbol, data) {
    this.cacheData(`project_${symbol}`, data);
  }

  clearProjectCache(symbol) {
    this.dataCache.delete(`project_${symbol}`);
  }

  cacheData(key, data) {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getLastCycleTime() {
    // Get the most recent lastUpdate from any project
    const projects = Array.from(this.monitoredProjects.values());
    const lastUpdates = projects
      .map(p => p.lastUpdate)
      .filter(Boolean)
      .map(date => new Date(date).getTime());
    
    return lastUpdates.length > 0 ? new Date(Math.max(...lastUpdates)).toISOString() : null;
  }

  getNextCycleTime() {
    if (!this.isMonitoring) return null;
    
    const lastCycle = this.getLastCycleTime();
    if (!lastCycle) return new Date(Date.now() + this.monitoringInterval).toISOString();
    
    return new Date(new Date(lastCycle).getTime() + this.monitoringInterval).toISOString();
  }
}

export default new MonitoringService();

