import React from 'react'
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Server, Database } from 'lucide-react'
import { Button } from './FormComponents'

// Generic Error Component
export const ErrorState = ({ 
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  showRetry = true,
  icon: Icon = AlertTriangle,
  className = ""
}) => (
  <div className={`text-center py-12 px-6 ${className}`}>
    <div className="crypto-card p-8 rounded-lg max-w-md mx-auto">
      <Icon className="h-16 w-16 text-crypto-red mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-300 mb-6">{message}</p>
      {showRetry && onRetry && (
        <Button 
          onClick={onRetry}
          variant="secondary"
          className="inline-flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  </div>
)

// Network Error Component
export const NetworkError = ({ onRetry }) => (
  <ErrorState
    title="Connection Problem"
    message="Unable to connect to our servers. Please check your internet connection and try again."
    onRetry={onRetry}
    icon={WifiOff}
  />
)

// Server Error Component
export const ServerError = ({ onRetry }) => (
  <ErrorState
    title="Server Error"
    message="Our servers are experiencing issues. We're working to fix this. Please try again in a few moments."
    onRetry={onRetry}
    icon={Server}
  />
)

// Data Loading Error Component
export const DataError = ({ onRetry, dataType = "data" }) => (
  <ErrorState
    title={`Failed to Load ${dataType}`}
    message={`We couldn't load the ${dataType.toLowerCase()}. This might be a temporary issue.`}
    onRetry={onRetry}
    icon={Database}
  />
)

// API Error Component
export const APIError = ({ 
  error, 
  onRetry,
  showDetails = false 
}) => {
  const getErrorMessage = (error) => {
    if (error?.response?.status === 401) {
      return "Your session has expired. Please log in again."
    }
    if (error?.response?.status === 403) {
      return "You don't have permission to access this resource."
    }
    if (error?.response?.status === 404) {
      return "The requested resource was not found."
    }
    if (error?.response?.status >= 500) {
      return "Server error. Please try again later."
    }
    return error?.message || "An unexpected error occurred."
  }

  return (
    <div className="text-center py-12 px-6">
      <div className="crypto-card p-8 rounded-lg max-w-md mx-auto">
        <AlertTriangle className="h-16 w-16 text-crypto-red mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Request Failed</h3>
        <p className="text-gray-300 mb-4">{getErrorMessage(error)}</p>
        
        {showDetails && error?.response?.data && (
          <details className="text-left mb-6">
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-crypto-darker rounded text-xs text-gray-400 overflow-auto">
              {JSON.stringify(error.response.data, null, 2)}
            </pre>
          </details>
        )}
        
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="secondary"
            className="inline-flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

// Form Validation Error Component
export const FormError = ({ errors = [], className = "" }) => {
  if (!errors.length) return null

  return (
    <div className={`crypto-card border-crypto-red bg-crypto-red bg-opacity-10 p-4 rounded-lg ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-crypto-red mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-crypto-red mb-1">
            Please fix the following errors:
          </h4>
          <ul className="text-sm text-crypto-red space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// Inline Error Message
export const InlineError = ({ message, className = "" }) => {
  if (!message) return null

  return (
    <div className={`flex items-center text-crypto-red text-sm ${className}`}>
      <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// Offline State Component
export const OfflineState = () => (
  <div className="fixed bottom-4 left-4 right-4 z-50">
    <div className="crypto-card bg-crypto-red p-4 rounded-lg shadow-lg max-w-sm mx-auto">
      <div className="flex items-center">
        <WifiOff className="h-5 w-5 text-white mr-3" />
        <div>
          <p className="text-white font-medium text-sm">You're offline</p>
          <p className="text-gray-200 text-xs">Check your internet connection</p>
        </div>
      </div>
    </div>
  </div>
)

// Rate Limit Error
export const RateLimitError = ({ resetTime, onRetry }) => {
  const [timeLeft, setTimeLeft] = React.useState(0)

  React.useEffect(() => {
    if (resetTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, resetTime - now)
        setTimeLeft(Math.ceil(remaining / 1000))
        
        if (remaining <= 0) {
          clearInterval(interval)
        }
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [resetTime])

  return (
    <ErrorState
      title="Rate Limit Exceeded"
      message={
        timeLeft > 0 
          ? `Too many requests. Please wait ${timeLeft} seconds before trying again.`
          : "Too many requests. Please wait a moment before trying again."
      }
      onRetry={timeLeft <= 0 ? onRetry : undefined}
      showRetry={timeLeft <= 0}
      icon={AlertTriangle}
    />
  )
}

export default {
  ErrorState,
  NetworkError,
  ServerError,
  DataError,
  APIError,
  FormError,
  InlineError,
  OfflineState,
  RateLimitError
}
