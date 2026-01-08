import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load incident data
let incidentData = null;

async function loadIncidentData() {
    if (!incidentData) {
        const dataPath = path.join(__dirname, '..', '..', 'latslong.json');
        const rawData = await fs.readFile(dataPath, 'utf-8');
        incidentData = JSON.parse(rawData);
    }
    return incidentData;
}

/**
 * Decode Google Maps polyline
 * @param {string} encoded - Encoded polyline string
 * @returns {Array} - Array of {lat, lng} points
 */
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

/**
 * Generate rectangular bounds for a route using polyline chunks
 * @param {Object} route - Google Maps route object
 * @returns {Array} - Array of rectangular bounds
 */
function generateRouteBounds(route) {
    const bounds = [];
    
    // Try to get polyline from the route
    let polylinePoints = [];
    
    // Google Maps API returns overview_polyline with encoded points
    if (route.overview_polyline && route.overview_polyline.points) {
        polylinePoints = decodePolyline(route.overview_polyline.points);
    }
    
    // If we have polyline points, create bounds from chunks
    if (polylinePoints.length > 0) {
        // Define chunk size - analyze every N points as a segment
        // Smaller chunks = more granular analysis but more computation
        const CHUNK_SIZE = 10; // Analyze every 10 points
        const BUFFER_KM = 0.5; // Buffer zone of 0.5km around each chunk
        
        // Convert km to approximate degrees (rough approximation)
        // 1 degree ≈ 111km at equator
        const bufferDegrees = BUFFER_KM / 111;
        
        for (let i = 0; i < polylinePoints.length; i += CHUNK_SIZE) {
            const chunk = polylinePoints.slice(i, Math.min(i + CHUNK_SIZE, polylinePoints.length));
            
            if (chunk.length === 0) continue;
            
            // Find min/max lat/lng in this chunk
            let minLat = chunk[0].lat;
            let maxLat = chunk[0].lat;
            let minLng = chunk[0].lng;
            let maxLng = chunk[0].lng;
            
            for (const point of chunk) {
                minLat = Math.min(minLat, point.lat);
                maxLat = Math.max(maxLat, point.lat);
                minLng = Math.min(minLng, point.lng);
                maxLng = Math.max(maxLng, point.lng);
            }
            
            // Add buffer zone around the chunk
            bounds.push({
                ne: {
                    lat: maxLat + bufferDegrees,
                    lng: maxLng + bufferDegrees
                },
                sw: {
                    lat: minLat - bufferDegrees,
                    lng: minLng - bufferDegrees
                }
            });
        }
    } else {
        // Fallback: use overall route bounds if polyline not available
        if (route.bounds) {
            const { northeast, southwest } = route.bounds;
            bounds.push({
                ne: { lat: northeast.lat, lng: northeast.lng },
                sw: { lat: southwest.lat, lng: southwest.lng }
            });
        }
    }
    
    return bounds;
}

/**
 * Find incidents within a rectangular bound
 * @param {Object} bound - Rectangular bound {ne: {lat, lng}, sw: {lat, lng}}
 * @param {Object} data - Incident data
 * @returns {Array} - Array of incident IDs
 */
function findIncidentsInBound(bound, data) {
    const incidents = [];
    
    for (const incident of data.data) {
        const lat = parseFloat(incident.latitude);
        const lng = parseFloat(incident.longitude);
        
        // Check if incident falls within the bound
        if (
            lat >= bound.sw.lat &&
            lat <= bound.ne.lat &&
            lng >= bound.sw.lng &&
            lng <= bound.ne.lng
        ) {
            incidents.push(incident.id);
        }
    }
    
    return incidents;
}

/**
 * Get time-of-day risk multiplier
 * @param {Date} date - Current date/time
 * @returns {number} - Risk multiplier
 */
function getTimeRiskMultiplier(date = new Date()) {
    const hour = date.getHours();
    
    // Time Window	Multiplier
    // 05:00–10:00	0.7
    // 10:00–17:00	0.8
    // 17:00–21:00	1.0
    // 21:00–05:00	1.3
    
    if (hour >= 5 && hour < 10) {
        return 0.7;
    } else if (hour >= 10 && hour < 17) {
        return 0.8;
    } else if (hour >= 17 && hour < 21) {
        return 1.0;
    } else { // 21:00–05:00
        return 1.3;
    }
}

/**
 * Calculate safety score for a route using improved logic
 * @param {number} incidentCount - Total number of incidents
 * @param {Date} currentTime - Current time (optional)
 * @returns {Object} - {score: number, riskLevel: string}
 */
function calculateSafetyScore(incidentCount, currentTime = new Date()) {
    // Step 1: Logarithmic scaling for incident penalty
    // This prevents early capping and differentiates between high incident counts
    // Formula: penalty = 20 * log10(incidents + 1) 
    // 0 incidents = 0 penalty
    // 10 incidents = 20 penalty
    // 100 incidents = 40 penalty
    // 1000 incidents = 60 penalty
    let incidentPenalty = 0;
    if (incidentCount > 0) {
        incidentPenalty = 20 * Math.log10(incidentCount + 1);
    }
    
    // Cap at 75 to allow some base score even for very high incident areas
    incidentPenalty = Math.min(incidentPenalty, 75);
    
    // Step 2: Time-of-day risk multiplier
    const multiplier = getTimeRiskMultiplier(currentTime);
    const timeAdjustedPenalty = incidentPenalty * multiplier;
    
    // Step 3: Final safety score
    const rawScore = 100 - timeAdjustedPenalty;
    const finalScore = Math.max(0, Math.min(100, rawScore));
    
    // Determine risk level with better thresholds
    let riskLevel;
    if (finalScore >= 75) {
        riskLevel = 'Low Risk';
    } else if (finalScore >= 50) {
        riskLevel = 'Moderate Risk';
    } else {
        riskLevel = 'High Risk';
    }
    
    return {
        score: Math.round(finalScore),
        riskLevel
    };
}

/**
 * Analyze a single route for safety
 * @param {Object} route - Google Maps route object
 * @param {Date} currentTime - Current time (optional)
 * @returns {Object} - Safety analysis results
 */
async function analyzeRouteSafety(route, currentTime = new Date()) {
    // Load incident data
    const data = await loadIncidentData();
    
    // Generate bounds for the route
    const bounds = generateRouteBounds(route);
    
    // Find all incidents across all bounds and deduplicate
    const uniqueIncidentIds = new Set();
    for (const bound of bounds) {
        const incidents = findIncidentsInBound(bound, data);
        incidents.forEach(id => uniqueIncidentIds.add(id));
    }
    
    // Convert Set to Array
    const allIncidentIds = Array.from(uniqueIncidentIds);
    
    // Count unique incidents
    const incidentCount = allIncidentIds.length;
    
    // Calculate safety score
    const { score, riskLevel } = calculateSafetyScore(incidentCount, currentTime);
    
    // Extract route name from Google Maps response
    const routeName = route.summary || 'Route';
    
    return {
        route_name: routeName,
        safety_score: score,
        incident_count: incidentCount,
        risk_level: riskLevel,
        bounds_analyzed: bounds.length,
        incident_ids: allIncidentIds
    };
}

/**
 * Analyze multiple routes and return safety information
 * @param {Array} routes - Array of Google Maps route objects
 * @param {Date} currentTime - Current time (optional)
 * @returns {Object} - Complete analysis with safest route
 */
export async function analyzeRoutes(routes, currentTime = new Date()) {
    const analyses = await Promise.all(
        routes.map(route => analyzeRouteSafety(route, currentTime))
    );
    
    // Find the safest route (highest safety score, lowest incident count as tiebreaker)
    let safestRoute = null;
    let highestScore = -1;
    let lowestIncidents = Infinity;
    
    for (const analysis of analyses) {
        const isBetterScore = analysis.safety_score > highestScore;
        const isSameScoreFewerIncidents = 
            analysis.safety_score === highestScore && 
            analysis.incident_count < lowestIncidents;
        
        if (isBetterScore || isSameScoreFewerIncidents) {
            highestScore = analysis.safety_score;
            lowestIncidents = analysis.incident_count;
            safestRoute = analysis.route_name;
        }
    }
    
    return {
        routes: analyses,
        safest_route: safestRoute
    };
}

/**
 * Get incident IDs for a specific route (for internal use)
 * @param {Object} route - Google Maps route object
 * @returns {Array} - Array of incident IDs
 */
export async function getIncidentIdsForRoute(route) {
    const data = await loadIncidentData();
    const bounds = generateRouteBounds(route);
    
    // Deduplicate incident IDs
    const uniqueIncidentIds = new Set();
    for (const bound of bounds) {
        const incidents = findIncidentsInBound(bound, data);
        incidents.forEach(id => uniqueIncidentIds.add(id));
    }
    
    return Array.from(uniqueIncidentIds);
}
