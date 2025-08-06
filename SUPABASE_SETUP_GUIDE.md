# CryptoSentinel Supabase Setup Guide

## Overview

This guide will help you set up the secure Supabase backend for CryptoSentinel, which addresses the critical security and performance issues with the current implementation.

## 🚨 Issues Fixed

### Security Issues
- ✅ **Bearer Token Exposure**: Moved Twitter API calls to secure edge functions
- ✅ **CORS Problems**: Edge functions handle CORS properly
- ✅ **API Key Management**: All sensitive keys stored securely in Supabase

### Performance Issues  
- ✅ **Rate Limit Management**: Centralized rate limiting with database tracking
- ✅ **API Call Optimization**: Reduced from 10+ calls to 1-2 calls with caching
- ✅ **Periodic Monitoring**: Background jobs instead of real-time hammering

## 🏗️ Architecture Overview

```
Frontend (React) 
    ↓ (Secure HTTPS)
Supabase Edge Functions 
    ↓ (Server-side with secrets)
External APIs (Twitter, OpenRouter)
    ↓ (Cached results)
Supabase Database (PostgreSQL)
```

## 📋 Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key
3. Go to Settings → API to get your service role key

### 2. Set Environment Variables

Add these to your `.env` file:

```bash
# Frontend Environment Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Remove these (no longer needed in frontend)
# VITE_TWITTER_BEARER_TOKEN=
# VITE_OPENROUTER_API_KEY=
```

### 3. Configure Supabase Secrets

In your Supabase dashboard, go to Settings → Edge Functions and add these secrets:

```bash
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
OPENROUTER_API_KEY=your-openrouter-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 5. Deploy Edge Functions

```bash
# Deploy Twitter mentions function
supabase functions deploy twitter-mentions

# Deploy periodic monitoring function  
supabase functions deploy periodic-monitoring
```

### 6. Set Up Periodic Monitoring (Optional)

For automated monitoring every 5 minutes, set up a cron job:

```bash
# Using GitHub Actions (recommended)
# Add this to .github/workflows/monitoring.yml

name: Periodic Monitoring
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Monitoring
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://your-project.supabase.co/functions/v1/periodic-monitoring
```

### 7. Update Frontend Code

Install Supabase client:

```bash
npm install @supabase/supabase-js
```

The frontend services have been updated to use the secure Supabase service instead of direct API calls.

## 🔧 Usage Examples

### Add Tracked Account

```javascript
import supabaseService from './services/supabaseService.js'

// Add account to track
await supabaseService.addTrackedAccount({
  type: 'twitter',
  identifier: '@elonmusk',
  name: 'Elon Musk',
  followerCount: 150000000,
  isVerified: true,
  influenceScore: 0.95
})
```

### Create Monitoring Configuration

```javascript
// Set up monitoring for a project
await supabaseService.createMonitoringConfig({
  projectName: 'Bitcoin',
  keywords: ['bitcoin', 'BTC', '$BTC'],
  alertThresholds: {
    volume_threshold: 50,
    sentiment_threshold: 0.3
  },
  notificationSettings: {
    webhook_url: 'https://discord.com/api/webhooks/...'
  }
})
```

### Get Secure Sentiment Analysis

```javascript
// Get cached sentiment (fast, no API calls)
const sentiment = await supabaseService.getCachedSentiment('Bitcoin', '24h')

console.log(sentiment.explanation)
// "Analysis of 127 cached mentions shows positive sentiment (68% score)"
```

### Subscribe to Real-time Alerts

```javascript
// Listen for new alerts
const subscription = supabaseService.subscribeToAlerts((payload) => {
  console.log('New alert:', payload.new)
  // Show notification to user
})

// Unsubscribe when component unmounts
subscription.unsubscribe()
```

## 📊 Database Schema

### Core Tables

- **`tracked_accounts`**: User-defined accounts to monitor
- **`twitter_mentions`**: Cached Twitter data with sentiment analysis
- **`monitoring_configs`**: User monitoring configurations
- **`monitoring_alerts`**: Generated alerts and notifications
- **`api_rate_limits`**: Rate limit tracking for all APIs

### Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure user sessions
- **Service Role**: Separate permissions for edge functions

## 🚀 Benefits

### Security
- ✅ No API keys exposed in frontend
- ✅ All external API calls happen server-side
- ✅ Proper CORS handling
- ✅ Secure token management

### Performance  
- ✅ Reduced API calls (10+ → 1-2)
- ✅ Intelligent caching (2-5 minute cache)
- ✅ Rate limit management
- ✅ Background processing

### Scalability
- ✅ Database-backed monitoring
- ✅ Periodic jobs instead of real-time polling
- ✅ Horizontal scaling with edge functions
- ✅ Real-time subscriptions for alerts

### Cost Optimization
- ✅ Reduced API usage = lower costs
- ✅ Caching reduces redundant calls
- ✅ Batch processing for efficiency
- ✅ Free tier friendly

## 🔍 Monitoring & Debugging

### Check API Usage

```javascript
const usage = await supabaseService.getApiUsageStats()
console.log('Twitter API usage:', usage.twitter.usage + '%')
```

### View Recent Alerts

```javascript
const alerts = await supabaseService.getMonitoringAlerts(10)
alerts.forEach(alert => {
  console.log(`${alert.severity}: ${alert.title}`)
})
```

### Trigger Manual Monitoring

```javascript
// Force a monitoring check
const result = await supabaseService.triggerPeriodicMonitoring()
console.log('Processed:', result.processed, 'configs')
```

## 🛠️ Troubleshooting

### Common Issues

1. **Edge Function Deployment Fails**
   - Check that you have the latest Supabase CLI
   - Verify your project is linked correctly
   - Ensure secrets are set in the dashboard

2. **Rate Limits Hit**
   - Check API usage stats
   - Increase cache timeout if needed
   - Consider upgrading API plans

3. **No Cached Data**
   - Run periodic monitoring manually first
   - Check that monitoring configs are active
   - Verify edge functions are deployed

### Debug Commands

```bash
# Check edge function logs
supabase functions logs twitter-mentions

# Test edge function locally
supabase functions serve twitter-mentions

# Check database
supabase db diff
```

## 🎯 Next Steps

1. **Deploy the setup** following this guide
2. **Test with a few accounts** to verify everything works
3. **Set up monitoring configs** for your crypto projects
4. **Configure alerts** for important events
5. **Scale up** as needed

This architecture provides a solid, secure foundation that can handle everything from individual users to enterprise-scale monitoring! 🚀
