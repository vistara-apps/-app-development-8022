/**
 * CoinGecko API Service for CryptoSentinel
 * Provides comprehensive cryptocurrency market data, prices, and analytics
 */

class CoinGeckoService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.proBaseURL = 'https://pro-api.coingecko.com/api/v3';
    this.apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 60 * 1000; // 1 minute cache
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-cg-pro-api-key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Get base URL (pro if API key available)
   */
  getBaseURL() {
    return this.apiKey ? this.proBaseURL : this.baseURL;
  }

  /**
   * Make API request with caching
   */
  async makeRequest(endpoint, cacheKey = null) {
    const key = cacheKey || endpoint;
    
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.getBaseURL()}${endpoint}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`CoinGecko request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrendingCoins() {
    try {
      const data = await this.makeRequest('/search/trending', 'trending_coins');
      
      return {
        coins: data.coins.map(item => ({
          id: item.item.id,
          name: item.item.name,
          symbol: item.item.symbol,
          rank: item.item.market_cap_rank,
          price_btc: item.item.price_btc,
          thumb: item.item.thumb,
          score: item.item.score
        })),
        nfts: data.nfts || [],
        categories: data.categories || []
      };
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      return this.getMockTrendingCoins();
    }
  }

  /**
   * Get market data for specific coins
   */
  async getCoinsMarketData(coinIds, vsCurrency = 'usd', options = {}) {
    const {
      order = 'market_cap_desc',
      perPage = 100,
      page = 1,
      sparkline = false,
      priceChangePercentage = '24h'
    } = options;

    const params = new URLSearchParams({
      ids: Array.isArray(coinIds) ? coinIds.join(',') : coinIds,
      vs_currency: vsCurrency,
      order,
      per_page: perPage,
      page,
      sparkline,
      price_change_percentage: priceChangePercentage
    });

    try {
      const data = await this.makeRequest(`/coins/markets?${params}`, `market_${coinIds}_${vsCurrency}`);
      
      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        fullyDilutedValuation: coin.fully_diluted_valuation,
        totalVolume: coin.total_volume,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        priceChange24h: coin.price_change_24h,
        priceChangePercentage24h: coin.price_change_percentage_24h,
        marketCapChange24h: coin.market_cap_change_24h,
        marketCapChangePercentage24h: coin.market_cap_change_percentage_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
        ath: coin.ath,
        athChangePercentage: coin.ath_change_percentage,
        athDate: coin.ath_date,
        atl: coin.atl,
        atlChangePercentage: coin.atl_change_percentage,
        atlDate: coin.atl_date,
        lastUpdated: coin.last_updated
      }));
    } catch (error) {
      console.error('Error fetching market data:', error);
      return this.getMockMarketData(coinIds);
    }
  }

  /**
   * Get detailed coin information
   */
  async getCoinDetails(coinId) {
    try {
      const data = await this.makeRequest(`/coins/${coinId}`, `coin_${coinId}`);
      
      return {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        description: data.description?.en || '',
        image: data.image,
        marketCapRank: data.market_cap_rank,
        coingeckoRank: data.coingecko_rank,
        coingeckoScore: data.coingecko_score,
        developerScore: data.developer_score,
        communityScore: data.community_score,
        liquidityScore: data.liquidity_score,
        publicInterestScore: data.public_interest_score,
        marketData: {
          currentPrice: data.market_data?.current_price || {},
          marketCap: data.market_data?.market_cap || {},
          totalVolume: data.market_data?.total_volume || {},
          priceChangePercentage24h: data.market_data?.price_change_percentage_24h,
          priceChangePercentage7d: data.market_data?.price_change_percentage_7d,
          priceChangePercentage30d: data.market_data?.price_change_percentage_30d
        },
        links: data.links,
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error(`Error fetching coin details for ${coinId}:`, error);
      return this.getMockCoinDetails(coinId);
    }
  }

  /**
   * Search for coins, categories, and markets
   */
  async searchCoins(query) {
    try {
      const data = await this.makeRequest(`/search?query=${encodeURIComponent(query)}`, `search_${query}`);
      
      return {
        coins: data.coins.map(coin => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          marketCapRank: coin.market_cap_rank,
          thumb: coin.thumb,
          large: coin.large
        })),
        exchanges: data.exchanges || [],
        icos: data.icos || [],
        categories: data.categories || [],
        nfts: data.nfts || []
      };
    } catch (error) {
      console.error('Error searching coins:', error);
      return this.getMockSearchResults(query);
    }
  }

  /**
   * Get global cryptocurrency market data
   */
  async getGlobalMarketData() {
    try {
      const data = await this.makeRequest('/global', 'global_market');
      
      return {
        activeCryptocurrencies: data.data.active_cryptocurrencies,
        upcomingIcos: data.data.upcoming_icos,
        ongoingIcos: data.data.ongoing_icos,
        endedIcos: data.data.ended_icos,
        markets: data.data.markets,
        totalMarketCap: data.data.total_market_cap,
        totalVolume: data.data.total_volume,
        marketCapPercentage: data.data.market_cap_percentage,
        marketCapChangePercentage24hUsd: data.data.market_cap_change_percentage_24h_usd,
        updatedAt: data.data.updated_at
      };
    } catch (error) {
      console.error('Error fetching global market data:', error);
      return this.getMockGlobalMarketData();
    }
  }

  /**
   * Mock data for development/fallback
   */
  getMockTrendingCoins() {
    return {
      coins: [
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', rank: 1, price_btc: 1.0, score: 0 },
        { id: 'ethereum', name: 'Ethereum', symbol: 'eth', rank: 2, price_btc: 0.065, score: 1 },
        { id: 'solana', name: 'Solana', symbol: 'sol', rank: 5, price_btc: 0.002, score: 2 }
      ],
      nfts: [],
      categories: []
    };
  }

  getMockMarketData(coinIds) {
    const mockCoins = {
      bitcoin: { symbol: 'btc', name: 'Bitcoin', currentPrice: 45000, marketCap: 850000000000, priceChangePercentage24h: 2.5 },
      ethereum: { symbol: 'eth', name: 'Ethereum', currentPrice: 2500, marketCap: 300000000000, priceChangePercentage24h: 3.2 },
      solana: { symbol: 'sol', name: 'Solana', currentPrice: 95, marketCap: 40000000000, priceChangePercentage24h: 5.4 }
    };

    const ids = Array.isArray(coinIds) ? coinIds : [coinIds];
    return ids.map(id => mockCoins[id] || mockCoins.bitcoin);
  }

  getMockCoinDetails(coinId) {
    return {
      id: coinId,
      symbol: coinId.slice(0, 3),
      name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
      description: `Mock description for ${coinId}`,
      marketCapRank: 1,
      coingeckoScore: 75.5,
      marketData: {
        currentPrice: { usd: 45000 },
        marketCap: { usd: 850000000000 },
        priceChangePercentage24h: 2.5
      }
    };
  }

  getMockSearchResults(query) {
    return {
      coins: [
        { id: query.toLowerCase(), name: query, symbol: query.slice(0, 3), marketCapRank: 1 }
      ],
      exchanges: [],
      categories: []
    };
  }

  getMockGlobalMarketData() {
    return {
      activeCryptocurrencies: 10000,
      markets: 500,
      totalMarketCap: { usd: 2000000000000 },
      totalVolume: { usd: 50000000000 },
      marketCapChangePercentage24hUsd: 2.5
    };
  }
}

export default new CoinGeckoService();
