import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for cron jobs
    )

    console.log('Starting periodic monitoring job...')

    // Get active monitoring configurations that need checking
    const { data: configs, error: configError } = await supabaseClient
      .from('monitoring_configs')
      .select(`
        *,
        tracked_accounts:tracked_accounts(*)
      `)
      .eq('is_active', true)
      .or(`last_check.is.null,last_check.lt.${new Date(Date.now() - 5 * 60 * 1000).toISOString()}`) // 5 minutes ago

    if (configError) {
      throw new Error(`Failed to fetch configs: ${configError.message}`)
    }

    console.log(`Found ${configs?.length || 0} configurations to process`)

    const results = []

    for (const config of configs || []) {
      try {
        console.log(`Processing config: ${config.project_name}`)

        // Create monitoring job record
        const { data: job } = await supabaseClient
          .from('monitoring_jobs')
          .insert({
            job_type: 'mention_check',
            status: 'running',
            metadata: { config_id: config.id, project: config.project_name }
          })
          .select()
          .single()

        // Check for new mentions
        const mentionResults = await checkProjectMentions(supabaseClient, config)
        
        // Analyze sentiment if we have new mentions
        if (mentionResults.newMentions > 0) {
          await analyzeMentionSentiment(supabaseClient, config.project_name)
        }

        // Check alert conditions
        const alerts = await checkAlertConditions(supabaseClient, config, mentionResults)

        // Update last check time
        await supabaseClient
          .from('monitoring_configs')
          .update({ 
            last_check: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id)

        // Complete the job
        await supabaseClient
          .from('monitoring_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: { 
              ...job.metadata, 
              new_mentions: mentionResults.newMentions,
              alerts_triggered: alerts.length
            }
          })
          .eq('id', job.id)

        results.push({
          config: config.project_name,
          newMentions: mentionResults.newMentions,
          alertsTriggered: alerts.length,
          status: 'success'
        })

      } catch (error) {
        console.error(`Error processing config ${config.project_name}:`, error)
        results.push({
          config: config.project_name,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Periodic monitoring error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function checkProjectMentions(supabaseClient: any, config: any) {
  // Check rate limits first
  const { data: rateLimit } = await supabaseClient
    .from('api_rate_limits')
    .select('*')
    .eq('service', 'twitter')
    .eq('endpoint', 'search')
    .single()

  if (rateLimit && rateLimit.requests_remaining <= 0) {
    console.log('Twitter rate limit exceeded, skipping API call')
    return { newMentions: 0, fromCache: true }
  }

  // Build search query from keywords
  const keywords = config.keywords || [config.project_name]
  const query = keywords.map((k: string) => `"${k}"`).join(' OR ')

  try {
    // Make Twitter API call
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=50&tweet.fields=public_metrics,created_at,author_id&user.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('TWITTER_BEARER_TOKEN')}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`)
    }

    const data = await response.json()

    // Update rate limit
    await supabaseClient
      .from('api_rate_limits')
      .update({
        requests_remaining: (rateLimit?.requests_remaining || 300) - 1,
        updated_at: new Date().toISOString()
      })
      .eq('service', 'twitter')
      .eq('endpoint', 'search')

    // Store new mentions
    let newMentions = 0
    if (data.data) {
      const mentions = data.data.map((tweet: any) => ({
        project: config.project_name.toLowerCase(),
        tweet_id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        public_metrics: tweet.public_metrics,
        processed_at: new Date().toISOString()
      }))

      const { data: inserted } = await supabaseClient
        .from('twitter_mentions')
        .upsert(mentions, { onConflict: 'tweet_id', ignoreDuplicates: true })
        .select()

      newMentions = inserted?.length || 0
    }

    return { newMentions, fromCache: false }

  } catch (error) {
    console.error('Error fetching mentions:', error)
    return { newMentions: 0, error: error.message }
  }
}

async function analyzeMentionSentiment(supabaseClient: any, project: string) {
  // Get recent mentions without sentiment analysis
  const { data: mentions } = await supabaseClient
    .from('twitter_mentions')
    .select('*')
    .eq('project', project.toLowerCase())
    .is('sentiment_score', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!mentions || mentions.length === 0) {
    return
  }

  // Batch analyze sentiment (limit to avoid rate limits)
  for (const mention of mentions.slice(0, 5)) {
    try {
      // Call OpenRouter API for sentiment analysis
      const sentimentResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: 'Analyze sentiment and return JSON: {"sentiment":"positive/negative/neutral","confidence":0.8,"sentiment_score":0.75,"explanation":"brief explanation"}'
            },
            {
              role: 'user',
              content: `Analyze: "${mention.text.slice(0, 200)}"`
            }
          ],
          temperature: 0.1,
          max_tokens: 150
        })
      })

      if (sentimentResponse.ok) {
        const sentimentData = await sentimentResponse.json()
        let content = sentimentData.choices[0].message.content.trim()
        
        // Clean up markdown
        if (content.startsWith('```')) {
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        }

        const sentiment = JSON.parse(content)

        // Update mention with sentiment
        await supabaseClient
          .from('twitter_mentions')
          .update({
            sentiment_score: sentiment.sentiment_score || 0.5,
            sentiment_analysis: sentiment
          })
          .eq('id', mention.id)
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error) {
      console.error(`Error analyzing sentiment for mention ${mention.id}:`, error)
    }
  }
}

async function checkAlertConditions(supabaseClient: any, config: any, mentionResults: any) {
  const alerts = []
  const thresholds = config.alert_thresholds || {}

  // Volume spike alert
  if (thresholds.volume_threshold && mentionResults.newMentions > thresholds.volume_threshold) {
    alerts.push({
      monitoring_config_id: config.id,
      alert_type: 'volume_spike',
      severity: mentionResults.newMentions > thresholds.volume_threshold * 2 ? 'high' : 'medium',
      title: `Volume spike detected for ${config.project_name}`,
      message: `${mentionResults.newMentions} new mentions detected (threshold: ${thresholds.volume_threshold})`,
      metadata: { new_mentions: mentionResults.newMentions, threshold: thresholds.volume_threshold }
    })
  }

  // Store alerts
  if (alerts.length > 0) {
    await supabaseClient
      .from('monitoring_alerts')
      .insert(alerts)
  }

  return alerts
}
