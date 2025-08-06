import React from 'react'
import { Loader2 } from 'lucide-react'

// Skeleton loading component for cards
export const SkeletonCard = ({ className = "" }) => (
  <div className={`crypto-card p-6 rounded-lg animate-pulse ${className}`}>
    <div className="h-12 w-12 bg-gray-700 rounded-lg mx-auto mb-4"></div>
    <div className="h-6 bg-gray-700 rounded mb-3"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
    </div>
  </div>
)

// Skeleton loading for dashboard stats
export const SkeletonStats = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="crypto-card p-6 rounded-lg animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-700 rounded w-20"></div>
          <div className="h-6 w-6 bg-gray-700 rounded"></div>
        </div>
        <div className="h-8 bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-16"></div>
      </div>
    ))}
  </div>
)

// Skeleton loading for charts
export const SkeletonChart = ({ height = "h-64" }) => (
  <div className={`crypto-card p-6 rounded-lg animate-pulse ${height}`}>
    <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
    <div className="flex items-end space-x-2 h-40">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="bg-gray-700 rounded-t flex-1"
          style={{ height: `${Math.random() * 80 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
)

// Skeleton loading for table rows
export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="crypto-card rounded-lg overflow-hidden">
    <div className="p-6">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 animate-pulse">
            {[...Array(cols)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Loading spinner component
export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-crypto-accent`} />
    </div>
  )
}

// Full page loading component
export const PageLoading = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="xl" className="mb-4" />
      <p className="text-gray-300 text-lg">{message}</p>
    </div>
  </div>
)

// Button loading state
export const LoadingButton = ({ 
  children, 
  loading = false, 
  disabled = false,
  className = "",
  ...props 
}) => (
  <button 
    disabled={disabled || loading}
    className={`relative ${className} ${loading || disabled ? 'opacity-75 cursor-not-allowed' : ''}`}
    {...props}
  >
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    )}
    <span className={loading ? 'invisible' : 'visible'}>
      {children}
    </span>
  </button>
)

// Skeleton for account monitoring cards
export const SkeletonAccountCard = () => (
  <div className="crypto-card p-6 rounded-lg animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
        <div>
          <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-16"></div>
        </div>
      </div>
      <div className="h-6 w-16 bg-gray-700 rounded"></div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <div className="h-3 bg-gray-700 rounded w-12 mb-1"></div>
        <div className="h-4 bg-gray-700 rounded w-8"></div>
      </div>
      <div>
        <div className="h-3 bg-gray-700 rounded w-16 mb-1"></div>
        <div className="h-4 bg-gray-700 rounded w-12"></div>
      </div>
      <div>
        <div className="h-3 bg-gray-700 rounded w-14 mb-1"></div>
        <div className="h-4 bg-gray-700 rounded w-10"></div>
      </div>
    </div>
  </div>
)

export default {
  SkeletonCard,
  SkeletonStats,
  SkeletonChart,
  SkeletonTable,
  LoadingSpinner,
  PageLoading,
  LoadingButton,
  SkeletonAccountCard
}
