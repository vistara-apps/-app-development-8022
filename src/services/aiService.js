import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
});

export const analyzeSentiment = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: "You are a crypto sentiment analyzer. Analyze the given text and return a JSON response with sentiment (positive/negative/neutral), confidence (0-1), and key insights."
        },
        {
          role: "user",
          content: `Analyze the sentiment of this crypto-related text: "${text}"`
        }
      ],
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      insights: ['Analysis unavailable']
    };
  }
};

export const generateMarketInsights = async (marketData) => {
  try {
    const response = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You are an expert crypto market analyst with deep knowledge of blockchain technology, market psychology, and trading patterns. 

Your task is to analyze real-time market data and provide actionable insights for crypto traders and investors. Focus on:

1. Market sentiment analysis and its implications
2. Trending topics and their potential impact
3. Volume patterns and market momentum
4. Risk assessment and opportunity identification
5. Short-term and medium-term outlook

Provide insights in a clear, professional tone. Be specific about data points and avoid generic statements. Include both bullish and bearish factors when relevant.`
        },
        {
          role: "user",
          content: `Analyze the following real-time crypto market data and provide comprehensive insights:

**Market Overview:**
- Overall Trend: ${marketData.marketTrend}
- Average Sentiment Score: ${(marketData.averageSentiment * 100).toFixed(1)}%
- Total Mention Volume: ${marketData.totalVolume?.toLocaleString() || 'N/A'}
- Analysis Timeframe: ${marketData.timeframe}
- Timestamp: ${marketData.timestamp}

**Trending Topics:**
${marketData.trendingTopics?.map(topic => 
  `- ${topic.topic}: ${topic.volume?.toLocaleString() || 'N/A'} mentions (${topic.sentiment})`
).join('\n') || 'No trending data available'}

**Detailed Sentiment Analysis:**
${marketData.sentimentAnalysis?.map(analysis => 
  `- ${analysis.project}: ${(analysis.sentiment_score * 100).toFixed(1)}% positive (${analysis.metrics?.total_mentions || 'N/A'} mentions, ${(analysis.confidence * 100).toFixed(1)}% confidence)`
).join('\n') || 'No detailed sentiment data available'}

**Top Mentions:** ${marketData.topMentions?.join(', ') || 'N/A'}

Please provide a detailed analysis covering market sentiment, key trends, potential opportunities, risks to watch, and a brief outlook. Keep the response informative but concise (2-3 paragraphs).`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Market insights error:', error);
    return 'Unable to generate market insights at this time. The AI analysis service is temporarily unavailable. Please try again in a few moments.';
  }
};
