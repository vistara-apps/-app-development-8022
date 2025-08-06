/**
 * DexScreener API Service for CryptoSentinel
 * Provides real-time DEX trading data, token prices, and liquidity information
 */

class DexScreenerService {
  constructor() {
    this.baseURL = 'https://api.dexscreener.com/latest';
    this.cache = new Map();
    this.cacheTimeout = 30 * 1000; // 30 seconds cache
  }

  /**
   * Get token pairs by token address
   */
  async getTokenPairs(tokenAddress) {
    const cacheKey = `pairs_${tokenAddress}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/dex/tokens/${tokenAddress}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('DexScreener token pairs error:', error);
      return this.getMockTokenPairs(tokenAddress);
    }
  }

  /**
   * Search for tokens by query
   */
  async searchTokens(query) {
    const cacheKey = `search_${query}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/dex/search/?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener search error: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('DexScreener search error:', error);
      return this.getMockSearchResults(query);
    }
  }

  /**
   * Get trending tokens
   */
  async getTrendingTokens() {
    const cacheKey = 'trending_tokens';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // DexScreener doesn't have a direct trending endpoint, so we'll use popular pairs
      const response = await fetch(`${this.baseURL}/dex/pairs/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640`); // USDC/ETH
      
      if (!response.ok) {
        throw new Error(`DexScreener trending error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform to trending format
      const trendingData = {
        pairs: data.pairs || [],
        trending: this.extractTrendingTokens(data.pairs || [])
      };
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: trendingData,
        timestamp: Date.now()
      });

      return trendingData;
    } catch (error) {
      console.error('DexScreener trending error:', error);
      return this.getMockTrendingTokens();
    }
  }

  /**
   * Get token price and volume data
   */
  async getTokenMetrics(tokenAddress) {
    try {
      const pairData = await this.getTokenPairs(tokenAddress);
      
      if (!pairData.pairs || pairData.pairs.length === 0) {
        return null;
      }

      // Get the most liquid pair
      const mainPair = pairData.pairs.reduce((prev, current) => 
        (current.liquidity?.usd || 0) > (prev.liquidity?.usd || 0) ? current : prev
      );

      return {
        address: tokenAddress,
        symbol: mainPair.baseToken?.symbol || 'UNKNOWN',
        name: mainPair.baseToken?.name || 'Unknown Token',
        price: parseFloat(mainPair.priceUsd || '0'),
        priceChange24h: parseFloat(mainPair.priceChange?.h24 || '0'),
        volume24h: parseFloat(mainPair.volume?.h24 || '0'),
        liquidity: parseFloat(mainPair.liquidity?.usd || '0'),
        marketCap: parseFloat(mainPair.fdv || '0'),
        pairAddress: mainPair.pairAddress,
        dexId: mainPair.dexId,
        chainId: mainPair.chainId,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Token metrics error:', error);
      return null;
    }
  }

  /**
   * Extract trending tokens from pairs data
   */
  extractTrendingTokens(pairs) {
    return pairs
      .filter(pair => pair.volume?.h24 > 10000) // Filter by volume
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 10)
      .map(pair => ({
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        name: pair.baseToken?.name || 'Unknown',
        address: pair.baseToken?.address,
        price: parseFloat(pair.priceUsd || '0'),
        priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
        volume24h: parseFloat(pair.volume?.h24 || '0'),
        liquidity: parseFloat(pair.liquidity?.usd || '0')
      }));
  }

  /**
   * Mock data for development/fallback
   */
  getMockTokenPairs(tokenAddress) {
    return {
      schemaVersion: "1.0.0",
      pairs: [
        {
          chainId: "ethereum",
          dexId: "uniswap",
          url: "https://dexscreener.com/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
          pairAddress: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
          baseToken: {
            address: tokenAddress,
            name: "Mock Token",
            symbol: "MOCK"
          },
          quoteToken: {
            address: "0xa0b86a33e6441e6c7b6e1d4b8b8b8b8b8b8b8b8b",
            name: "USD Coin",
            symbol: "USDC"
          },
          priceNative: "0.000234",
          priceUsd: "1.23",
          priceChange: {
            h24: "5.67"
          },
          volume: {
            h24: 125000
          },
          liquidity: {
            usd: 450000
          },
          fdv: 12500000
        }
      ]
    };
  }

  getMockSearchResults(query) {
    return {
      schemaVersion: "1.0.0",
      pairs: [
        {
          chainId: "ethereum",
          dexId: "uniswap",
          pairAddress: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
          baseToken: {
            address: "0x1234567890123456789012345678901234567890",
            name: `${query} Token`,
            symbol: query.toUpperCase().slice(0, 6)
          },
          priceUsd: "1.23",
          priceChange: { h24: "5.67" },
          volume: { h24: 125000 },
          liquidity: { usd: 450000 }
        }
      ]
    };
  }

  getMockTrendingTokens() {
    return {
      pairs: [],
      trending: [
        { symbol: 'ETH', name: 'Ethereum', price: 2500, priceChange24h: 3.2, volume24h: 1500000000, liquidity: 500000000 },
        { symbol: 'BTC', name: 'Bitcoin', price: 45000, priceChange24h: 1.8, volume24h: 2000000000, liquidity: 800000000 },
        { symbol: 'SOL', name: 'Solana', price: 95, priceChange24h: 5.4, volume24h: 400000000, liquidity: 200000000 },
        { symbol: 'AVAX', name: 'Avalanche', price: 28, priceChange24h: -2.1, volume24h: 150000000, liquidity: 80000000 },
        { symbol: 'MATIC', name: 'Polygon', price: 0.85, priceChange24h: 4.7, volume24h: 200000000, liquidity: 120000000 }
      ]
    };
  }
}

export default new DexScreenerService();
