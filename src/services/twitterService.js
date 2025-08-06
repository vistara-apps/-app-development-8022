/**
 * Twitter API Service for CryptoSentinel
 * Handles Twitter API v2 integration for real-time crypto mentions and data
 */

class TwitterService {
  constructor() {
    this.baseURL = 'https://api.twitter.com/2';
    this.bearerToken = import.meta.env.VITE_TWITTER_BEARER_TOKEN;
    this.rateLimitCache = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Get Twitter Bearer Token from environment or fallback
   */
  getBearerToken() {
    // Debug logging to help troubleshoot token loading
    if (!this.bearerToken) {
      console.warn('VITE_TWITTER_BEARER_TOKEN not found in environment variables');
      console.log('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
    } else {
      console.log('Twitter Bearer Token loaded successfully (length:', this.bearerToken.length, ')');
    }
    
    return this.bearerToken || 'YOUR_TWITTER_BEARER_TOKEN_HERE';
  }

  /**
   * Make authenticated request to Twitter API with rate limiting
   */
  async makeRequest(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.getBearerToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - implement exponential backoff
          const retryAfter = response.headers.get('x-rate-limit-reset') || 900;
          console.warn(`Rate limited. Retry after: ${retryAfter} seconds`);
          throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
        }
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Twitter API request failed:', error);
      throw error;
    }
  }

  /**
   * Search for recent tweets mentioning crypto projects
   */
  async searchMentions(query, options = {}) {
    const {
      maxResults = 100,
      tweetFields = 'created_at,author_id,public_metrics,context_annotations,lang',
      userFields = 'username,name,verified,public_metrics',
      expansions = 'author_id',
      startTime = null,
      endTime = null
    } = options;

    const params = {
      query: this.buildSearchQuery(query),
      max_results: Math.min(maxResults, 100), // API limit
      'tweet.fields': tweetFields,
      'user.fields': userFields,
      expansions: expansions,
    };

    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;

    try {
      const data = await this.makeRequest('/tweets/search/recent', params);
      return this.formatTweetData(data);
    } catch (error) {
      console.error('Error searching mentions:', error);
      return this.getMockMentions(query); // Fallback to mock data
    }
  }

  /**
   * Build optimized search query for crypto mentions
   */
  buildSearchQuery(project) {
    const cryptoTerms = {
      'bitcoin': '$BTC OR Bitcoin OR #Bitcoin',
      'ethereum': '$ETH OR Ethereum OR #Ethereum',
      'solana': '$SOL OR Solana OR #Solana',
      'cardano': '$ADA OR Cardano OR #Cardano',
      'polygon': '$MATIC OR Polygon OR #Polygon',
      'chainlink': '$LINK OR Chainlink OR #Chainlink',
      'avalanche': '$AVAX OR Avalanche OR #Avalanche',
      'polkadot': '$DOT OR Polkadot OR #Polkadot'
    };

    const baseQuery = cryptoTerms[project.toLowerCase()] || `$${project.toUpperCase()} OR ${project}`;
    
    // Add crypto-specific filters
    return `(${baseQuery}) lang:en -is:retweet has:hashtags`;
  }

  /**
   * Format raw Twitter API response data
   */
  formatTweetData(data) {
    if (!data || !data.data) {
      return { tweets: [], meta: { result_count: 0 } };
    }

    const users = data.includes?.users || [];
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const tweets = data.data.map(tweet => {
      const author = userMap[tweet.author_id] || {};
      
      return {
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        author: {
          id: tweet.author_id,
          username: author.username || 'unknown',
          name: author.name || 'Unknown User',
          verified: author.verified || false,
          followers: author.public_metrics?.followers_count || 0
        },
        metrics: {
          retweets: tweet.public_metrics?.retweet_count || 0,
          likes: tweet.public_metrics?.like_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          quotes: tweet.public_metrics?.quote_count || 0
        },
        engagement: this.calculateEngagement(tweet.public_metrics),
        influence: this.calculateInfluence(author.public_metrics, tweet.public_metrics)
      };
    });

    return {
      tweets,
      meta: {
        result_count: data.meta?.result_count || 0,
        next_token: data.meta?.next_token
      }
    };
  }

  /**
   * Calculate engagement score for a tweet
   */
  calculateEngagement(metrics) {
    if (!metrics) return 0;
    
    const { retweet_count = 0, like_count = 0, reply_count = 0, quote_count = 0 } = metrics;
    
    // Weighted engagement score
    return (retweet_count * 3) + (like_count * 1) + (reply_count * 2) + (quote_count * 2);
  }

  /**
   * Calculate influence score for a user/tweet combination
   */
  calculateInfluence(userMetrics, tweetMetrics) {
    if (!userMetrics || !tweetMetrics) return 0;
    
    const followerWeight = Math.log10(userMetrics.followers_count + 1) / 10;
    const engagementWeight = this.calculateEngagement(tweetMetrics) / 100;
    
    return Math.min(followerWeight + engagementWeight, 1);
  }

  /**
   * Get high-signal crypto accounts (influencers, analysts, etc.)
   */
  async getHighSignalAccounts() {
    // In production, this would be a curated list from database
    return [
      { username: 'elonmusk', weight: 1.0, category: 'influencer' },
      { username: 'VitalikButerin', weight: 0.95, category: 'founder' },
      { username: 'aantonop', weight: 0.9, category: 'educator' },
      { username: 'naval', weight: 0.85, category: 'investor' },
      { username: 'balajis', weight: 0.85, category: 'analyst' },
      { username: 'APompliano', weight: 0.8, category: 'analyst' },
      { username: 'DocumentingBTC', weight: 0.75, category: 'news' },
      { username: 'WhalePanda', weight: 0.7, category: 'trader' }
    ];
  }

  /**
   * Monitor high-signal accounts for crypto mentions
   */
  async monitorHighSignalAccounts(projects = []) {
    const accounts = await this.getHighSignalAccounts();
    const mentions = [];

    for (const account of accounts.slice(0, 5)) { // Limit to avoid rate limits
      try {
        const query = `from:${account.username} (${projects.map(p => `$${p}`).join(' OR ')})`;
        const data = await this.makeRequest('/tweets/search/recent', {
          query,
          max_results: 10,
          'tweet.fields': 'created_at,public_metrics',
          'user.fields': 'username,name,verified,public_metrics'
        });

        if (data.data) {
          mentions.push(...data.data.map(tweet => ({
            ...tweet,
            account_weight: account.weight,
            account_category: account.category
          })));
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${account.username}:`, error.message);
      }
    }

    return mentions;
  }

  /**
   * Mock data for development/fallback
   */
  getMockMentions(project) {
    const mockTweets = [
      {
        id: '1',
        text: `Just bought more ${project}! This dip is a great opportunity 🚀 #crypto`,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        author: {
          id: 'user1',
          username: 'cryptotrader123',
          name: 'Crypto Trader',
          verified: false,
          followers: 5420
        },
        metrics: { retweets: 12, likes: 45, replies: 8, quotes: 3 },
        engagement: 89,
        influence: 0.3
      },
      {
        id: '2',
        text: `${project} looking bearish on the charts. Might be time to take profits 📉`,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        author: {
          id: 'user2',
          username: 'chartanalyst',
          name: 'Chart Analyst',
          verified: true,
          followers: 25000
        },
        metrics: { retweets: 34, likes: 128, replies: 22, quotes: 8 },
        engagement: 234,
        influence: 0.7
      }
    ];

    return {
      tweets: mockTweets,
      meta: { result_count: mockTweets.length }
    };
  }

  /**
   * Get trending crypto topics
   */
  async getTrendingTopics() {
    try {
      // In production, this would use Twitter Trends API
      return [
        { topic: 'Bitcoin', volume: 15420, sentiment: 'positive' },
        { topic: 'Ethereum', volume: 12350, sentiment: 'neutral' },
        { topic: 'DeFi', volume: 8900, sentiment: 'positive' },
        { topic: 'NFT', volume: 6700, sentiment: 'negative' },
        { topic: 'Web3', volume: 5400, sentiment: 'positive' }
      ];
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      return [];
    }
  }
}

export default new TwitterService();
