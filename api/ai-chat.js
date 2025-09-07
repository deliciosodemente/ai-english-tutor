/**
 * Vercel Serverless Function for AI Chat
 * Handles AI Gateway communication server-side
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, systemPrompt, difficulty } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (!aiGatewayKey) {
      return res.status(500).json({ error: 'AI Gateway API key not configured' });
    }

    // Enhanced system prompt based on difficulty
    const enhancedSystemPrompt = getEnhancedSystemPrompt(systemPrompt, difficulty);

    const response = await fetch('https://api.aigateway.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiGatewayKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the interaction for analytics
    console.log(`AI Chat - Difficulty: ${difficulty}, Message length: ${message.length}`);

    return res.status(200).json({
      success: true,
      response: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error.message 
    });
  }
}

function getEnhancedSystemPrompt(basePrompt, difficulty) {
  const difficultyPrompts = {
    'Beginner': `You are a patient and encouraging English teacher for beginners. Use simple vocabulary, short sentences, and provide lots of positive reinforcement. Focus on basic conversation skills and pronunciation.`,
    'Intermediate': `You are an experienced English tutor for intermediate learners. Use varied vocabulary, encourage complex sentence structures, and provide constructive feedback. Focus on fluency and natural expression.`,
    'Advanced': `You are a sophisticated English language coach for advanced learners. Challenge them with complex topics, nuanced vocabulary, and sophisticated grammar. Focus on native-like fluency and cultural understanding.`
  };

  const difficultyPrompt = difficultyPrompts[difficulty] || difficultyPrompts['Beginner'];
  
  return `${basePrompt}\n\n${difficultyPrompt}\n\nAlways respond in a friendly, encouraging manner. Provide specific feedback and suggestions for improvement.`;
}
