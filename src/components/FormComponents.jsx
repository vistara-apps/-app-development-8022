import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react'

// Enhanced Input Component with validation
export const Input = ({ 
  label, 
  error, 
  success,
  type = "text", 
  className = "",
  required = false,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-crypto-red ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full px-4 py-3 rounded-lg border transition-all duration-200
            bg-crypto-dark text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-crypto-accent focus:border-transparent
            ${error 
              ? 'border-crypto-red focus:ring-crypto-red' 
              : success 
                ? 'border-crypto-green focus:ring-crypto-green'
                : focused
                  ? 'border-crypto-accent'
                  : 'border-gray-600 hover:border-gray-500'
            }
            ${className}
          `}
          {...props}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
        
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-crypto-red" />
        )}
        
        {success && (
          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-crypto-green" />
        )}
      </div>
      
      {error && (
        <p className="text-sm text-crypto-red flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {success && (
        <p className="text-sm text-crypto-green flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          {success}
        </p>
      )}
    </div>
  )
}

// Enhanced Select Component
export const Select = ({ 
  label, 
  error, 
  options = [], 
  className = "",
  required = false,
  ...props 
}) => {
  const [focused, setFocused] = useState(false)

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-crypto-red ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full px-4 py-3 rounded-lg border transition-all duration-200
            bg-crypto-dark text-white
            focus:outline-none focus:ring-2 focus:ring-crypto-accent focus:border-transparent
            appearance-none cursor-pointer
            ${error 
              ? 'border-crypto-red focus:ring-crypto-red' 
              : focused
                ? 'border-crypto-accent'
                : 'border-gray-600 hover:border-gray-500'
            }
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-crypto-dark">
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {error && (
          <AlertCircle className="absolute right-10 top-1/2 transform -translate-y-1/2 h-5 w-5 text-crypto-red" />
        )}
      </div>
      
      {error && (
        <p className="text-sm text-crypto-red flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  )
}

// Enhanced Button Component
export const Button = ({ 
  children, 
  variant = "primary", 
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props 
}) => {
  const baseClasses = "font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-crypto-darker disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variants = {
    primary: "crypto-button text-black hover:scale-105 focus:ring-crypto-accent",
    secondary: "border border-crypto-accent text-crypto-accent hover:bg-crypto-accent hover:text-black focus:ring-crypto-accent",
    danger: "bg-crypto-red text-white hover:bg-red-600 focus:ring-crypto-red",
    ghost: "text-gray-300 hover:text-white hover:bg-gray-700 focus:ring-gray-500"
  }
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${loading ? 'relative' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <span className={loading ? 'invisible' : 'visible'}>
        {children}
      </span>
    </button>
  )
}

// Toast Notification Component
export const Toast = ({ 
  message, 
  type = "info", 
  onClose, 
  autoClose = true,
  duration = 5000 
}) => {
  const [visible, setVisible] = useState(true)

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300) // Allow fade out animation
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  const types = {
    success: {
      bg: "bg-crypto-green",
      icon: CheckCircle,
      text: "text-white"
    },
    error: {
      bg: "bg-crypto-red", 
      icon: AlertCircle,
      text: "text-white"
    },
    info: {
      bg: "bg-crypto-accent",
      icon: AlertCircle,
      text: "text-black"
    }
  }

  const config = types[type]
  const Icon = config.icon

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-in-out
      ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className={`
        ${config.bg} ${config.text} p-4 rounded-lg shadow-lg
        flex items-center space-x-3
      `}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={() => {
            setVisible(false)
            setTimeout(onClose, 300)
          }}
          className="flex-shrink-0 hover:opacity-75 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Search Input Component
export const SearchInput = ({ 
  placeholder = "Search...", 
  onSearch,
  className = "",
  ...props 
}) => {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch?.(value)
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-600 bg-crypto-dark text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crypto-accent focus:border-transparent transition-all duration-200"
        {...props}
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </form>
  )
}

export default {
  Input,
  Select,
  Button,
  Toast,
  SearchInput
}
