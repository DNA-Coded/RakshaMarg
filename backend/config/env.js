import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load backend/.env, even when the app is started from repository root.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also allow process-level env vars from current working directory .env if present.
dotenv.config();

export const config = {
    port: process.env.PORT || 8000,
    apiKeyHeader: 'x-api-key',
appApiKey: process.env.APP_API_KEY,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    rateLimit: {
        max: 100,
        timeWindow: '1 minute'
    }
};
