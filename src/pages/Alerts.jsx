import React, { useState, useEffect } from 'react'
import { Plus, Bell, Trash2, Edit, Save, X } from 'lucide-react'

const Alerts = () => {
  const [alerts, setAlerts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    project: '',
    condition: 'mention_increase',
    threshold: '',
    notification: 'email'
  })

  useEffect(() => {
    // Initialize with sample alerts
    setAlerts([
      {
        id: 1,
        project: 'Bitcoin',
        condition: 'mention_increase',
        threshold: '20%',
        notification: 'email',
        status: 'active',
        triggered: 3,
        created: '2024-01-15'
      },
      {
        id: 2,
        project: 'Ethereum',
        condition: 'sentiment_drop',
        threshold: '40%',
        notification: 'push',
        status: 'active',
        triggered: 1,
        created: '2024-01-14'
      },
      {
        id: 3,
        project: 'Solana',
        condition: 'new_mention',
        threshold: '10',
        notification: 'email',
        status: 'paused',
        triggered: 8,
        created: '2024-01-13'
      }
    ])
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (editingId) {
      setAlerts(alerts.map(alert => 
        alert.id === editingId 
          ? { ...alert, ...formData }
          : alert
      ))
      setEditingId(null)
    } else {
      const newAlert = {
        id: Date.now(),
        ...formData,
        status: 'active',
        triggered: 0,
        created: new Date().toISOString().split('T')[0]
      }
      setAlerts([...alerts, newAlert])
    }
    
    setFormData({
      project: '',
      condition: 'mention_increase',
      threshold: '',
      notification: 'email'
    })
    setShowForm(false)
  }

  const editAlert = (alert) => {
    setFormData({
      project: alert.project,
      condition: alert.condition,
      threshold: alert.threshold,
      notification: alert.notification
    })
    setEditingId(alert.id)
    setShowForm(true)
  }

  const deleteAlert = (id) => {
    setAlerts(alerts.filter(alert => alert.id !== id))
  }

  const toggleStatus = (id) => {
    setAlerts(alerts.map(alert => 
      alert.id === id 
        ? { ...alert, status: alert.status === 'active' ? 'paused' : 'active' }
        : alert
    ))
  }

  const conditionLabels = {
    mention_increase: 'Mention Increase',
    sentiment_drop: 'Sentiment Drop',
    sentiment_rise: 'Sentiment Rise',
    new_mention: 'New Mentions',
    volume_spike: 'Volume Spike'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Alert Management</h1>
        <p className="text-gray-300 mt-2">Configure alerts for crypto projects and market conditions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="crypto-card p-6 rounded-lg">
          <div className="flex items-center">
            <Bell className="h-8 w-8 text-crypto-accent mr-3" />
            <div>
              <p className="text-sm text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="crypto-card p-6 rounded-lg">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-crypto-gold rounded-full flex items-center justify-center mr-3">
              <span className="text-black font-bold">!</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Triggered</p>
              <p className="text-2xl font-bold">{alerts.reduce((sum, alert) => sum + alert.triggered, 0)}</p>
            </div>
          </div>
        </div>
        <div className="crypto-card p-6 rounded-lg">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-crypto-green rounded-full flex items-center justify-center mr-3">
              <span className="text-black font-bold">✓</span>
            </div>
            <div>
              <p className="text-sm text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold">94%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Alert Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="crypto-button px-6 py-3 rounded-lg font-semibold text-black flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Alert
        </button>
      </div>

      {/* Alert Form */}
      {showForm && (
        <div className="crypto-card p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? 'Edit Alert' : 'Create New Alert'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({
                  project: '',
                  condition: 'mention_increase',
                  threshold: '',
                  notification: 'email'
                })
              }}
              className="p-2 hover:bg-gray-700 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Project</label>
              <input
                type="text"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="e.g., Bitcoin, Ethereum"
                className="w-full px-4 py-2 bg-crypto-darker border border-gray-600 rounded-lg focus:outline-none focus:border-crypto-accent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-4 py-2 bg-crypto-darker border border-gray-600 rounded-lg focus:outline-none focus:border-crypto-accent"
              >
                <option value="mention_increase">Mention Increase</option>
                <option value="sentiment_drop">Sentiment Drop</option>
                <option value="sentiment_rise">Sentiment Rise</option>
                <option value="new_mention">New Mentions</option>
                <option value="volume_spike">Volume Spike</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Threshold</label>
              <input
                type="text"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                placeholder="e.g., 20%, 100"
                className="w-full px-4 py-2 bg-crypto-darker border border-gray-600 rounded-lg focus:outline-none focus:border-crypto-accent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Notification</label>
              <select
                value={formData.notification}
                onChange={(e) => setFormData({ ...formData, notification: e.target.value })}
                className="w-full px-4 py-2 bg-crypto-darker border border-gray-600 rounded-lg focus:outline-none focus:border-crypto-accent"
              >
                <option value="email">Email</option>
                <option value="push">Push Notification</option>
                <option value="both">Both</option>
              </select>
            </div>
            
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="crypto-button px-6 py-2 rounded-lg font-semibold text-black flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update Alert' : 'Create Alert'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="crypto-card rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Your Alerts</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {alerts.map((alert) => (
            <div key={alert.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <h3 className="font-semibold">{alert.project}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.status === 'active' 
                      ? 'bg-crypto-green bg-opacity-20 text-crypto-green' 
                      : 'bg-gray-600 bg-opacity-20 text-gray-400'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {conditionLabels[alert.condition]} - {alert.threshold}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Created: {alert.created} • Triggered: {alert.triggered} times
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleStatus(alert.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    alert.status === 'active'
                      ? 'bg-gray-600 hover:bg-gray-500 text-white'
                      : 'bg-crypto-green hover:bg-crypto-green hover:bg-opacity-80 text-black'
                  }`}
                >
                  {alert.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                
                <button
                  onClick={() => editAlert(alert)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 hover:bg-red-600 hover:bg-opacity-20 rounded-lg transition-colors text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Alerts