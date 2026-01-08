import { fetchIncidentDetailsMultiple } from '../services/safecityService.js';

/**
 * Controller for incident details
 */
export const incidentDetailsController = {
    /**
     * GET /api/v1/incident/details?id=11837,11842,12099
     * Fetch detailed incident information from Safecity API
     */
    async getDetails(request, reply) {
        try {
            const { id } = request.query;
            
            // Validate input
            if (!id) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'Query parameter "id" is required. Format: ?id=11837,11842,12099'
                });
            }
            
            // Parse incident IDs
            let incidentIds;
            if (Array.isArray(id)) {
                // If multiple id params: ?id=11837&id=11842
                incidentIds = id;
            } else {
                // If comma-separated: ?id=11837,11842,12099
                incidentIds = id.split(',').map(i => i.trim());
            }
            
            // Validate maximum 15 IDs
            if (incidentIds.length > 15) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'Maximum 15 incident IDs allowed. You provided ' + incidentIds.length
                });
            }
            
            // Fetch incident details from Safecity API
            const result = await fetchIncidentDetailsMultiple(incidentIds);
            
            // Return results
            return reply.code(200).send(result);
            
        } catch (error) {
            console.error('Error fetching incident details:', error);
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: error.message || 'An error occurred while fetching incident details'
            });
        }
    }
};
