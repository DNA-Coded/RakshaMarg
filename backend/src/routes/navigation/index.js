import { mapsService } from '../../services/mapsService.js';
import { geminiService } from '../../services/geminiService.js';
import { safetyRouteController } from '../../controllers/safetyRouteController.js';
import { incidentDetailsController } from '../../controllers/incidentDetailsController.js';
// import { firebaseService } from '../../services/firebase.js';



export default async function (fastify, opts) {

    // Helper: Decode Google Maps polyline
    function decodePolyline(encoded) {
        const points = [];
        let index = 0;
        let lat = 0;
        let lng = 0;

        while (index < encoded.length) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({ lat: lat / 1e5, lng: lng / 1e5 });
        }

        return points;
    }

    // Helper: Calculate Haversine distance between two points (in meters)
    function haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Helper: Calculate minimum distance from point to polyline
    function minDistanceToPolyline(currentLat, currentLng, polylinePoints) {
        let minDistance = Infinity;

        for (const point of polylinePoints) {
            const distance = haversineDistance(currentLat, currentLng, point.lat, point.lng);
            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        return minDistance;
    }

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

    // POST /track - Live navigation tracking
    fastify.post('/track', {
        schema: {
            body: {
                type: 'object',
                required: ['currentLat', 'currentLng', 'routePolyline'],
                properties: {
                    currentLat: { type: 'number' },
                    currentLng: { type: 'number' },
                    routePolyline: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        needsReroute: { type: 'boolean' },
                        distanceFromRoute: { type: 'number' },
                        timestamp: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.verifyApiKey]
    }, async (request, reply) => {
        const { currentLat, currentLng, routePolyline } = request.body;

        // Distance threshold in meters (50m default)
        const THRESHOLD_METERS = 50;

        try {
            // Decode the polyline to get route coordinates
            const polylinePoints = decodePolyline(routePolyline);

            if (polylinePoints.length === 0) {
                return reply.code(400).send({
                    error: 'Invalid polyline',
                    message: 'Could not decode route polyline'
                });
            }

            // Calculate minimum distance from current location to route
            const distanceFromRoute = minDistanceToPolyline(currentLat, currentLng, polylinePoints);

            // Determine if user is on route
            const isOnRoute = distanceFromRoute <= THRESHOLD_METERS;

            return {
                status: isOnRoute ? 'on_route' : 'off_route',
                needsReroute: !isOnRoute,
                distanceFromRoute: Math.round(distanceFromRoute * 100) / 100, // Round to 2 decimals
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error tracking navigation:', error);
            return reply.code(500).send({
                error: 'Tracking failed',
                message: error.message
            });
        }
    });

    // POST /api/v1/routes/safety - Analyze route safety
    fastify.post('/safety', {
        schema: {
            body: {
                type: 'object',
                required: ['origin', 'destination'],
                properties: {
                    origin: { type: 'string' }, // "lat,lng" or "place_id" or "Address"
                    destination: { type: 'string' } // "lat,lng" or "place_id" or "Address"
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        routes: { type: 'array' },
                        safest_route: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.verifyApiKey]
    }, safetyRouteController.analyzeSafety);

    // GET /api/v1/incident/details - Fetch incident details from Safecity
    fastify.get('/incident/details', {
        schema: {
            querystring: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'string',
                        description: 'Comma-separated incident IDs (max 15)'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        incidents: { type: 'array' }
                    }
                }
            }
        },
        onRequest: [fastify.verifyApiKey]
    }, incidentDetailsController.getDetails);
}
