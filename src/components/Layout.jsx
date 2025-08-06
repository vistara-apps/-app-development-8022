import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Shield, TrendingUp, Bell, Activity, BarChart3 } from 'lucide-react'

const Layout = ({ children }) => {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Monitoring', href: '/monitoring', icon: Activity },
    { name: 'Sentiment', href: '/sentiment', icon: TrendingUp },
    { name: 'Alerts', href: '/alerts', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-crypto-darker">
      <nav className="bg-crypto-dark border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-crypto-accent" />
                <span className="text-xl font-bold gradient-text">CryptoSentinel</span>
              </Link>
              
              {location.pathname !== '/' && (
                <div className="hidden md:ml-10 md:flex md:space-x-8">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          location.pathname === item.href
                            ? 'text-crypto-accent bg-crypto-accent bg-opacity-10'
                            : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default Layout