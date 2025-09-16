# Cloudflare AI Gateway Deployment Guide

## Overview
This guide provides instructions for deploying the AI English Tutor application to Cloudflare using Cloudflare AI Gateway and Workers AI.

## Prerequisites
1. Cloudflare account (https://dash.cloudflare.com)
2. Cloudflare AI Gateway configured
3. Cloudflare API token with appropriate permissions

## Setup Instructions

### 1. Configure Cloudflare AI Gateway
1. Go to https://dash.cloudflare.com/
2. Navigate to AI Gateway
3. Create a new gateway
4. Note your Account ID, Gateway ID, and generate an API token

### 2. Environment Configuration
Copy `.env.local` to `.env` and configure:
```
# Required for Cloudflare AI Gateway
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_GATEWAY_ID=your-gateway-id
CLOUDFLARE_API_TOKEN=your-api-token

# Optional: For fallback providers
OPENAI_API_KEY=your-openai-key
HUGGINGFACE_API_KEY=your-huggingface-key
REPLICATE_API_TOKEN=your-replicate-token
```

### 3. Deployment Options

#### Option A: Cloudflare Pages (Recommended)
1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Configure environment variables in Pages dashboard

#### Option B: Cloudflare Workers
1. Install Wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
3. Deploy: `wrangler deploy`

### 4. Available AI Providers
The application now supports:
- **cloudflare-gateway**: Cloudflare AI Gateway (OpenAI-compatible)
- **cloudflare-workers**: Cloudflare Workers AI (Llama models)
- **openai**: OpenAI API
- **huggingface**: Hugging Face API
- **replicate**: Replicate API
- **mock**: Testing provider (no API key required)

### 5. Testing
1. Local testing: `npm run dev`
2. Test Cloudflare providers: Configure environment variables and test chat functionality
3. Validate deployment: Check all providers work in production

## API Endpoints
- `/api/ai-chat`: AI chat endpoint (POST)
- Supports both local development and Cloudflare deployment

## Troubleshooting
- Ensure all environment variables are set correctly
- Check Cloudflare AI Gateway configuration
- Verify API tokens have proper permissions
- Review Cloudflare Workers logs for errors

## Features Added
- ✅ Cloudflare AI Gateway integration
- ✅ Cloudflare Workers AI support
- ✅ OpenAI-compatible endpoints
- ✅ Environment-based provider switching
- ✅ Comprehensive error handling
- ✅ Production-ready deployment configuration