/**
 * Advanced Sentiment Analysis Service for CryptoSentinel
 * Provides comprehensive sentiment analysis with multiple data sources
 */

import { analyzeSentiment } from './aiService.js';
import twitterService from './twitterService.js';

class SentimentService {
  constructor() {
    this.sentimentCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.batchSize = 50;
    this.sentimentWeights = {
      'very_positive': 1.0,
      'positive': 0.6,
      'neutral': 0.0,
      'negative': -0.6,
      'very_negative': -1.0
    };
  }

  /**
   * Analyze sentiment for a specific crypto project
   */
  async analyzeProjectSentiment(project, options = {}) {
    const {
      timeframe = '24h',
      includeInfluencers = true,
      minEngagement = 10,
      sampleSize = 100
    } = options;

    const cacheKey = `${project}_${timeframe}_${sampleSize}`;
    
    // Check cache first
    if (this.sentimentCache.has(cacheKey)) {
      const cached = this.sentimentCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Fetch recent mentions
      const mentions = await twitterService.searchMentions(project, {
        maxResults: sampleSize,
        startTime: this.getTimeframeStart(timeframe)
      });

      // Filter by engagement threshold
      const filteredTweets = mentions.tweets.filter(tweet => 
        tweet.engagement >= minEngagement
      );

      // Analyze sentiment for each tweet
      const sentimentResults = await this.batchAnalyzeSentiment(
        filteredTweets.map(tweet => tweet.text)
      );

      // Calculate weighted sentiment scores
      const analysis = this.calculateProjectSentiment(
        filteredTweets,
        sentimentResults,
        includeInfluencers
      );

      // Cache results
      this.sentimentCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      });

      return analysis;

    } catch (error) {
      console.error('Error analyzing project sentiment:', error);
      return this.getMockSentimentAnalysis(project);
    }
  }

  /**
   * Batch analyze sentiment for multiple texts
   */
  async batchAnalyzeSentiment(texts) {
    const results = [];
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchPromises = batch.map(text => this.analyzeSingleText(text));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : this.getDefaultSentiment()
        ));
      } catch (error) {
        console.error('Batch sentiment analysis error:', error);
        // Add default sentiments for failed batch
        results.push(...batch.map(() => this.getDefaultSentiment()));
      }

      // Rate limiting delay
      if (i + this.batchSize < texts.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Analyze sentiment for a single text
   */
  async analyzeSingleText(text) {
    try {
      const result = await analyzeSentiment(text);
      return {
        sentiment: this.normalizeSentiment(result.sentiment),
        confidence: result.confidence || 0.5,
        score: this.calculateSentimentScore(result.sentiment, result.confidence),
        keywords: this.extractKeywords(text),
        emotions: result.emotions || []
      };
    } catch (error) {
      console.error('Single text sentiment analysis error:', error);
      return this.getDefaultSentiment();
    }
  }

  /**
   * Calculate comprehensive project sentiment
   */
  calculateProjectSentiment(tweets, sentimentResults, includeInfluencers) {
    if (!tweets.length || !sentimentResults.length) {
      return this.getMockSentimentAnalysis('Unknown');
    }

    let totalScore = 0;
    let totalWeight = 0;
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const topKeywords = new Map();
    const influencerSentiments = [];

    tweets.forEach((tweet, index) => {
      const sentiment = sentimentResults[index];
      if (!sentiment) return;

      // Calculate weight based on engagement and influence
      let weight = 1;
      if (includeInfluencers) {
        weight = 1 + (tweet.influence * 2) + (Math.log10(tweet.engagement + 1) / 10);
      }

      totalScore += sentiment.score * weight;
      totalWeight += weight;

      // Count sentiment types
      sentimentCounts[sentiment.sentiment]++;

      // Track keywords
      sentiment.keywords.forEach(keyword => {
        topKeywords.set(keyword, (topKeywords.get(keyword) || 0) + weight);
      });

      // Track influencer sentiments
      if (tweet.influence > 0.5) {
        influencerSentiments.push({
          author: tweet.author.username,
          sentiment: sentiment.sentiment,
          score: sentiment.score,
          influence: tweet.influence,
          text: tweet.text.substring(0, 100) + '...'
        });
      }
    });

    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const totalTweets = tweets.length;

    return {
      project: tweets[0]?.text.match(/\$([A-Z]+)/)?.[1] || 'Unknown',
      overall_sentiment: this.scoreToSentiment(averageScore),
      sentiment_score: Math.round(averageScore * 100) / 100,
      confidence: this.calculateConfidence(sentimentResults),
      distribution: {
        positive: Math.round((sentimentCounts.positive / totalTweets) * 100),
        negative: Math.round((sentimentCounts.negative / totalTweets) * 100),
        neutral: Math.round((sentimentCounts.neutral / totalTweets) * 100)
      },
      metrics: {
        total_mentions: totalTweets,
        analyzed_tweets: sentimentResults.length,
        average_engagement: Math.round(tweets.reduce((sum, t) => sum + t.engagement, 0) / totalTweets),
        influencer_mentions: influencerSentiments.length,
        timeframe: '24h'
      },
      top_keywords: Array.from(topKeywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, weight]) => ({ keyword, weight: Math.round(weight) })),
      influencer_insights: influencerSentiments.slice(0, 5),
      trend_analysis: this.analyzeTrend(tweets, sentimentResults),
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Analyze sentiment trend over time
   */
  analyzeTrend(tweets, sentimentResults) {
    if (tweets.length < 10) {
      return { direction: 'stable', strength: 0, description: 'Insufficient data' };
    }

    // Sort by creation time
    const sortedData = tweets
      .map((tweet, index) => ({
        timestamp: new Date(tweet.createdAt).getTime(),
        score: sentimentResults[index]?.score || 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Calculate trend using linear regression
    const n = sortedData.length;
    const sumX = sortedData.reduce((sum, _, i) => sum + i, 0);
    const sumY = sortedData.reduce((sum, item) => sum + item.score, 0);
    const sumXY = sortedData.reduce((sum, item, i) => sum + (i * item.score), 0);
    const sumXX = sortedData.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const strength = Math.abs(slope);

    let direction = 'stable';
    if (slope > 0.1) direction = 'improving';
    else if (slope < -0.1) direction = 'declining';

    return {
      direction,
      strength: Math.round(strength * 100) / 100,
      description: this.getTrendDescription(direction, strength)
    };
  }

  /**
   * Get trend description
   */
  getTrendDescription(direction, strength) {
    const strengthLevel = strength > 0.3 ? 'strong' : strength > 0.1 ? 'moderate' : 'weak';
    
    switch (direction) {
      case 'improving':
        return `Sentiment is ${strengthLevel}ly improving over time`;
      case 'declining':
        return `Sentiment is ${strengthLevel}ly declining over time`;
      default:
        return 'Sentiment remains relatively stable';
    }
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(sentimentResults) {
    if (!sentimentResults.length) return 0.5;
    
    const avgConfidence = sentimentResults.reduce((sum, result) => 
      sum + (result.confidence || 0.5), 0
    ) / sentimentResults.length;

    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const cryptoKeywords = [
      'bullish', 'bearish', 'moon', 'dump', 'pump', 'hodl', 'buy', 'sell',
      'dip', 'rally', 'breakout', 'support', 'resistance', 'fomo', 'fud'
    ];

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(word => 
      cryptoKeywords.includes(word) || 
      word.startsWith('$') || 
      word.startsWith('#')
    ).slice(0, 5);
  }

  /**
   * Normalize sentiment labels
   */
  normalizeSentiment(sentiment) {
    const normalized = sentiment.toLowerCase();
    if (['very positive', 'very_positive', 'extremely positive'].includes(normalized)) {
      return 'positive';
    }
    if (['very negative', 'very_negative', 'extremely negative'].includes(normalized)) {
      return 'negative';
    }
    return ['positive', 'negative', 'neutral'].includes(normalized) ? normalized : 'neutral';
  }

  /**
   * Calculate numerical sentiment score
   */
  calculateSentimentScore(sentiment, confidence) {
    const baseScore = this.sentimentWeights[sentiment] || 0;
    return baseScore * confidence;
  }

  /**
   * Convert score to sentiment label
   */
  scoreToSentiment(score) {
    if (score > 0.3) return 'positive';
    if (score < -0.3) return 'negative';
    return 'neutral';
  }

  /**
   * Get default sentiment for errors
   */
  getDefaultSentiment() {
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      score: 0,
      keywords: [],
      emotions: []
    };
  }

  /**
   * Get timeframe start date
   */
  getTimeframeStart(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mock sentiment analysis for development
   */
  getMockSentimentAnalysis(project) {
    return {
      project,
      overall_sentiment: 'positive',
      sentiment_score: 0.65,
      confidence: 0.82,
      distribution: {
        positive: 65,
        negative: 20,
        neutral: 15
      },
      metrics: {
        total_mentions: 247,
        analyzed_tweets: 200,
        average_engagement: 45,
        influencer_mentions: 12,
        timeframe: '24h'
      },
      top_keywords: [
        { keyword: 'bullish', weight: 45 },
        { keyword: 'moon', weight: 32 },
        { keyword: 'buy', weight: 28 },
        { keyword: 'hodl', weight: 24 },
        { keyword: 'pump', weight: 18 }
      ],
      influencer_insights: [
        {
          author: 'cryptoanalyst',
          sentiment: 'positive',
          score: 0.8,
          influence: 0.9,
          text: `${project} showing strong technical indicators...`
        }
      ],
      trend_analysis: {
        direction: 'improving',
        strength: 0.25,
        description: 'Sentiment is moderately improving over time'
      },
      last_updated: new Date().toISOString()
    };
  }
}

export default new SentimentService();

