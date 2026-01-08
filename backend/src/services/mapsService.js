import { Client } from '@googlemaps/google-maps-services-js';
import { config } from '../config/env.js';

const client = new Client({});

export const mapsService = {
    async getRoutes(origin, destination) {
        if (!config.googleMapsApiKey) {
            console.warn('Google Maps API Key missing');
            // Return mock data for scaffold testing if key is missing
            return [];
        }

        try {
            const response = await client.directions({
                params: {
                    origin,
                    destination,
                    alternatives: true, // Fetch multiple routes
                    key: config.googleMapsApiKey,
                    mode: 'driving' // or walking, bicycling, transit
                }
            });
            return response.data.routes;
        } catch (error) {
            console.error('Maps API Error:', error.response ? error.response.data : error.message);
            throw new Error('Failed to fetch routes');
        }
    },

    async getNearbyPlaces(location) {
        // Scaffold: Implement nearby search for safety factors (Police, Hospitals, active areas)
        // client.placesNearby(...)
        return [];
    }
};
