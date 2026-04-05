# Railway Backend Deployment Guide (Frontend on Vercel)

This guide prepares and deploys only the backend on Railway.
Your frontend remains on Vercel.

## 1. What Is Already Prepared in Codebase

The repository is now Railway-ready with:

- `railway.json` at repository root
- Backend startup command via root script: `npm start` -> `node backend/server.js`
- `/health` endpoint for Railway health checks
- Configurable CORS using `CORS_ORIGIN` (recommended for production)

## 2. Prerequisites

Before deployment, keep these ready:

- Railway account (GitHub connected)
- MongoDB Atlas connection string
- Google Maps API key (server-side)
- Gemini API key
- Firebase Admin credentials (project id, client email, private key)
- Existing Vercel frontend URL

## 3. Deploy Backend Service on Railway

1. Push latest code to GitHub.
2. Open Railway dashboard.
3. Click `New Project`.
4. Click `Deploy from GitHub repo` and select this repository.
5. Railway should auto-detect Node.js.
6. Open service settings and confirm:
   - Root directory: repository root (blank/default)
   - Build command: `npm install --no-audit` (or leave empty to use `railway.json`)
   - Start command: `npm start`
   - Healthcheck path: `/health`

This repository uses root-level backend dependencies and scripts (`npm start` -> `node backend/server.js`).
The included `.railwayignore` excludes `nirbhaya_bot/` from backend deployments so Railway does not trigger Python build detection.

## 4. Add Required Environment Variables in Railway

In Railway service -> Variables, add:

- `NODE_ENV=production`
- `PORT=8000` (Railway sets `PORT` automatically, but this is safe as fallback)
- `APP_API_KEY=your_strong_shared_secret`
- `GOOGLE_MAPS_API_KEY=your_google_maps_server_key`
- `GEMINI_API_KEY=your_gemini_key`
- `MONGODB_URI=your_mongodb_connection_string`
- `MONGODB_DB_NAME=rakshamarg`
- `MONGODB_REQUIRED=true`
- `MONGODB_CONNECT_TIMEOUT_MS=10000`
- `FIREBASE_PROJECT_ID=your_project_id`
- `FIREBASE_CLIENT_EMAIL=your_client_email`
- `FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
- `NIRBHAYA_SERVICE_URL=https://your-chatbot-service-url` (or keep local URL only for local development)
- `CORS_ORIGIN=https://your-frontend-domain.vercel.app`

For multiple allowed origins, use comma-separated values:

`CORS_ORIGIN=https://your-frontend-domain.vercel.app,https://www.yourdomain.com`

## 5. Generate and Verify Public Backend URL

1. After deploy, open Railway service.
2. Copy generated public URL (for example: `https://rakshamarg-backend-production.up.railway.app`).
3. Test health endpoint in browser:
   - `https://your-railway-url/health`
4. Expected response should include `status` and `timestamp`.

## 6. Connect Vercel Frontend to Railway Backend

In Vercel project -> Settings -> Environment Variables:

- `VITE_API_BASE_URL=https://your-railway-url`
- `VITE_API_KEY=your_strong_shared_secret` (must match backend `APP_API_KEY`)
- Keep existing `VITE_GOOGLE_MAPS_API_KEY` as is

Then redeploy frontend on Vercel.

## 7. Post-Deployment Checklist

1. Open frontend URL on Vercel.
2. Trigger a backend API call from UI.
3. Verify no CORS error in browser console.
4. Verify backend logs in Railway for incoming requests.
5. Test route generation endpoint.
6. Test chat flow endpoint.
7. Test authenticated user endpoints if Firebase auth is enabled.

## 8. Common Issues

### 401 Invalid API key

- Ensure `VITE_API_KEY` in Vercel exactly matches Railway `APP_API_KEY`.

### CORS blocked

- Ensure `CORS_ORIGIN` exactly matches your frontend origin.
- For Vercel preview deployments, either add preview domain(s) or temporarily use `*`.

### Mongo connection failure

- Verify `MONGODB_URI`, network access allowlist, username/password, and database user permissions.

### Build fails with npm ci lockfile sync error

- This repository includes `nixpacks.toml` to force `npm install` instead of `npm ci` on Railway.
- If Railway still shows old behavior, open your service and trigger `Redeploy` with `Clear build cache`.
- Confirm your latest commit (including `nixpacks.toml`) is deployed.

### Build fails with python: command not found

- This happens when Railway detects Python from `nirbhaya_bot/requirements.txt` while deploying backend service.
- Keep repository root deployment and ensure `.railwayignore` is in the deployed commit.
- In Railway service settings, remove any Python build command if it exists.
- Set build command to `npm install --no-audit`.
- Trigger Railway redeploy with `Clear build cache` after pushing updates.

### Firebase private key format issue

- Keep newline escapes as `\n` in Railway variable.
- Ensure full key includes BEGIN/END lines.

## 9. Security Notes

- Do not commit real `.env` files.
- Rotate keys if exposed.
- Restrict API keys wherever possible.
- Use different keys for local and production.
