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

    const expanded = new Set();

    for (const origin of origins) {
        const normalized = origin.replace(/\/$/, '');
        expanded.add(normalized);

        // If configured with apex domain, also allow www variant (and vice versa).
        // This prevents common production mismatch: rakshamarg.app vs www.rakshamarg.app.
        try {
            const url = new URL(normalized);
            const hostname = url.hostname;
            const isWww = hostname.startsWith('www.');
            const counterpartHost = isWww ? hostname.slice(4) : `www.${hostname}`;

            const counterpart = `${url.protocol}//${counterpartHost}${url.port ? `:${url.port}` : ''}`;
            expanded.add(counterpart);
        } catch {
            // Ignore invalid URL entries and keep original value as-is.
        }
    }

    const finalOrigins = Array.from(expanded);
    return finalOrigins.length === 1 ? finalOrigins[0] : finalOrigins;
}

function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
    weatherApiKey: process.env.WEATHER_API_KEY,
    weatherProvider: process.env.WEATHER_PROVIDER || 'openweathermap',
    weatherRequestTimeoutMs: parseNumber(process.env.WEATHER_REQUEST_TIMEOUT_MS, 8000),
    weatherCacheTtlMs: parseNumber(process.env.WEATHER_CACHE_TTL_MS, 120000),
    weatherAlertThresholds: {
        windKmh: parseNumber(process.env.WEATHER_ALERT_WIND_KMH, 35),
        heavyRainMmPerHour: parseNumber(process.env.WEATHER_ALERT_RAIN_MM_HOUR, 7),
        extremeTempHighC: parseNumber(process.env.WEATHER_ALERT_EXTREME_TEMP_HIGH_C, 42),
        extremeTempLowC: parseNumber(process.env.WEATHER_ALERT_EXTREME_TEMP_LOW_C, 5)
    },
    rateLimit: {
        max: 100,
        timeWindow: '1 minute'
    }
};
