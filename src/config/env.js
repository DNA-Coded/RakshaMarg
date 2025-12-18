import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    apiKeyHeader: 'x-api-key',
    appApiKey: process.env.APP_API_KEY || 'rakshamarg-dwklhfdewhff-efjjefwoihjfohgn',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyA3ttqtcC59exhuPFsMoTk17XSheidQwJc",
    geminiApiKey: process.env.GEMINI_API_KEY || "AIzaSyDXS0Esuf7SDSEvKRn-Ei1-H1cffQIae_w",
    rateLimit: {
        max: 100,
        timeWindow: '1 minute'
    }
};
