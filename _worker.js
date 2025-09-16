// Cloudflare Workers AI Gateway Handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Handle API routes
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }

    // Serve static files
    return env.ASSETS.fetch(request);
  },
};

async function handleAPI(request, env) {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (url.pathname === '/api/ai-chat' && request.method === 'POST') {
      const { message, systemPrompt, difficulty } = await request.json();
      
      // Use Cloudflare AI Gateway
      const accountId = env.CLOUDFLARE_ACCOUNT_ID;
      const gatewayId = env.CLOUDFLARE_GATEWAY_ID;
      const apiToken = env.CLOUDFLARE_API_TOKEN;

      if (!accountId || !gatewayId || !apiToken) {
        return new Response(JSON.stringify({
          error: 'Cloudflare AI Gateway not configured',
          text: 'I\'m ready to help you practice English! Please configure your Cloudflare AI Gateway to get started.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai/chat/completions`;

      // Enhanced system prompt based on difficulty
      let enhancedSystemPrompt = systemPrompt || "You are a friendly English tutor helping students improve their English skills.";
      
      if (difficulty === 'beginner') {
        enhancedSystemPrompt += " Use simple vocabulary and short sentences. Provide gentle corrections and encouragement.";
      } else if (difficulty === 'intermediate') {
        enhancedSystemPrompt += " Use moderate vocabulary and varied sentence structures. Provide constructive feedback on grammar and pronunciation.";
      } else if (difficulty === 'advanced') {
        enhancedSystemPrompt += " Use sophisticated vocabulary and complex sentence structures. Challenge the student with nuanced discussions and advanced grammar concepts.";
      }

      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloudflare AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      
      return new Response(JSON.stringify({
        text: data.choices[0].message.content,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle other API routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      text: 'I\'m having trouble connecting to the AI service. Let\'s try again in a moment.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}