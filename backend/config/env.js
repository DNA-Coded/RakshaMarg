import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load backend/.env, even when the app is started from repository root.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also allow process-level env vars from current working directory .env if present.
dotenv.config();

function parseCorsOrigin(value) {
    if (!value || value.trim() === '*') {
        return '*';
    }

    const origins = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return origins.length === 1 ? origins[0] : origins;
}

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8000,
    corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
    apiKeyHeader: 'x-api-key',
    appApiKey: process.env.APP_API_KEY,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    mongodbUri: process.env.MONGODB_URI,
    mongodbDbName: process.env.MONGODB_DB_NAME || 'rakshamarg',
    mongodbRequired: (process.env.MONGODB_REQUIRED || 'false').toLowerCase() === 'true',
    mongodbConnectTimeoutMs: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000),
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    nirbhayaServiceUrl: process.env.NIRBHAYA_SERVICE_URL || 'http://localhost:8001',
    rateLimit: {
        max: 100,
        timeWindow: '1 minute'
    }
};
