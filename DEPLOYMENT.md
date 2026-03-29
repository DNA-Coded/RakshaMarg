# Deployment Guide (Vercel + Render)

This repository is set up for split deployment:

- Frontend: Vercel
- Backend API: Render

## 1) Deploy Backend to Render

1. Push this repository to GitHub.
2. In Render, create a new Web Service from this repository.
3. Render will auto-detect the blueprint in render.yaml, or you can configure manually:
   - Runtime: Node
   - Build Command: npm install
   - Start Command: npm start
4. Add these environment variables in Render:
   - APP_API_KEY
   - GOOGLE_MAPS_API_KEY
   - GEMINI_API_KEY
   - NIRBHAYA_SERVICE_URL (optional, if your chatbot service is hosted separately)
5. Deploy and copy your backend URL, for example:
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
3. In the app, test route lookup and chatbot flow.
4. If requests fail, confirm:
   - VITE_API_BASE_URL points to Render
   - VITE_API_KEY matches APP_API_KEY
   - Render service logs show no missing env vars

## Notes

- Backend CORS currently allows all origins.
- Render free instances may sleep; first request can be slow.
- If you later move backend to Vercel Functions, update VITE_API_BASE_URL accordingly.
