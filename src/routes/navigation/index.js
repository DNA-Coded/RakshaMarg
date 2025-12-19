import { mapsService } from '../../services/mapsService.js';
import { geminiService } from '../../services/geminiService.js';
// import { firebaseService } from '../../services/firebase.js';



export default async function (fastify, opts) {

    // GET /route - Calculate safest route
    fastify.get('/route', {
        // Define schema for validation and documentation
        schema: {
            querystring: {
                type: 'object',
                required: ['origin', 'destination'],
                properties: {
                    origin: { type: 'string' }, // "lat,lng" or "Address"
                    destination: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        routes: { type: 'array' },
                        meta: { type: 'object' }
                    }
                }
            }
        },
        // Attach auth hooks if needed
        onRequest: [fastify.verifyApiKey]
    }, async (request, reply) => {
        const { origin, destination } = request.query;

        // 1. Fetch Routes from Google Maps
        const routes = await mapsService.getRoutes(origin, destination);

        // 2. Enhance with Safety Data
        // Analyze all routes with Gemini as requested

        // Machine Context Placeholder (to be filled manually later)
        const machineContext = {};

        const analyzedRoutes = await Promise.all(routes.map(async (route) => {
            // Mock data for places and crime (placeholder for future integrations)
            const nearbyPlaces = [];
            const crimeStats = [];

            // 3. Analyze with Gemini
            const analysisResult = await geminiService.analyzeSafety(route, crimeStats, machineContext);

            return {
                ...route,
                ...analysisResult
            };
        }));

        // Sort routes by safety score (highest first)
        const sortedRoutes = analyzedRoutes.sort((a, b) => {
            const scoreA = a.safetyScore || 0;
            const scoreB = b.safetyScore || 0;
            return scoreB - scoreA;
        });

        // Select the safest route
        const safestRoute = sortedRoutes.length > 0 ? sortedRoutes[0] : null;

        return {
            routes: sortedRoutes,
            meta: {
                count: sortedRoutes.length,
                provider: 'Google Maps + Gemini',
                timestamp: new Date().toISOString()
            }
        };
    });

    // POST /sos - Trigger SOS
    fastify.post('/sos', {
        onRequest: [fastify.verifyApiKey] // And maybe verifyFirebaseToken
    }, async (request, reply) => {
        // Logic to handle SOS
        return { status: 'SOS Triggered' };
    });
}
