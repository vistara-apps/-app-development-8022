-- Create tables for CryptoSentinel monitoring system

-- Table for tracking user-defined accounts to monitor
CREATE TABLE tracked_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('twitter', 'telegram', 'discord')),
  account_identifier VARCHAR(255) NOT NULL, -- username, handle, or ID
  account_name VARCHAR(255),
  follower_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  influence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, account_type, account_identifier)
);

-- Table for storing Twitter mentions (cached data)
CREATE TABLE twitter_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project VARCHAR(100) NOT NULL,
  tweet_id VARCHAR(50) UNIQUE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  author_id VARCHAR(50),
  author_username VARCHAR(100),
  public_metrics JSONB, -- likes, retweets, replies, quotes
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sentiment_score DECIMAL(3,2), -- 0.0 to 1.0
  sentiment_analysis JSONB, -- full sentiment analysis result
  
  INDEX(project, created_at),
  INDEX(tweet_id),
  INDEX(author_id)
);

-- Table for API rate limit tracking
CREATE TABLE api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service VARCHAR(50) NOT NULL, -- 'twitter', 'openrouter', 'coingecko'
  endpoint VARCHAR(100) NOT NULL, -- 'search', 'user_timeline', etc.
  requests_remaining INTEGER NOT NULL DEFAULT 0,
  requests_limit INTEGER NOT NULL DEFAULT 300,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(service, endpoint)
);

-- Table for monitoring configurations
CREATE TABLE monitoring_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name VARCHAR(100) NOT NULL,
  keywords TEXT[], -- array of keywords to monitor
  tracked_accounts UUID[] DEFAULT '{}', -- references to tracked_accounts.id
  alert_thresholds JSONB NOT NULL DEFAULT '{}', -- volume, sentiment thresholds
  notification_settings JSONB NOT NULL DEFAULT '{}', -- webhook URLs, email settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_check TIMESTAMP WITH TIME ZONE,
  
  INDEX(user_id),
  INDEX(project_name),
  INDEX(is_active, last_check)
);

-- Table for storing alerts/notifications
CREATE TABLE monitoring_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitoring_config_id UUID REFERENCES monitoring_configs(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'volume_spike', 'sentiment_change', 'influencer_mention'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- additional alert data
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  INDEX(monitoring_config_id, triggered_at),
  INDEX(severity, triggered_at)
);

-- Table for periodic job tracking
CREATE TABLE monitoring_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL, -- 'mention_check', 'sentiment_analysis', 'alert_processing'
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB, -- job-specific data
  
  INDEX(job_type, status),
  INDEX(started_at)
);

-- Create indexes for better performance
CREATE INDEX idx_twitter_mentions_project_time ON twitter_mentions(project, created_at DESC);
CREATE INDEX idx_monitoring_configs_active ON monitoring_configs(is_active, last_check) WHERE is_active = true;
CREATE INDEX idx_tracked_accounts_user ON tracked_accounts(user_id, is_active) WHERE is_active = true;

-- Insert default rate limits
INSERT INTO api_rate_limits (service, endpoint, requests_remaining, requests_limit, reset_time) VALUES
('twitter', 'search', 300, 300, NOW() + INTERVAL '15 minutes'),
('twitter', 'user_timeline', 1500, 1500, NOW() + INTERVAL '15 minutes'),
('openrouter', 'chat', 1000, 1000, NOW() + INTERVAL '1 hour'),
('coingecko', 'coins', 50, 50, NOW() + INTERVAL '1 minute');

-- Enable Row Level Security
ALTER TABLE tracked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own tracked accounts" ON tracked_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own monitoring configs" ON monitoring_configs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own alerts" ON monitoring_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM monitoring_configs 
      WHERE monitoring_configs.id = monitoring_alerts.monitoring_config_id 
      AND monitoring_configs.user_id = auth.uid()
    )
  );
