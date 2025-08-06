import React, { useState, useEffect } from 'react'
import { Plus, Eye, EyeOff, TrendingUp, Users, Calendar } from 'lucide-react'

const Monitoring = () => {
  const [accounts, setAccounts] = useState([])
  const [newAccount, setNewAccount] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading accounts
    setTimeout(() => {
      setAccounts([
        {
          id: 1,
          username: '@elonmusk',
          followers: '150M',
          status: 'active',
          lastMention: '2 hours ago',
          signals: 45,
          avatar: '🚀'
        },
        {
          id: 2,
          username: '@VitalikButerin',
          followers: '5.1M',
          status: 'active',
          lastMention: '4 hours ago',
          signals: 32,
          avatar: '🦄'
        },
        {
          id: 3,
          username: '@APompliano',
          followers: '1.8M',
          status: 'paused',
          lastMention: '1 day ago',
          signals: 28,
          avatar: '💎'
        },
        {
          id: 4,
          username: '@cz_binance',
          followers: '8.2M',
          status: 'active',
          lastMention: '6 hours ago',
          signals: 56,
          avatar: '⚡'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const addAccount = () => {
    if (newAccount.trim()) {
      const account = {
        id: Date.now(),
        username: newAccount.startsWith('@') ? newAccount : `@${newAccount}`,
        followers: '0',
        status: 'active',
        lastMention: 'Never',
        signals: 0,
        avatar: '👤'
      }
      setAccounts([...accounts, account])
      setNewAccount('')
    }
  }

  const toggleStatus = (id) => {
    setAccounts(accounts.map(account => 
      account.id === id 
        ? { ...account, status: account.status === 'active' ? 'paused' : 'active' }
        : account
    ))
  }

  const removeAccount = (id) => {
    setAccounts(accounts.filter(account => account.id !== id))
  }

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
        <h1 className="text-3xl font-bold gradient-text">Account Monitoring</h1>
        <p className="text-gray-300 mt-2">Track high-signal crypto accounts and influencers</p>
      </div>

      {/* Add New Account */}
      <div className="crypto-card p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Account</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            placeholder="Enter Twitter username (e.g., @elonmusk)"
            className="flex-1 px-4 py-2 bg-crypto-darker border border-gray-600 rounded-lg focus:outline-none focus:border-crypto-accent"
            onKeyPress={(e) => e.key === 'Enter' && addAccount()}
          />
          <button
            onClick={addAccount}
            className="crypto-button px-6 py-2 rounded-lg font-semibold text-black flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="crypto-card p-6 rounded-lg">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-crypto-accent mr-3" />
            <div>
              <p className="text-sm text-gray-400">Total Accounts</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
          </div>
        </div>
        <div className="crypto-card p-6 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-crypto-green mr-3" />
            <div>
              <p className="text-sm text-gray-400">Active Monitors</p>
              <p className="text-2xl font-bold">{accounts.filter(a => a.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="crypto-card p-6 rounded-lg">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-crypto-gold mr-3" />
            <div>
              <p className="text-sm text-gray-400">Total Signals</p>
              <p className="text-2xl font-bold">{accounts.reduce((sum, acc) => sum + acc.signals, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="crypto-card rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Monitored Accounts</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {accounts.map((account) => (
            <div key={account.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{account.avatar}</div>
                <div>
                  <h3 className="font-semibold">{account.username}</h3>
                  <p className="text-sm text-gray-400">{account.followers} followers</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Last Mention</p>
                  <p className="font-medium">{account.lastMention}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-400">Signals</p>
                  <p className="font-medium text-crypto-accent">{account.signals}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    account.status === 'active' 
                      ? 'bg-crypto-green bg-opacity-20 text-crypto-green' 
                      : 'bg-gray-600 bg-opacity-20 text-gray-400'
                  }`}>
                    {account.status}
                  </span>
                  
                  <button
                    onClick={() => toggleStatus(account.id)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {account.status === 'active' ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => removeAccount(account.id)}
                    className="p-2 hover:bg-red-600 hover:bg-opacity-20 rounded-lg transition-colors text-red-400"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Monitoring