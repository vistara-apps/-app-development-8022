import React from 'react'
import { 
  Search, 
  Plus, 
  Activity, 
  Bell, 
  TrendingUp, 
  Users, 
  Database,
  Inbox,
  BarChart3,
  Shield
} from 'lucide-react'
import { Button } from './FormComponents'

// Generic Empty State Component
export const EmptyState = ({ 
  icon: Icon = Inbox,
  title = "No data available",
  message = "There's nothing to show here yet.",
  actionLabel,
  onAction,
  className = ""
}) => (
  <div className={`text-center py-16 px-6 ${className}`}>
    <div className="max-w-md mx-auto">
      <div className="crypto-card p-8 rounded-lg">
        <Icon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="inline-flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  </div>
)

// No Search Results
export const NoSearchResults = ({ 
  searchTerm, 
  onClearSearch,
  suggestions = []
}) => (
  <div className="text-center py-16 px-6">
    <div className="max-w-md mx-auto">
      <div className="crypto-card p-8 rounded-lg">
        <Search className="h-16 w-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
        <p className="text-gray-400 mb-6">
          We couldn't find anything matching "{searchTerm}". Try adjusting your search.
        </p>
        
        {suggestions.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-3">Try searching for:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onClearSearch?.(suggestion)}
                  className="px-3 py-1 text-sm bg-crypto-dark border border-gray-600 rounded-full text-gray-300 hover:text-white hover:border-crypto-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {onClearSearch && (
          <Button 
            onClick={() => onClearSearch('')}
            variant="secondary"
            size="sm"
          >
            Clear Search
          </Button>
        )}
      </div>
    </div>
  </div>
)

// No Monitoring Accounts
export const NoMonitoringAccounts = ({ onAddAccount }) => (
  <EmptyState
    icon={Users}
    title="No accounts being monitored"
    message="Start tracking influential crypto accounts to get real-time insights and signals."
    actionLabel="Add First Account"
    onAction={onAddAccount}
  />
)

// No Alerts
export const NoAlerts = ({ onCreateAlert }) => (
  <EmptyState
    icon={Bell}
    title="No alerts configured"
    message="Set up alerts to get notified about important crypto market movements and mentions."
    actionLabel="Create First Alert"
    onAction={onCreateAlert}
  />
)

// No Sentiment Data
export const NoSentimentData = ({ onRefresh }) => (
  <EmptyState
    icon={TrendingUp}
    title="No sentiment data available"
    message="We're still gathering sentiment data for this project. Check back in a few minutes."
    actionLabel="Refresh Data"
    onAction={onRefresh}
  />
)

// No Dashboard Data
export const NoDashboardData = ({ onRefresh }) => (
  <EmptyState
    icon={BarChart3}
    title="No market data available"
    message="We're loading the latest market intelligence. This usually takes just a moment."
    actionLabel="Refresh Dashboard"
    onAction={onRefresh}
  />
)

// No Activity/Mentions
export const NoActivity = ({ timeframe = "today" }) => (
  <EmptyState
    icon={Activity}
    title={`No activity ${timeframe}`}
    message={`There haven't been any significant mentions or signals ${timeframe}. This could indicate a quiet market period.`}
  />
)

// First Time User Welcome
export const WelcomeState = ({ onGetStarted }) => (
  <div className="text-center py-16 px-6">
    <div className="max-w-lg mx-auto">
      <div className="crypto-card p-8 rounded-lg">
        <Shield className="h-20 w-20 text-crypto-accent mx-auto mb-6" />
        <h2 className="text-2xl font-bold gradient-text mb-4">
          Welcome to CryptoSentinel
        </h2>
        <p className="text-gray-300 mb-8 text-lg">
          Your AI-powered crypto market intelligence platform. Let's get you set up to start tracking the market like a pro.
        </p>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center text-left">
            <div className="flex-shrink-0 w-8 h-8 bg-crypto-accent rounded-full flex items-center justify-center text-black font-semibold text-sm mr-4">
              1
            </div>
            <div>
              <h4 className="font-semibold text-white">Monitor Key Accounts</h4>
              <p className="text-gray-400 text-sm">Track influential crypto personalities and analysts</p>
            </div>
          </div>
          
          <div className="flex items-center text-left">
            <div className="flex-shrink-0 w-8 h-8 bg-crypto-accent rounded-full flex items-center justify-center text-black font-semibold text-sm mr-4">
              2
            </div>
            <div>
              <h4 className="font-semibold text-white">Analyze Sentiment</h4>
              <p className="text-gray-400 text-sm">Get AI-powered insights on market sentiment</p>
            </div>
          </div>
          
          <div className="flex items-center text-left">
            <div className="flex-shrink-0 w-8 h-8 bg-crypto-accent rounded-full flex items-center justify-center text-black font-semibold text-sm mr-4">
              3
            </div>
            <div>
              <h4 className="font-semibold text-white">Set Up Alerts</h4>
              <p className="text-gray-400 text-sm">Never miss important market movements</p>
            </div>
          </div>
        </div>
        
        {onGetStarted && (
          <Button onClick={onGetStarted} size="lg">
            Get Started
          </Button>
        )}
      </div>
    </div>
  </div>
)

// Loading Failed State
export const LoadingFailed = ({ onRetry, resource = "data" }) => (
  <EmptyState
    icon={Database}
    title={`Failed to load ${resource}`}
    message={`We encountered an issue loading the ${resource}. This might be a temporary problem.`}
    actionLabel="Try Again"
    onAction={onRetry}
  />
)

// Maintenance Mode
export const MaintenanceMode = ({ estimatedTime }) => (
  <div className="text-center py-16 px-6">
    <div className="max-w-md mx-auto">
      <div className="crypto-card p-8 rounded-lg">
        <Shield className="h-16 w-16 text-crypto-accent mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Under Maintenance</h3>
        <p className="text-gray-400 mb-4">
          We're performing scheduled maintenance to improve your experience.
        </p>
        {estimatedTime && (
          <p className="text-sm text-crypto-accent">
            Estimated completion: {estimatedTime}
          </p>
        )}
      </div>
    </div>
  </div>
)

// Coming Soon Feature
export const ComingSoon = ({ featureName, description }) => (
  <div className="text-center py-16 px-6">
    <div className="max-w-md mx-auto">
      <div className="crypto-card p-8 rounded-lg border-2 border-dashed border-gray-600">
        <div className="h-16 w-16 bg-gradient-to-br from-crypto-accent to-crypto-gold rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚀</span>
        </div>
        <h3 className="text-xl font-semibold gradient-text mb-2">
          {featureName || "Coming Soon"}
        </h3>
        <p className="text-gray-400">
          {description || "This feature is currently in development. Stay tuned for updates!"}
        </p>
      </div>
    </div>
  </div>
)

export default {
  EmptyState,
  NoSearchResults,
  NoMonitoringAccounts,
  NoAlerts,
  NoSentimentData,
  NoDashboardData,
  NoActivity,
  WelcomeState,
  LoadingFailed,
  MaintenanceMode,
  ComingSoon
}
