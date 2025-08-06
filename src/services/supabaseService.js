/**
 * Supabase Service for CryptoSentinel
 * Handles secure API calls through Supabase Edge Functions
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

class SupabaseService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 2 * 60 * 1000 // 2 minutes
  }

  /**
   * Get Twitter mentions through secure edge function
   */
  async getTwitterMentions(project, options = {}) {
    const cacheKey = `mentions_${project}_${JSON.stringify(options)}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('twitter-mentions', {
        body: {
          project,
          timeframe: options.timeframe || '24h',
          maxResults: options.maxResults || 50
        }
      })

      if (error) throw error

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })

      return data

    } catch (error) {
      console.error('Error fetching Twitter mentions:', error)
      
      // Try to get cached mentions from database as fallback
      const { data: cachedMentions } = await supabase
        .from('twitter_mentions')
        .select('*')
        .eq('project', project.toLowerCase())
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(options.maxResults || 50)

      return {
        data: cachedMentions || [],
        meta: { result_count: cachedMentions?.length || 0 },
        cached: true,
        error: error.message
      }
    }
  }

  /**
   * Add account to tracking list
   */
  async addTrackedAccount(accountData) {
    try {
      const { data, error } = await supabase
        .from('tracked_accounts')
        .insert({
          account_type: accountData.type,
          account_identifier: accountData.identifier,
          account_name: accountData.name,
          follower_count: accountData.followerCount || 0,
          is_verified: accountData.isVerified || false,
          influence_score: accountData.influenceScore || 0.5
        })
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error adding tracked account:', error)
      throw error
    }
  }

  /**
   * Get user's tracked accounts
   */
  async getTrackedAccounts() {
    try {
      const { data, error } = await supabase
        .from('tracked_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching tracked accounts:', error)
      return []
    }
  }

  /**
   * Create monitoring configuration
   */
  async createMonitoringConfig(config) {
    try {
      const { data, error } = await supabase
        .from('monitoring_configs')
        .insert({
          project_name: config.projectName,
          keywords: config.keywords || [],
          tracked_accounts: config.trackedAccounts || [],
          alert_thresholds: config.alertThresholds || {},
          notification_settings: config.notificationSettings || {}
        })
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error creating monitoring config:', error)
      throw error
    }
  }

  /**
   * Get user's monitoring configurations
   */
  async getMonitoringConfigs() {
    try {
      const { data, error } = await supabase
        .from('monitoring_configs')
        .select(`
          *,
          tracked_accounts:tracked_accounts(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching monitoring configs:', error)
      return []
    }
  }

  /**
   * Get monitoring alerts
   */
  async getMonitoringAlerts(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('monitoring_alerts')
        .select(`
          *,
          monitoring_config:monitoring_configs(project_name)
        `)
        .order('triggered_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('Error fetching monitoring alerts:', error)
      return []
    }
  }

  /**
   * Get cached sentiment analysis
   */
  async getCachedSentiment(project, timeframe = '24h') {
    try {
      const timeframeStart = new Date()
      if (timeframe === '24h') {
        timeframeStart.setHours(timeframeStart.getHours() - 24)
      } else if (timeframe === '7d') {
        timeframeStart.setDate(timeframeStart.getDate() - 7)
      }

      const { data, error } = await supabase
        .from('twitter_mentions')
        .select('*')
        .eq('project', project.toLowerCase())
        .gte('created_at', timeframeStart.toISOString())
        .not('sentiment_analysis', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process sentiment data
      if (!data || data.length === 0) {
        return {
          project,
          sentiment_score: 0.5,
          confidence: 0.5,
          explanation: 'No sentiment data available',
          metrics: {
            total_mentions: 0,
            positive_mentions: 0,
            negative_mentions: 0,
            neutral_mentions: 0
          },
          key_insights: ['No data available'],
          sample_analyses: []
        }
      }

      // Calculate aggregated sentiment
      const sentimentScores = data.map(m => m.sentiment_score).filter(s => s !== null)
      const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length

      const sentimentCounts = data.reduce((counts, mention) => {
        const sentiment = mention.sentiment_analysis?.sentiment || 'neutral'
        counts[sentiment] = (counts[sentiment] || 0) + 1
        return counts
      }, { positive: 0, negative: 0, neutral: 0 })

      const dominantSentiment = Object.keys(sentimentCounts).reduce((a, b) => 
        sentimentCounts[a] > sentimentCounts[b] ? a : b
      )

      return {
        project,
        sentiment_score: Math.round(avgSentiment * 100) / 100,
        confidence: 0.8, // High confidence for cached data
        explanation: `Analysis of ${data.length} cached mentions shows ${dominantSentiment} sentiment (${Math.round(avgSentiment * 100)}% score)`,
        metrics: {
          total_mentions: data.length,
          positive_mentions: sentimentCounts.positive,
          negative_mentions: sentimentCounts.negative,
          neutral_mentions: sentimentCounts.neutral
        },
        key_insights: [
          `${dominantSentiment.charAt(0).toUpperCase() + dominantSentiment.slice(1)} sentiment dominates (${sentimentCounts[dominantSentiment]} mentions)`,
          `Average sentiment score: ${Math.round(avgSentiment * 100)}%`
        ],
        sample_analyses: data.slice(0, 3).map(m => ({
          text: m.text.substring(0, 150) + (m.text.length > 150 ? '...' : ''),
          sentiment: m.sentiment_analysis?.sentiment || 'neutral',
          score: m.sentiment_score,
          explanation: m.sentiment_analysis?.explanation || 'No explanation available'
        }))
      }

    } catch (error) {
      console.error('Error fetching cached sentiment:', error)
      return {
        project,
        sentiment_score: 0.5,
        confidence: 0.5,
        explanation: 'Error loading sentiment data',
        metrics: { total_mentions: 0, positive_mentions: 0, negative_mentions: 0, neutral_mentions: 0 },
        key_insights: ['Error loading data'],
        sample_analyses: []
      }
    }
  }

  /**
   * Trigger periodic monitoring manually
   */
  async triggerPeriodicMonitoring() {
    try {
      const { data, error } = await supabase.functions.invoke('periodic-monitoring', {
        body: { manual_trigger: true }
      })

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error triggering periodic monitoring:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time alerts
   */
  subscribeToAlerts(callback) {
    return supabase
      .channel('monitoring_alerts')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'monitoring_alerts' 
        }, 
        callback
      )
      .subscribe()
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats() {
    try {
      const { data, error } = await supabase
        .from('api_rate_limits')
        .select('*')

      if (error) throw error

      return data?.reduce((stats, limit) => {
        stats[limit.service] = {
          endpoint: limit.endpoint,
          remaining: limit.requests_remaining,
          limit: limit.requests_limit,
          resetTime: limit.reset_time,
          usage: Math.round(((limit.requests_limit - limit.requests_remaining) / limit.requests_limit) * 100)
        }
        return stats
      }, {}) || {}

    } catch (error) {
      console.error('Error fetching API usage stats:', error)
      return {}
    }
  }
}

export default new SupabaseService()
