/**
 * Tools Service for CryptoSentinel
 * Provides LLM tools for agentic AI functionality
 */

import dexScreenerService from './dexScreenerService.js';
import coinGeckoService from './coinGeckoService.js';
import twitterService from './twitterService.js';
import sentimentService from './sentimentService.js';

class ToolsService {
  constructor() {
    this.tools = this.initializeTools();
  }

  /**
   * Initialize all available tools for the LLM
   */
  initializeTools() {
    return [
      {
        type: "function",
        function: {
          name: "get_token_price",
          description: "Get current price and market data for a cryptocurrency token",
          parameters: {
            type: "object",
            properties: {
              token_symbol: {
                type: "string",
                description: "The token symbol (e.g., BTC, ETH, SOL)"
              },
              include_details: {
                type: "boolean",
                description: "Whether to include detailed market data",
                default: false
              }
            },
            required: ["token_symbol"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_tokens",
          description: "Search for cryptocurrency tokens by name or symbol",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (token name or symbol)"
              },
              limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 10
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_trending_tokens",
          description: "Get currently trending cryptocurrency tokens",
          parameters: {
            type: "object",
            properties: {
              source: {
                type: "string",
                enum: ["coingecko", "dexscreener", "both"],
                description: "Data source for trending tokens",
                default: "both"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "analyze_token_sentiment",
          description: "Analyze social media sentiment for a specific token",
          parameters: {
            type: "object",
            properties: {
              token_name: {
                type: "string",
                description: "The token name to analyze sentiment for"
              },
              timeframe: {
                type: "string",
                enum: ["1h", "24h", "7d"],
                description: "Timeframe for sentiment analysis",
                default: "24h"
              },
              sample_size: {
                type: "number",
                description: "Number of mentions to analyze",
                default: 100
              }
            },
            required: ["token_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_token_mentions",
          description: "Get recent social media mentions for a token",
          parameters: {
            type: "object",
            properties: {
              token_name: {
                type: "string",
                description: "The token name to search mentions for"
              },
              max_results: {
                type: "number",
                description: "Maximum number of mentions to return",
                default: 50
              },
              include_sentiment: {
                type: "boolean",
                description: "Whether to include sentiment analysis for each mention",
                default: true
              }
            },
            required: ["token_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_dex_token_data",
          description: "Get DEX trading data for a token from DexScreener",
          parameters: {
            type: "object",
            properties: {
              token_address: {
                type: "string",
                description: "The token contract address"
              },
              chain: {
                type: "string",
                description: "Blockchain network (ethereum, bsc, polygon, etc.)",
                default: "ethereum"
              }
            },
            required: ["token_address"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_market_overview",
          description: "Get overall cryptocurrency market overview and statistics",
          parameters: {
            type: "object",
            properties: {
              include_trending: {
                type: "boolean",
                description: "Whether to include trending tokens",
                default: true
              },
              top_coins_count: {
                type: "number",
                description: "Number of top coins by market cap to include",
                default: 10
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "compare_tokens",
          description: "Compare multiple cryptocurrency tokens side by side",
          parameters: {
            type: "object",
            properties: {
              token_ids: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array of token IDs or symbols to compare"
              },
              metrics: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["price", "market_cap", "volume", "sentiment", "social_activity"]
                },
                description: "Metrics to compare",
                default: ["price", "market_cap", "volume"]
              }
            },
            required: ["token_ids"]
          }
        }
      }
    ];
  }

  /**
   * Execute a tool function
   */
  async executeTool(toolName, parameters) {
    try {
      switch (toolName) {
        case 'get_token_price':
          return await this.getTokenPrice(parameters);
        case 'search_tokens':
          return await this.searchTokens(parameters);
        case 'get_trending_tokens':
          return await this.getTrendingTokens(parameters);
        case 'analyze_token_sentiment':
          return await this.analyzeTokenSentiment(parameters);
        case 'get_token_mentions':
          return await this.getTokenMentions(parameters);
        case 'get_dex_token_data':
          return await this.getDexTokenData(parameters);
        case 'get_market_overview':
          return await this.getMarketOverview(parameters);
        case 'compare_tokens':
          return await this.compareTokens(parameters);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Tool execution error for ${toolName}:`, error);
      return {
        error: true,
        message: error.message,
        tool: toolName,
        parameters
      };
    }
  }

  /**
   * Tool implementations
   */
  async getTokenPrice({ token_symbol, include_details = false }) {
    try {
      // Search for the token first
      const searchResults = await coinGeckoService.searchCoins(token_symbol);
      
      if (!searchResults.coins || searchResults.coins.length === 0) {
        return { error: true, message: `Token ${token_symbol} not found` };
      }

      const tokenId = searchResults.coins[0].id;
      
      if (include_details) {
        const details = await coinGeckoService.getCoinDetails(tokenId);
        return {
          success: true,
          data: details,
          source: 'coingecko'
        };
      } else {
        const marketData = await coinGeckoService.getCoinsMarketData([tokenId]);
        return {
          success: true,
          data: marketData[0],
          source: 'coingecko'
        };
      }
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async searchTokens({ query, limit = 10 }) {
    try {
      const [coinGeckoResults, dexScreenerResults] = await Promise.allSettled([
        coinGeckoService.searchCoins(query),
        dexScreenerService.searchTokens(query)
      ]);

      const results = {
        success: true,
        coingecko: coinGeckoResults.status === 'fulfilled' ? coinGeckoResults.value.coins.slice(0, limit) : [],
        dexscreener: dexScreenerResults.status === 'fulfilled' ? dexScreenerResults.value.pairs.slice(0, limit) : [],
        query
      };

      return results;
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async getTrendingTokens({ source = 'both' }) {
    try {
      const results = { success: true, source };

      if (source === 'coingecko' || source === 'both') {
        const trending = await coinGeckoService.getTrendingCoins();
        results.coingecko = trending;
      }

      if (source === 'dexscreener' || source === 'both') {
        const trending = await dexScreenerService.getTrendingTokens();
        results.dexscreener = trending;
      }

      return results;
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async analyzeTokenSentiment({ token_name, timeframe = '24h', sample_size = 100 }) {
    try {
      const sentiment = await sentimentService.analyzeProjectSentiment(token_name, {
        timeframe,
        sampleSize: sample_size
      });

      return {
        success: true,
        data: sentiment,
        token: token_name,
        timeframe,
        sample_size
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async getTokenMentions({ token_name, max_results = 50, include_sentiment = true }) {
    try {
      const mentions = await twitterService.searchMentions(token_name, {
        maxResults: max_results
      });

      let processedMentions = mentions.tweets || [];

      if (include_sentiment && processedMentions.length > 0) {
        // Add sentiment analysis to each mention
        const sentimentPromises = processedMentions.slice(0, 10).map(async (tweet) => {
          try {
            const sentiment = await sentimentService.analyzeSingleText(tweet.text);
            return { ...tweet, sentiment };
          } catch (error) {
            return { ...tweet, sentiment: null };
          }
        });

        const tweetsWithSentiment = await Promise.allSettled(sentimentPromises);
        processedMentions = tweetsWithSentiment.map(result => 
          result.status === 'fulfilled' ? result.value : result.reason
        );
      }

      return {
        success: true,
        data: {
          mentions: processedMentions,
          total_count: mentions.meta?.result_count || processedMentions.length,
          token: token_name
        }
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async getDexTokenData({ token_address, chain = 'ethereum' }) {
    try {
      const tokenData = await dexScreenerService.getTokenMetrics(token_address);
      
      return {
        success: true,
        data: tokenData,
        chain,
        address: token_address
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async getMarketOverview({ include_trending = true, top_coins_count = 10 }) {
    try {
      const [globalData, topCoins, trending] = await Promise.allSettled([
        coinGeckoService.getGlobalMarketData(),
        coinGeckoService.getCoinsMarketData(['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot'], 'usd', { perPage: top_coins_count }),
        include_trending ? coinGeckoService.getTrendingCoins() : Promise.resolve(null)
      ]);

      return {
        success: true,
        data: {
          global: globalData.status === 'fulfilled' ? globalData.value : null,
          top_coins: topCoins.status === 'fulfilled' ? topCoins.value : [],
          trending: trending.status === 'fulfilled' ? trending.value : null
        }
      };
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  async compareTokens({ token_ids, metrics = ['price', 'market_cap', 'volume'] }) {
    try {
      const tokenData = await coinGeckoService.getCoinsMarketData(token_ids);
      
      const comparison = {
        success: true,
        tokens: tokenData,
        metrics,
        comparison_data: {}
      };

      // Add sentiment data if requested
      if (metrics.includes('sentiment')) {
        const sentimentPromises = token_ids.map(async (tokenId) => {
          try {
            const sentiment = await sentimentService.analyzeProjectSentiment(tokenId);
            return { tokenId, sentiment };
          } catch (error) {
            return { tokenId, sentiment: null };
          }
        });

        const sentimentResults = await Promise.allSettled(sentimentPromises);
        comparison.sentiment_data = sentimentResults.map(result => 
          result.status === 'fulfilled' ? result.value : null
        ).filter(Boolean);
      }

      return comparison;
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  /**
   * Get all available tools for LLM
   */
  getAvailableTools() {
    return this.tools;
  }

  /**
   * Get tool by name
   */
  getTool(toolName) {
    return this.tools.find(tool => tool.function.name === toolName);
  }
}

export default new ToolsService();
