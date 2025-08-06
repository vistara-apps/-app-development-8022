import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, TrendingUp, Bell, Activity, Check, Star } from 'lucide-react'
import { usePaymentContext } from '../hooks/usePaymentContext'
import { useAuth } from '../context/AuthContext'

const Home = () => {
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [paid, setPaid] = useState(false)
  const { createSession } = usePaymentContext()
  const { upgradeSubscription } = useAuth()

  const features = [
    {
      icon: Activity,
      title: 'High-Signal Account Monitoring',
      description: 'Track influential crypto accounts and get real-time updates from market leaders'
    },
    {
      icon: Bell,
      title: 'Project Mention Alerts',
      description: 'Discover emerging crypto projects early with instant mention notifications'
    },
    {
      icon: TrendingUp,
      title: 'Sentiment Analysis',
      description: 'AI-powered sentiment tracking for informed investment decisions'
    },
    {
      icon: Shield,
      title: 'Market Intelligence',
      description: 'Comprehensive market sentiment and trend analysis'
    }
  ]

  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: ['Basic sentiment tracking', '5 project alerts', 'Daily reports'],
      popular: false
    },
    {
      name: 'Pro',
      price: '$29',
      features: ['Advanced AI insights', 'Unlimited alerts', 'Real-time monitoring', 'Priority support'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$99',
      features: ['Custom integrations', 'API access', 'White-label solution', 'Dedicated support'],
      popular: false
    }
  ]

  const handlePayment = async (plan) => {
    try {
      const amount = plan === 'Pro' ? '$29' : '$99'
      await createSession(amount)
      upgradeSubscription(plan.toLowerCase())
      setPaid(true)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Harness the power</span><br />
              of crypto market intelligence
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Track high-signal crypto accounts, discover new projects early, and analyze market sentiment 
              with AI-powered insights for informed trading and investing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/dashboard" 
                className="crypto-button px-8 py-3 rounded-lg font-semibold text-black"
              >
                Start Free Trial
              </Link>
              <button className="px-8 py-3 rounded-lg border border-crypto-accent text-crypto-accent hover:bg-crypto-accent hover:text-black transition-colors">
                View Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-crypto-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold gradient-text mb-4">
              Comprehensive Crypto Intelligence
            </h2>
            <p className="text-gray-300 text-lg">
              Everything you need to stay ahead in the crypto market
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="crypto-card p-6 rounded-lg text-center">
                  <Icon className="h-12 w-12 text-crypto-accent mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold gradient-text mb-4">
              Choose Your Plan
            </h2>
            <p className="text-gray-300 text-lg">
              Flexible pricing for traders and investors of all levels
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`crypto-card p-8 rounded-lg relative ${
                  plan.popular ? 'border-crypto-accent' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-crypto-accent text-black px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold gradient-text mb-6">
                    {plan.price}
                    {plan.price !== '$0' && <span className="text-lg text-gray-400">/month</span>}
                  </div>
                  
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-crypto-green mr-3" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.name === 'Free' ? (
                    <Link 
                      to="/dashboard"
                      className="w-full crypto-button py-3 rounded-lg font-semibold text-black block text-center"
                    >
                      Get Started
                    </Link>
                  ) : (
                    <button 
                      onClick={() => handlePayment(plan.name)}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                        plan.popular 
                          ? 'crypto-button text-black' 
                          : 'border border-crypto-accent text-crypto-accent hover:bg-crypto-accent hover:text-black'
                      }`}
                    >
                      {paid ? 'Purchased!' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home