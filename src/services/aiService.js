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

export const generateMarketInsights = async (projectData) => {
  try {
    const response = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: "You are a crypto market analyst. Generate insights based on project data including mentions, sentiment, and trends."
        },
        {
          role: "user",
          content: `Generate market insights for this crypto project data: ${JSON.stringify(projectData)}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Market insights error:', error);
    return 'Market insights temporarily unavailable.';
  }
};
