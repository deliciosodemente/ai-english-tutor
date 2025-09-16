/**
 * AI Providers - Modular system for different AI models
 */

export interface AIResponse {
  text: string;
  audio?: ArrayBuffer;
  error?: string;
}

export interface AIProvider {
  name: string;
  sendMessage(message: string, systemPrompt?: string): Promise<AIResponse>;
  sendAudio(audioData: Float32Array): Promise<AIResponse>;
  isAvailable(): boolean;
}

// OpenAI Provider
export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0].message.content,
      };
    } catch (error) {
      return {
        text: '',
        error: `OpenAI error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    // OpenAI doesn't support direct audio input in this implementation
    return {
      text: '',
      error: 'Audio input not supported in this implementation',
    };
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Hugging Face Provider
export class HuggingFaceProvider implements AIProvider {
  name = 'Hugging Face';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'microsoft/DialoGPT-medium') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: systemPrompt ? `${systemPrompt}\n\nUser: ${message}` : message,
          parameters: {
            max_length: 200,
            temperature: 0.7,
            do_sample: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      const text = Array.isArray(data) ? data[0].generated_text : data.generated_text;
      
      return {
        text: text || 'No response generated',
      };
    } catch (error) {
      return {
        text: '',
        error: `Hugging Face error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    return {
      text: '',
      error: 'Audio input not supported in this implementation',
    };
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}


// Replicate Provider
export class ReplicateProvider implements AIProvider {
  name = 'Replicate';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'meta/llama-2-7b-chat') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'latest',
          input: {
            prompt: systemPrompt ? `${systemPrompt}\n\nUser: ${message}` : message,
            max_length: 200,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Replicate API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Poll for completion
      let result = data;
      while (result.status === 'starting' || result.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
          },
        });
        result = await statusResponse.json();
      }

      if (result.status === 'succeeded') {
        return {
          text: result.output.join('') || 'No response generated',
        };
      } else {
        throw new Error(`Prediction failed: ${result.error}`);
      }
    } catch (error) {
      return {
        text: '',
        error: `Replicate error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    return {
      text: '',
      error: 'Audio input not supported in this implementation',
    };
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// AI Gateway Provider
export class AIGatewayProvider implements AIProvider {
  name = 'AI Gateway';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.aigateway.dev/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Gateway API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0].message.content,
      };
    } catch (error) {
      return {
        text: '',
        error: `AI Gateway error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    return {
      text: '',
      error: 'Audio input not supported in this implementation',
    };
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Cloudflare AI Gateway Provider
export class CloudflareAIGatewayProvider implements AIProvider {
  name = 'Cloudflare AI Gateway';
  private accountId: string;
  private gatewayId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, gatewayId: string, apiToken: string) {
    this.accountId = accountId;
    this.gatewayId = gatewayId;
    this.apiToken = apiToken;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}`;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      // Use Cloudflare's OpenAI-compatible endpoint
      const response = await fetch(`${this.baseUrl}/openai/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
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
      return {
        text: data.choices[0].message.content,
      };
    } catch (error) {
      return {
        text: '',
        error: `Cloudflare AI Gateway error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    return {
      text: '',
      error: 'Audio input not supported in this implementation',
    };
  }

  isAvailable(): boolean {
    return !!(this.accountId && this.gatewayId && this.apiToken);
  }
}

// Cloudflare Workers AI Provider
export class CloudflareWorkersAIProvider implements AIProvider {
  name = 'Cloudflare Workers AI';
  private accountId: string;
  private gatewayId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(accountId: string, gatewayId: string, apiToken: string) {
    this.accountId = accountId;
    this.gatewayId = gatewayId;
    this.apiToken = apiToken;
    this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai`;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: message }
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Workers AI error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.result?.response || data.response || 'No response generated',
      };
    } catch (error) {
      return {
        text: '',
        error: `Cloudflare Workers AI error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    return {
      text: '',
      error: 'Audio input not supported in this implementation',
    };
  }

  isAvailable(): boolean {
    return !!(this.accountId && this.gatewayId && this.apiToken);
  }
}


// Spiritual Tutor Provider
export class SpiritualTutorProvider implements AIProvider {
  name = 'Spiritual Tutor';
  private api: any; // SpiritualAPI instance

  constructor() {
    // Import spiritual API dynamically to avoid circular dependencies
    try {
      const { getSpiritualAPI } = require('./spiritual-api');
      this.api = getSpiritualAPI();
    } catch (error) {
      console.warn('Spiritual API not available:', error);
    }
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      if (!this.api) {
        throw new Error('Spiritual API not configured');
      }

      // Enhanced system prompt for spiritual teaching
      const spiritualPrompt = `You are a spiritual tutor teaching Krishna consciousness using Srila Prabhupada's books.
Your responses must:
1. Draw only from authentic Vedic teachings
2. Be encouraging and respectful
3. Include relevant verses when appropriate
4. Guide users toward spiritual understanding
5. Maintain ethical boundaries
6. Focus on education rather than conversion

${systemPrompt || ''}`;

      // Check if the message contains spiritual queries
      const spiritualKeywords = ['krishna', 'consciousness', 'bhagavad', 'gita', 'spiritual', 'veda', 'prabhupada', 'verse', 'chapter'];
      const isSpiritualQuery = spiritualKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
      );

      if (isSpiritualQuery) {
        // Try to find relevant verses
        try {
          const searchResults = await this.api.searchVerses(message, 3);
          if (searchResults.verses.length > 0) {
            const verse = searchResults.verses[0];
            const verseText = `"${verse.translation}" (${verse.book} ${verse.chapter}.${verse.verse})`;

            return {
              text: `Based on Srila Prabhupada's teachings: ${verseText}\n\n${verse.purport ? `Purport: ${verse.purport.substring(0, 200)}...` : ''}\n\nHow does this verse resonate with you?`,
            };
          }
        } catch (apiError) {
          console.warn('Spiritual API search failed:', apiError);
        }
      }

      // Fallback to general spiritual guidance
      const spiritualResponses = [
        "In Krishna consciousness, we learn that the soul is eternal and full of knowledge and bliss. How can I help you understand this better?",
        "Srila Prabhupada teaches us that our real happiness comes from serving Krishna with love and devotion. What questions do you have about devotional service?",
        "The Bhagavad-gita teaches us about our eternal relationship with Krishna. Would you like me to explain any particular verses?",
        "Spiritual life is about developing love for Krishna through hearing, chanting, and remembering. What aspect would you like to explore?",
        "In Vedic wisdom, we understand that we are not these material bodies but eternal spirit souls. This knowledge frees us from material anxieties."
      ];

      const response = spiritualResponses[Math.floor(Math.random() * spiritualResponses.length)];

      return {
        text: response,
      };
    } catch (error) {
      console.error('Spiritual tutor error:', error);
      return {
        text: 'I apologize, but I\'m currently unable to access the spiritual teachings. Please try again later, or let me know how else I can help you with your spiritual journey.',
        error: `Spiritual API error: ${error.message}`,
      };
    }
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    // Spiritual tutor doesn't support direct audio input
    return {
      text: 'For spiritual discussions, please use text. I\'m here to help you understand Krishna consciousness through sacred teachings.',
      error: 'Audio input not supported in spiritual tutor mode',
    };
  }

  isAvailable(): boolean {
    return !!this.api;
  }
}

// Mock Provider for testing
export class MockProvider implements AIProvider {
  name = 'Mock (Testing)';

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockResponses = [
      "Hello! I'm your AI English tutor. Let's practice some conversation. How are you doing today?",
      "Great pronunciation! Keep practicing those vowel sounds. Try saying: 'The quick brown fox jumps over the lazy dog.'",
      "Excellent work on your sentence structure. Now let's try a more complex phrase. How would you describe your favorite hobby?",
      "I notice you're improving your fluency. Let's have a short conversation about your daily routine. What do you usually do in the morning?",
      "Your confidence is growing! Let's practice some common English expressions. Can you tell me about your weekend plans?"
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    return {
      text: response,
    };
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    // Mock audio processing
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      text: "I heard your audio! You're doing great with pronunciation. Keep practicing those sounds!",
    };
  }

  isAvailable(): boolean {
    return true; // Always available for testing
  }
}

// Provider Manager
export class AIProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider: AIProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Always add Mock provider for testing
    this.addProvider('mock', new MockProvider());

    // Add Spiritual Tutor provider
    try {
      this.addProvider('spiritual-tutor', new SpiritualTutorProvider());
    } catch (error) {
      console.warn('Spiritual tutor provider not available:', error);
    }

    // Add AI Gateway as primary provider
    const aiGatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (aiGatewayKey) {
      this.addProvider('aigateway', new AIGatewayProvider(aiGatewayKey));
    }

    // Add Cloudflare AI Gateway provider
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfGatewayId = process.env.CLOUDFLARE_GATEWAY_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (cfAccountId && cfGatewayId && cfApiToken) {
      this.addProvider('cloudflare-gateway', new CloudflareAIGatewayProvider(cfAccountId, cfGatewayId, cfApiToken));
    }

    // Add Cloudflare Workers AI provider
    if (cfAccountId && cfGatewayId && cfApiToken) {
      this.addProvider('cloudflare-workers', new CloudflareWorkersAIProvider(cfAccountId, cfGatewayId, cfApiToken));
    }

    // Add OpenAI as backup if API key is available
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.addProvider('openai', new OpenAIProvider(openaiKey));
    }

    // Add Hugging Face as backup if API key is available
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    if (hfKey) {
      this.addProvider('huggingface', new HuggingFaceProvider(hfKey));
    }

    // Add Replicate as backup if API key is available
    const replicateKey = process.env.REPLICATE_API_TOKEN;
    if (replicateKey) {
      this.addProvider('replicate', new ReplicateProvider(replicateKey));
    }
  }

  addProvider(name: string, provider: AIProvider) {
    this.providers.set(name, provider);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async setProvider(name: string): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) {
      return false;
    }

    // Check if provider is available
    if (typeof provider.isAvailable === 'function') {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        return false;
      }
    }

    this.currentProvider = provider;
    return true;
  }

  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<AIResponse> {
    if (!this.currentProvider) {
      return {
        text: '',
        error: 'No AI provider selected',
      };
    }

    return await this.currentProvider.sendMessage(message, systemPrompt);
  }

  async sendAudio(audioData: Float32Array): Promise<AIResponse> {
    if (!this.currentProvider) {
      return {
        text: '',
        error: 'No AI provider selected',
      };
    }

    return await this.currentProvider.sendAudio(audioData);
  }
}
