import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 8000,
    apiKeyHeader: 'x-api-key',
    appApiKey: process.env.APP_API_KEY || 'rakshamarg-dwklhfdewhff-efjjefwoihjfohgn',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    rateLimit: {
        max: 100,
        timeWindow: '1 minute'
    }
};
