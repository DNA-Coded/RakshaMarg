# Deployment Guide (Vercel + Render)

This repository is set up for split deployment:

- Frontend: Vercel
- Backend API: Render
- Chatbot service: Render

## 1) Deploy Backend + Chatbot to Render

1. Push this repository to GitHub.
2. In Render, create services from this repository using the blueprint in render.yaml.
3. This creates two web services:
   - rakshamarg-backend (Node/Fastify)
   - rakshamarg-chatbot (Python/FastAPI)
4. Set environment variables for rakshamarg-chatbot:
   - API_KEY (must match backend APP_API_KEY)
   - GEMINI_API_KEY
   - OPENAI_API_KEY (optional, only if LLM_PROVIDER=openai)
   - LLM_PROVIDER (default: gemini)
5. Set environment variables for rakshamarg-backend:
   - APP_API_KEY
   - GOOGLE_MAPS_API_KEY
   - GEMINI_API_KEY
   - NIRBHAYA_SERVICE_URL = chatbot Render URL (for example: https://rakshamarg-chatbot.onrender.com)
6. Deploy and copy your backend URL, for example:
   - https://rakshamarg-backend.onrender.com

## 2) Deploy Frontend to Vercel

1. Import this GitHub repository in Vercel.
2. Keep the repository root as project root (vercel.json handles the frontend build).
3. In Vercel Project Settings, add environment variables:
   - VITE_API_BASE_URL = your Render backend URL (no trailing slash)
   - VITE_API_KEY = same value as APP_API_KEY on backend
   - VITE_GOOGLE_MAPS_API_KEY = browser key for Google Maps
4. Deploy.

## 3) Verify Production

1. Open your frontend URL on Vercel.
2. Test backend health endpoint directly:
   - GET /health on your Render URL
3. Test chatbot health endpoint directly:
   - GET /health on chatbot Render URL
4. In the app, test route lookup and chatbot flow.
4. If requests fail, confirm:
   - VITE_API_BASE_URL points to Render
   - VITE_API_KEY matches APP_API_KEY
   - chatbot API_KEY matches backend APP_API_KEY
   - NIRBHAYA_SERVICE_URL points to chatbot Render URL
   - Render service logs show no missing env vars

## Notes

- Backend CORS currently allows all origins.
- Render free instances may sleep; first request can be slow.
- If you later move backend to Vercel Functions, update VITE_API_BASE_URL accordingly.
