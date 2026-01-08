import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 8000,
    apiKeyHeader: 'x-api-key',
    appApiKey: process.env.APP_API_KEY || 'rakshamarg-dwklhfdewhff-efjjefwoihjfohgn',
    googleMapsApiKey: "AIzaSyA3ttqtcC59exhuPFsMoTk17XSheidQwJc",
    geminiApiKey: "niggga yessir",
    rateLimit: {
        max: 100,
        timeWindow: '1 minute'
    }
};
