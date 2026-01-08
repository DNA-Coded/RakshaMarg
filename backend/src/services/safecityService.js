/**
 * Service to fetch incident details from Safecity API
 * Safecity does not support batch requests, so we fetch sequentially
 */

const SAFECITY_API_URL = 'https://webapp.safecity.in/api/reported-incident/details';

/**
 * Fetch details for a single incident from Safecity API
 * @param {string} incidentId - The incident ID
 * @returns {Promise<Object|null>} - Incident details or null if failed
 */
async function fetchIncidentDetails(incidentId) {
    try {
        const response = await fetch(SAFECITY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: `incident_id=${incidentId}`
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch incident ${incidentId}: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching incident ${incidentId}:`, error.message);
        return null;
    }
}

/**
 * Fetch details for multiple incidents sequentially
 * @param {Array<string>} incidentIds - Array of incident IDs (max 15)
 * @returns {Promise<Object>} - {count: number, incidents: Array}
 */
export async function fetchIncidentDetailsMultiple(incidentIds) {
    if (!Array.isArray(incidentIds) || incidentIds.length === 0) {
        return { count: 0, incidents: [] };
    }
    
    // Limit to 15 IDs as per spec
    const limitedIds = incidentIds.slice(0, 15);
    
    const incidents = [];
    
    // Fetch sequentially (no batch support in Safecity API)
    for (const id of limitedIds) {
        const details = await fetchIncidentDetails(id);
        if (details) {
            incidents.push(details);
        }
    }
    
    return {
        count: incidents.length,
        incidents
    };
}
