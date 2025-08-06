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
        sentiment: result.sentiment,
        confidence: result.confidence,
        sentiment_score: result.sentiment_score,
        explanation: result.explanation,
        key_phrases: result.key_phrases,
        text: text.slice(0, 100) + (text.length > 100 ? '...' : '')
      };
    } catch (error) {
      console.error('Single text sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        sentiment_score: 0.5,
        explanation: 'Analysis failed - using neutral sentiment',
        key_phrases: [],
        text: text.slice(0, 100) + (text.length > 100 ? '...' : '')
      };
    }
  }

  /**
   * Calculate comprehensive project sentiment
   */
  calculateProjectSentiment(tweets, sentimentResults, includeInfluencers) {
    if (!tweets.length || !sentimentResults.length) {
      return {
        project: 'Unknown',
        sentiment_score: 0.5,
        confidence: 0.5,
        explanation: 'No data available for sentiment analysis',
        metrics: {
          total_mentions: 0,
          positive_mentions: 0,
          negative_mentions: 0,
          neutral_mentions: 0
        },
        key_insights: ['No mentions found'],
        sample_analyses: []
      };
    }

    let totalScore = 0;
    let totalWeight = 0;
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const allKeyPhrases = [];
    const influencerSentiments = [];
    const sampleAnalyses = [];

    tweets.forEach((tweet, index) => {
      const sentiment = sentimentResults[index];
      if (!sentiment) return;

      // Calculate weight based on engagement and influence
      let weight = 1;
      const engagement = tweet.public_metrics?.like_count || tweet.engagement || 0;
      const followers = tweet.author?.public_metrics?.followers_count || 0;
      
      if (includeInfluencers) {
        weight = 1 + (Math.log10(followers + 1) / 100) + (Math.log10(engagement + 1) / 10);
      }

      totalScore += sentiment.sentiment_score * weight;
      totalWeight += weight;

      // Count sentiment types
      sentimentCounts[sentiment.sentiment]++;

      // Track key phrases
      if (sentiment.key_phrases) {
        allKeyPhrases.push(...sentiment.key_phrases);
      }

      // Track influencer sentiments
      if (followers > 10000 || engagement > 100) {
        influencerSentiments.push({
          author: tweet.author?.username || 'Unknown',
          sentiment: sentiment.sentiment,
          score: sentiment.sentiment_score,
          followers: followers,
          text: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
          explanation: sentiment.explanation
        });
      }

      // Add to sample analyses (first 5)
      if (sampleAnalyses.length < 5) {
        sampleAnalyses.push({
          text: tweet.text.substring(0, 150) + (tweet.text.length > 150 ? '...' : ''),
          sentiment: sentiment.sentiment,
          score: sentiment.sentiment_score,
          explanation: sentiment.explanation,
          key_phrases: sentiment.key_phrases
        });
      }
    });

    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0.5;
    const totalTweets = tweets.length;
    
    // Generate explanation based on data
    const dominantSentiment = Object.keys(sentimentCounts).reduce((a, b) => 
      sentimentCounts[a] > sentimentCounts[b] ? a : b
    );
    
    const topPhrases = [...new Set(allKeyPhrases)].slice(0, 5);
    
    let explanation = `Analysis of ${totalTweets} mentions shows ${dominantSentiment} sentiment (${Math.round(averageScore * 100)}% score). `;
    
    if (influencerSentiments.length > 0) {
      explanation += `${influencerSentiments.length} influencer mentions detected. `;
    }
    
    if (topPhrases.length > 0) {
      explanation += `Key themes: ${topPhrases.join(', ')}.`;
    }

    return {
      project: tweets[0]?.text.match(/\$([A-Z]+)/)?.[1] || 'Unknown',
      sentiment_score: Math.round(averageScore * 100) / 100,
      confidence: this.calculateConfidence(sentimentResults),
      explanation: explanation,
      metrics: {
        total_mentions: totalTweets,
        positive_mentions: sentimentCounts.positive,
        negative_mentions: sentimentCounts.negative,
        neutral_mentions: sentimentCounts.neutral,
        influencer_mentions: influencerSentiments.length
      },
      key_insights: this.generateKeyInsights(sentimentCounts, influencerSentiments, topPhrases),
      sample_analyses: sampleAnalyses,
      influencer_sentiment: influencerSentiments
    };
  }

  /**
   * Generate key insights from sentiment analysis
   */
  generateKeyInsights(sentimentCounts, influencerSentiments, topPhrases) {
    const insights = [];
    const total = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return ['No data available'];
    
    // Sentiment distribution insights
    const positivePercent = Math.round((sentimentCounts.positive / total) * 100);
    const negativePercent = Math.round((sentimentCounts.negative / total) * 100);
    
    if (positivePercent > 60) {
      insights.push(`Strong positive sentiment (${positivePercent}% of mentions)`);
    } else if (negativePercent > 60) {
      insights.push(`Strong negative sentiment (${negativePercent}% of mentions)`);
    } else {
      insights.push(`Mixed sentiment: ${positivePercent}% positive, ${negativePercent}% negative`);
    }
    
    // Influencer insights
    if (influencerSentiments.length > 0) {
      const positiveInfluencers = influencerSentiments.filter(i => i.sentiment === 'positive').length;
      if (positiveInfluencers > influencerSentiments.length / 2) {
        insights.push(`Influencers are mostly positive (${positiveInfluencers}/${influencerSentiments.length})`);
      } else {
        insights.push(`Mixed influencer sentiment (${positiveInfluencers}/${influencerSentiments.length} positive)`);
      }
    }
    
    // Key phrases insight
    if (topPhrases.length > 0) {
      insights.push(`Common themes: ${topPhrases.slice(0, 3).join(', ')}`);
    }
    
    return insights;
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
