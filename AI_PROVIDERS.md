# AI Providers Configuration

This application now supports multiple AI providers! You can choose between different models and services.

## Available Providers

### 1. Mock Provider (Default - No Setup Required)
- **Name**: Mock (Testing)
- **Description**: A simple testing provider that gives predefined responses
- **Setup**: No configuration needed - works out of the box
- **Use Case**: Testing and development

### 2. OpenAI
- **Name**: OpenAI
- **Description**: Uses GPT-3.5-turbo for high-quality responses
- **Setup**: 
  1. Get API key from https://platform.openai.com/api-keys
  2. Add to `.env.local`: `OPENAI_API_KEY=your_key_here`
- **Cost**: Pay per use
- **Quality**: Excellent

### 3. Hugging Face
- **Name**: Hugging Face
- **Description**: Uses open-source models from Hugging Face
- **Setup**:
  1. Get token from https://huggingface.co/settings/tokens
  2. Add to `.env.local`: `HUGGINGFACE_API_KEY=your_token_here`
- **Cost**: Free tier available
- **Quality**: Good

### 4. Ollama (Local)
- **Name**: Ollama (Local)
- **Description**: Run models locally on your computer
- **Setup**:
  1. Install Ollama from https://ollama.ai/
  2. Run: `ollama pull llama2`
  3. Start Ollama service
- **Cost**: Free (uses your computer's resources)
- **Quality**: Good, depends on model

### 5. Replicate
- **Name**: Replicate
- **Description**: Cloud-based open-source models
- **Setup**:
  1. Get token from https://replicate.com/account/api-tokens
  2. Add to `.env.local`: `REPLICATE_API_TOKEN=your_token_here`
- **Cost**: Pay per use
- **Quality**: Good

## Configuration

Create a `.env.local` file in the project root with your API keys:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here

# Hugging Face
HUGGINGFACE_API_KEY=hf_your-huggingface-token-here

# Replicate
REPLICATE_API_TOKEN=r8_your-replicate-token-here

# Gemini (original)
GEMINI_API_KEY=your-gemini-key-here
```

## How to Use

1. **Start the application**: `npm run dev`
2. **Select a provider**: Use the dropdown in the top-left corner
3. **Test the connection**: Click the green test button
4. **Start learning**: Click the red record button to begin

## Recommendations

- **For testing**: Use Mock provider
- **For best quality**: Use OpenAI
- **For free usage**: Use Hugging Face or Ollama
- **For privacy**: Use Ollama (runs locally)

## Troubleshooting

### Provider not available?
- Check if you have the required API key in `.env.local`
- Restart the development server after adding keys
- Check the browser console for error messages

### Ollama not working?
- Make sure Ollama is installed and running
- Check if the service is accessible at http://localhost:11434
- Try pulling a model: `ollama pull llama2`

### API errors?
- Verify your API keys are correct
- Check your account balance/limits
- Review the provider's documentation
