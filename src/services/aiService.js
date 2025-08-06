import OpenAI from 'openai';
import toolsService from './toolsService.js';

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
          content: `You are a crypto sentiment analyzer. Analyze the given text and return ONLY a valid JSON object (no markdown, no code blocks) with:
- sentiment: "positive", "negative", or "neutral"  
- confidence: number between 0 and 1
- sentiment_score: number between 0 and 1 (0=very negative, 0.5=neutral, 1=very positive)
- explanation: brief explanation of the sentiment
- key_phrases: array of important phrases that influenced the sentiment

Example: {"sentiment":"positive","confidence":0.8,"sentiment_score":0.75,"explanation":"Bullish language about price growth","key_phrases":["moon","bullish","pump"]}`
        },
        {
          role: "user",
          content: `Analyze: "${text.slice(0, 200)}"`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    });

    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const result = JSON.parse(content);
    
    // Ensure required fields exist
    return {
      sentiment: result.sentiment || 'neutral',
      confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
      sentiment_score: Math.min(Math.max(result.sentiment_score || 0.5, 0), 1),
      explanation: result.explanation || 'No explanation available',
      key_phrases: result.key_phrases || []
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      sentiment_score: 0.5,
      explanation: 'Analysis failed - using neutral sentiment',
      key_phrases: []
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

/**
 * Agentic AI Chat with Tools
 * Enables the AI to use tools for real-time data access
 */
export const chatWithTools = async (messages, options = {}) => {
  const {
    maxIterations = 5,
    temperature = 0.7,
    model = "google/gemini-2.0-flash-001"
  } = options;

  try {
    const tools = toolsService.getAvailableTools();
    let currentMessages = [...messages];
    let iteration = 0;

    // Add system message with tool instructions
    if (!currentMessages.find(m => m.role === 'system')) {
      currentMessages.unshift({
        role: 'system',
        content: `You are CryptoSentinel AI, an expert cryptocurrency analyst with access to real-time market data and analysis tools.

You can use the following tools to provide accurate, up-to-date information:
- get_token_price: Get current price and market data for cryptocurrencies
- search_tokens: Search for tokens by name or symbol
- get_trending_tokens: Get currently trending cryptocurrencies
- analyze_token_sentiment: Analyze social media sentiment for tokens
- get_token_mentions: Get recent social media mentions
- get_dex_token_data: Get DEX trading data from DexScreener
- get_market_overview: Get overall market statistics
- compare_tokens: Compare multiple tokens side by side

Always use tools when users ask for current data, prices, trends, or analysis. Provide specific, actionable insights based on real data.`
      });
    }

    while (iteration < maxIterations) {
      const response = await openai.chat.completions.create({
        model,
        messages: currentMessages,
        tools,
        tool_choice: "auto",
        temperature,
        max_tokens: 1000
      });

      const message = response.choices[0].message;
      currentMessages.push(message);

      // Check if AI wants to use tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Execute tool calls
        for (const toolCall of message.tool_calls) {
          try {
            const toolName = toolCall.function.name;
            const parameters = JSON.parse(toolCall.function.arguments);
            
            console.log(`Executing tool: ${toolName}`, parameters);
            
            const toolResult = await toolsService.executeTool(toolName, parameters);
            
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          } catch (error) {
            console.error(`Tool execution error:`, error);
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: true,
                message: `Tool execution failed: ${error.message}`
              })
            });
          }
        }
        
        iteration++;
        continue; // Continue the loop to get AI's response to tool results
      }

      // No more tool calls, return the final response
      return {
        success: true,
        message: message.content,
        usage: response.usage,
        iterations: iteration + 1,
        conversation: currentMessages
      };
    }

    return {
      success: false,
      error: 'Maximum iterations reached',
      message: 'The AI assistant reached the maximum number of tool iterations. Please try a simpler request.',
      iterations: maxIterations,
      conversation: currentMessages
    };

  } catch (error) {
    console.error('Agentic chat error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Unable to process your request at this time. Please try again.',
      iterations: 0
    };
  }
};

/**
 * Simple chat without tools (for basic conversations)
 */
export const simpleChat = async (messages, options = {}) => {
  const {
    temperature = 0.7,
    model = "google/gemini-2.0-flash-001",
    maxTokens = 500
  } = options;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    });

    return {
      success: true,
      message: response.choices[0].message.content,
      usage: response.usage
    };
  } catch (error) {
    console.error('Simple chat error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Unable to process your request at this time. Please try again.'
    };
  }
};
