# Deployment Guide (Vercel Frontend + Render Backend + Render Chatbot)

This guide is for manual deployment on free tier, without using Render Blueprint automation.

## Target Architecture

- Frontend (React/Vite): Vercel
- Backend API (Node/Fastify): Render Web Service
- Chatbot API (Python/FastAPI): Render Web Service

Production request flow:

1. Browser calls frontend on Vercel.
2. Frontend calls backend on Render.
3. Backend proxies chat requests to chatbot on Render.

## Prerequisites

Before starting, keep these ready:

- GitHub repository with latest main branch.
- One shared secret value for API auth.
- Google Maps API key for backend.
- Gemini API key for backend and chatbot.
- Optional OpenAI API key if chatbot provider is openai.

Recommended naming for shared secret:

- SHARED_APP_KEY: any long random string

You will use this same value in:

- backend APP_API_KEY
- chatbot API_KEY
- frontend VITE_API_KEY

## Environment Variable Mapping

Use this exact mapping:

- Backend (Render)
  - APP_API_KEY = SHARED_APP_KEY
  - GOOGLE_MAPS_API_KEY = your Google Maps server key
  - GEMINI_API_KEY = your Gemini key
  - NIRBHAYA_SERVICE_URL = chatbot service URL from Render
- Chatbot (Render)
  - API_KEY = SHARED_APP_KEY
  - GEMINI_API_KEY = your Gemini key
  - OPENAI_API_KEY = optional
  - LLM_PROVIDER = gemini or openai
- Frontend (Vercel)
  - VITE_API_BASE_URL = backend service URL from Render (no trailing slash)
  - VITE_API_KEY = SHARED_APP_KEY
  - VITE_GOOGLE_MAPS_API_KEY = browser Maps key

## Step 1: Deploy Chatbot Service on Render

Deploy chatbot first so backend can reference its URL.

In Render:

1. New + > Web Service
2. Connect your GitHub repository
3. Configure service
   - Name: rakshamarg-chatbot
   - Runtime: Python 3
   - Region: choose closest to users
   - Branch: main
   - Root Directory: nirbhaya_bot
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   - Health Check Path: /health
4. Add environment variables
   - API_KEY
   - GEMINI_API_KEY
   - OPENAI_API_KEY (only if needed)
   - LLM_PROVIDER (gemini recommended)
5. Create Web Service and wait for first successful deploy
6. Copy service URL, for example
   - https://rakshamarg-chatbot.onrender.com

Quick verification:

- Open https://your-chatbot-url/health
- Expected JSON includes status healthy

## Step 2: Deploy Backend Service on Render

After chatbot is live, deploy backend.

In Render:

1. New + > Web Service
2. Connect the same GitHub repository
3. Configure service
   - Name: rakshamarg-backend
   - Runtime: Node
   - Region: same as chatbot if possible
   - Branch: main
   - Root Directory: leave empty (repository root)
   - Build Command: npm install
   - Start Command: npm start
   - Health Check Path: /health
4. Add environment variables
   - APP_API_KEY = same exact value as chatbot API_KEY
   - GOOGLE_MAPS_API_KEY
   - GEMINI_API_KEY
   - NIRBHAYA_SERVICE_URL = https://your-chatbot-url
5. Create Web Service and wait for healthy deploy
6. Copy backend URL, for example
   - https://rakshamarg-backend.onrender.com

Quick verification:

- Open https://your-backend-url/health
- Expected JSON includes status ok

## Step 3: Deploy Frontend on Vercel

The repository already contains vercel.json configured to build frontend and serve SPA routes.

In Vercel:

1. Add New Project
2. Import same GitHub repository
3. Keep default root as repository root
4. In Environment Variables, add:
   - VITE_API_BASE_URL = https://your-backend-url
   - VITE_API_KEY = same exact shared key
   - VITE_GOOGLE_MAPS_API_KEY = browser key
5. Deploy

If you edit env vars later, redeploy so frontend gets updated values.

## Post-Deployment Validation Checklist

Run checks in this order:

1. Chatbot health
   - GET https://your-chatbot-url/health
2. Backend health
   - GET https://your-backend-url/health
3. Frontend loads
   - Open your Vercel app URL
4. Route API works
   - Search a route from frontend UI
5. Chatbot works through backend proxy
   - Send a chatbot message from UI
6. Emergency endpoint path
   - Trigger chat emergency intent and confirm response

Optional direct backend chat test:

Use any API client and call:

- POST https://your-backend-url/api/v1/navigation/chat
- Headers
  - Content-Type: application/json
  - x-api-key: SHARED_APP_KEY
- Body
  - message: test message
  - conversationHistory: []
  - journeyContext: {}

## Common Issues and Fixes

401 Invalid API key:

- Ensure these three are identical:
  - backend APP_API_KEY
  - chatbot API_KEY
  - frontend VITE_API_KEY

Backend cannot reach chatbot:

- Verify backend NIRBHAYA_SERVICE_URL points to chatbot Render URL.
- Check chatbot logs for request arrivals.
- Ensure URL has https and no trailing path.

Frontend calls wrong backend:

- Verify VITE_API_BASE_URL is backend URL only.
- No trailing slash.
- Redeploy frontend after env changes.

Render cold start delay on free tier:

- First request after idle can be slow.
- Retry once after warm-up.

Missing Python or Node dependencies:

- Confirm commands exactly:
  - chatbot build: pip install -r requirements.txt
  - chatbot start: uvicorn main:app --host 0.0.0.0 --port $PORT
  - backend build: npm install
  - backend start: npm start

Google or Gemini key errors:

- Recheck keys in Render env vars.
- Ensure APIs are enabled on provider dashboard.

## Security Checklist

- Never commit real .env files or API keys.
- Rotate any key that was exposed in chat, screenshots, or commits.
- Restrict Google API keys by domain or usage where possible.
- Use separate keys for local and production.

## Notes

- This project can use render.yaml, but manual setup is fully supported and suitable for free tier.
- Backend CORS currently allows all origins; tighten this for production if needed.
- Keep backend and chatbot in same region for lower latency.
