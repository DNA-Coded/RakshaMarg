import { Client } from '@googlemaps/google-maps-services-js';
import { config } from '../config/env.js';

const client = new Client({});

const getRouteFingerprint = (route) => {
    const encoded = route?.overview_polyline?.points;
    if (encoded) return encoded;

    const totalDistance = Array.isArray(route?.legs)
        ? route.legs.reduce((sum, leg) => sum + (leg?.distance?.value || 0), 0)
        : 0;
    const totalDuration = Array.isArray(route?.legs)
        ? route.legs.reduce((sum, leg) => sum + (leg?.duration?.value || 0), 0)
        : 0;

    return `${route?.summary || 'route'}|${totalDistance}|${totalDuration}`;
};

const getRouteDurationSeconds = (route) => {
    if (!Array.isArray(route?.legs)) return Number.MAX_SAFE_INTEGER;
    return route.legs.reduce((sum, leg) => sum + (leg?.duration?.value || 0), 0);
};

const buildDirectionsParams = (origin, destination, extra = {}) => ({
    origin,
    destination,
    alternatives: true,
    key: config.googleMapsApiKey,
    mode: 'driving',
    region: 'in',
    ...extra,
});

export const mapsService = {
    async getRoutes(origin, destination) {
        if (!config.googleMapsApiKey) {
            console.warn('Google Maps API Key missing');
            // Return mock data for scaffold testing if key is missing
            return [];
        }

        const requestVariants = [
            buildDirectionsParams(origin, destination),
            buildDirectionsParams(origin, destination, { avoid: ['highways'] }),
            buildDirectionsParams(origin, destination, { avoid: ['tolls'] }),
            buildDirectionsParams(origin, destination, { avoid: ['highways', 'tolls'] }),
        ];

        const collectedRoutes = [];

        for (const params of requestVariants) {
            try {
                const response = await client.directions({ params });
                if (Array.isArray(response?.data?.routes)) {
                    collectedRoutes.push(...response.data.routes);
                }
            } catch (error) {
                console.warn('Maps API strategy failed:', error.response ? error.response.data : error.message);
            }
        }

        const uniqueRouteMap = new Map();
        for (const route of collectedRoutes) {
            const key = getRouteFingerprint(route);
            if (!uniqueRouteMap.has(key)) {
                uniqueRouteMap.set(key, route);
            }
        }

        const mergedRoutes = Array.from(uniqueRouteMap.values())
            .sort((a, b) => getRouteDurationSeconds(a) - getRouteDurationSeconds(b))
            .slice(0, 3);

        if (mergedRoutes.length === 0) {
            throw new Error('Failed to fetch routes');
        }

        return mergedRoutes;
    },

    async getNearbyPlaces(location) {
        // Scaffold: Implement nearby search for safety factors (Police, Hospitals, active areas)
        // client.placesNearby(...)
        return [];
    }
};
