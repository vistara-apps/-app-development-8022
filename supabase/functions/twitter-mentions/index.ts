import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TwitterMentionRequest {
  project: string
  timeframe?: string
  maxResults?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { project, timeframe = '24h', maxResults = 50 }: TwitterMentionRequest = await req.json()

    // Check rate limits from database
    const { data: rateLimitData } = await supabaseClient
      .from('api_rate_limits')
      .select('*')
      .eq('service', 'twitter')
      .eq('endpoint', 'search')
      .single()

    if (rateLimitData && rateLimitData.requests_remaining <= 0) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Make Twitter API call with server-side bearer token
    const twitterResponse = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(project)}&max_results=${maxResults}&tweet.fields=public_metrics,created_at,author_id&user.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('TWITTER_BEARER_TOKEN')}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!twitterResponse.ok) {
      throw new Error(`Twitter API error: ${twitterResponse.status}`)
    }

    const twitterData = await twitterResponse.json()

    // Update rate limit tracking
    await supabaseClient
      .from('api_rate_limits')
      .upsert({
        service: 'twitter',
        endpoint: 'search',
        requests_remaining: (rateLimitData?.requests_remaining || 300) - 1,
        reset_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        updated_at: new Date().toISOString()
      })

    // Store mentions in database for caching
    if (twitterData.data) {
      const mentions = twitterData.data.map((tweet: any) => ({
        project: project.toLowerCase(),
        tweet_id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        public_metrics: tweet.public_metrics,
        processed_at: new Date().toISOString()
      }))

      await supabaseClient
        .from('twitter_mentions')
        .upsert(mentions, { onConflict: 'tweet_id' })
    }

    return new Response(
      JSON.stringify({
        data: twitterData.data || [],
        meta: twitterData.meta || {},
        cached: false,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Twitter mentions error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
