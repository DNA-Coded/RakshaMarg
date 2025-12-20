import { mapsService } from '../../services/mapsService.js';
import { geminiService } from '../../services/geminiService.js';
// import { firebaseService } from '../../services/firebase.js';



export default async function (fastify, opts) {

    // Helper: Map Gemini risk level to Crime Score (0-30)
    function mapRiskLevelToCrimeScore(riskLevel) {
        switch (riskLevel) {
            case 'low':
                return 28; // Low crime = high safety score
            case 'moderate':
                return 17; // Moderate crime = medium safety score
            case 'high':
                return 5; // High crime = low safety score
            case 'unknown':
            default:
                return 15; // Neutral fallback
        }
    }

    // Helper: Calculate deterministic safety score
    function calculateSafetyScore(route, crimeScore) {
        // Start with crime score (0-30)
        let score = crimeScore;

        // Add other safety factors (placeholder logic - extend as needed)
        // Street Lighting (0-20): placeholder
        const lightingScore = 15;

        // Crowd/Activity (0-20): placeholder
        const crowdScore = 15;

        // Nearby Help (0-15): placeholder
        const helpScore = 10;

        // Time of Day (0-15): placeholder
        const timeScore = 10;

        score += lightingScore + crowdScore + helpScore + timeScore;

        // Clamp between 0 and 100
        return Math.max(0, Math.min(100, score));
    }

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
        // Machine Context Placeholder (to be filled manually later)
        const machineContext = {};

        const analyzedRoutes = await Promise.all(routes.map(async (route) => {
            // Mock data for places and crime (placeholder for future integrations)
            const nearbyPlaces = [];
            const crimeStats = [];

            // 3. Analyze with Gemini for crime/risk intelligence
            let crimeScore = 15; // Default neutral score
            let aiCrimeAnalysis = null;

            try {
                const geminiResult = await geminiService.analyzeSafety(route, crimeStats);

                // Extract risk level from Gemini response
                const riskLevel = geminiResult?.derived_risk_summary?.overall_risk_level || 'unknown';

                // Map risk level to crime score
                crimeScore = mapRiskLevelToCrimeScore(riskLevel);

                // Attach Gemini output for transparency
                aiCrimeAnalysis = geminiResult;
            } catch (error) {
                console.error('Error calling Gemini service:', error);
                // Use neutral crime score on failure
                crimeScore = 15;
                aiCrimeAnalysis = {
                    status: 'error',
                    reason: 'service_unavailable',
                    error: error.message
                };
            }

            // 4. Calculate deterministic safety score
            const safetyScore = calculateSafetyScore(route, crimeScore);

            return {
                ...route,
                safetyScore,
                crimeScore,
                aiCrimeAnalysis,
                modelUsed: aiCrimeAnalysis?.modelUsed || 'fallback'
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
