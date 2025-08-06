import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, Bell, Eye, RefreshCw, Brain, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { generateMarketInsights } from '../services/aiService'
import { SkeletonStats, SkeletonChart, LoadingSpinner } from '../components/LoadingStates'
import { DataError } from '../components/ErrorStates'
import twitterService from '../services/twitterService'
import sentimentService from '../services/sentimentService'

const Dashboard = () => {
  const [marketData, setMarketData] = useState([])
  const [sentimentData, setSentimentData] = useState([])
  const [insights, setInsights] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState(null)

  useEffect(() => {
    // Simulate market data
    const generateMarketData = () => {
      const data = []
      for (let i = 0; i < 24; i++) {
        data.push({
          time: `${i}:00`,
          mentions: Math.floor(Math.random() * 100) + 50,
          sentiment: Math.random() * 100,
          volume: Math.floor(Math.random() * 1000) + 500
        })
      }
      return data
    }

    const generateSentimentData = () => [
      { project: 'Bitcoin', positive: 65, negative: 20, neutral: 15 },
      { project: 'Ethereum', positive: 70, negative: 15, neutral: 15 },
      { project: 'Solana', positive: 55, negative: 25, neutral: 20 },
      { project: 'Cardano', positive: 60, negative: 20, neutral: 20 },
    ]

    const loadData = async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, isRefresh ? 1000 : 2000))
        
        const market = generateMarketData()
        const sentiment = generateSentimentData()
        
        setMarketData(market)
        setSentimentData(sentiment)
        
        // Remove automatic AI insights generation - now manual only
        if (!insights) {
          setInsights('Click "Generate AI Insights" to analyze current market conditions with AI.')
        }
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    loadData()
  }, [])

  const handleRefresh = () => {
    loadData(true)
  }

  const generateAIInsights = async () => {
    setGeneratingInsights(true)
    setInsightsError(null)
    
    try {
      // Fetch real market data from services
      const [trendingTopics, bitcoinSentiment, ethereumSentiment, solanaSentiment] = await Promise.allSettled([
        twitterService.getTrendingTopics(),
        sentimentService.analyzeProjectSentiment('Bitcoin', { timeframe: '24h', sampleSize: 50 }),
        sentimentService.analyzeProjectSentiment('Ethereum', { timeframe: '24h', sampleSize: 50 }),
        sentimentService.analyzeProjectSentiment('Solana', { timeframe: '24h', sampleSize: 50 })
      ])

      // Process the results
      const trending = trendingTopics.status === 'fulfilled' ? trendingTopics.value : []
      const sentiments = [
        bitcoinSentiment.status === 'fulfilled' ? bitcoinSentiment.value : null,
        ethereumSentiment.status === 'fulfilled' ? ethereumSentiment.value : null,
        solanaSentiment.status === 'fulfilled' ? solanaSentiment.value : null
      ].filter(Boolean)

      // Calculate market metrics
      const topMentions = trending.slice(0, 5).map(t => t.topic)
      const totalVolume = trending.reduce((sum, t) => sum + t.volume, 0)
      const averageSentiment = sentiments.length > 0 
        ? sentiments.reduce((sum, s) => sum + s.sentiment_score, 0) / sentiments.length 
        : 0.5
      
      const marketTrend = averageSentiment > 0.6 ? 'bullish' : averageSentiment < 0.4 ? 'bearish' : 'neutral'

      // Prepare comprehensive data for AI analysis
      const marketData = {
        marketTrend,
        topMentions,
        averageSentiment,
        totalVolume,
        trendingTopics: trending,
        sentimentAnalysis: sentiments,
        timestamp: new Date().toISOString(),
        timeframe: '24h'
      }

      // Generate AI insights with real data
      const aiInsights = await generateMarketInsights(marketData)
      setInsights(aiInsights)
      
    } catch (error) {
      console.error('Error generating AI insights:', error)
      setInsightsError('Failed to generate AI insights. Please try again.')
      setInsights('Unable to generate AI insights at this time. Please check your connection and try again.')
    } finally {
      setGeneratingInsights(false)
    }
  }

  const stats = [
    {
      name: 'Active Monitors',
      value: '24',
      change: '+12%',
      trend: 'up',
      icon: Activity
    },
    {
      name: 'New Mentions',
      value: '1,247',
      change: '+23%',
      trend: 'up',
      icon: Eye
    },
    {
      name: 'Avg Sentiment',
      value: '68%',
      change: '-5%',
      trend: 'down',
      icon: TrendingUp
    },
    {
      name: 'Active Alerts',
      value: '8',
      change: '+2',
      trend: 'up',
      icon: Bell
    }
  ]

  if (error) {
    return (
      <div className="min-h-screen">
        <DataError 
          onRetry={handleRefresh}
          dataType="Dashboard Data"
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 page-transition">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-gray-300 mt-2">Real-time crypto market intelligence overview</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-crypto-accent transition-colors disabled:opacity-50 focus-ring"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="crypto-card p-4 sm:p-6 rounded-lg hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                    <div className="flex items-center mt-2">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-crypto-green mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-crypto-red mr-1" />
                    )}
                    <span className={`text-sm ${stat.trend === 'up' ? 'text-crypto-green' : 'text-crypto-red'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <Icon className="h-8 w-8 text-crypto-accent" />
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {loading ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : (
          <>
            <div className="crypto-card p-4 sm:p-6 rounded-lg">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">24h Mention Activity</h2>
              <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="mentions" 
                stroke="#00D2FF" 
                strokeWidth={2}
                dot={{ fill: '#00D2FF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
            </div>

            <div className="crypto-card p-4 sm:p-6 rounded-lg">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Sentiment Analysis</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="project" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="positive" fill="#00FF88" />
                  <Bar dataKey="negative" fill="#FF4757" />
                  <Bar dataKey="neutral" fill="#6B7280" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* AI Insights */}
      <div className="crypto-card p-4 sm:p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-lg sm:text-xl font-semibold">AI Market Insights</h2>
          <button
            onClick={generateAIInsights}
            disabled={generatingInsights || loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-crypto-accent to-blue-500 text-white rounded-lg hover:from-crypto-accent/80 hover:to-blue-500/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
          >
            {generatingInsights ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                <span>Generate AI Insights</span>
                <Sparkles className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
        
        {insightsError && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{insightsError}</p>
          </div>
        )}
        
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-4/6"></div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed">{insights}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
