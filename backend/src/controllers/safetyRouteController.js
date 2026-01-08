import { mapsService } from '../services/mapsService.js';
import { analyzeRoutes } from '../services/safetyAnalysisService.js';

/**
 * Controller for safety route analysis
 */
export const safetyRouteController = {
    /**
     * POST /api/v1/routes/safety
     * Analyze routes for safety and return the safest option
     */
    async analyzeSafety(request, reply) {
        try {
            const { origin, destination } = request.body;
            
            // Validate input
            if (!origin || !destination) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'Both origin and destination are required'
                });
            }
            
            // 1. Fetch routes from Google Maps
            const routes = await mapsService.getRoutes(origin, destination);
            
            if (!routes || routes.length === 0) {
                return reply.code(404).send({
                    error: 'No Routes Found',
                    message: 'No routes found between the specified origin and destination'
                });
            }
            
            // 2. Analyze routes for safety
            const currentTime = new Date();
            const analysis = await analyzeRoutes(routes, currentTime);
            
            // 3. Return results
            return reply.code(200).send(analysis);
            
        } catch (error) {
            console.error('Error in safety route analysis:', error);
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: error.message || 'An error occurred while analyzing routes'
            });
        }
    }
};
