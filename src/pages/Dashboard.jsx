import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, Bell, Eye } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { generateMarketInsights } from '../services/aiService'

const Dashboard = () => {
  const [marketData, setMarketData] = useState([])
  const [sentimentData, setSentimentData] = useState([])
  const [insights, setInsights] = useState('')
  const [loading, setLoading] = useState(true)

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

    const loadData = async () => {
      const market = generateMarketData()
      const sentiment = generateSentimentData()
      
      setMarketData(market)
      setSentimentData(sentiment)
      
      try {
        const aiInsights = await generateMarketInsights({
          marketTrend: 'bullish',
          topMentions: ['Bitcoin', 'Ethereum', 'Solana'],
          averageSentiment: 0.65
        })
        setInsights(aiInsights)
      } catch (error) {
        setInsights('Market showing positive sentiment with increased activity in major cryptocurrencies.')
      }
      
      setLoading(false)
    }

    loadData()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-accent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-gray-300 mt-2">Real-time crypto market intelligence overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="crypto-card p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="crypto-card p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">24h Mention Activity</h2>
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

        <div className="crypto-card p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Sentiment Analysis</h2>
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
      </div>

      {/* AI Insights */}
      <div className="crypto-card p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">AI Market Insights</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 leading-relaxed">{insights}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard