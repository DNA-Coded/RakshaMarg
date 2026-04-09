import axios from 'axios';

import { API_BASE_URL, API_KEY } from '../config';
import { getFirebaseIdToken } from '@/lib/firebase';

const getBaseUrl = () => {
    const base = API_BASE_URL.trim().replace(/\/$/, '');

    if (!base) {
        const host = window.location.hostname;
        const isLocalHost = host === 'localhost' || host === '127.0.0.1';

        if (isLocalHost) {
            // Local development uses Vite proxy (/api -> localhost:8000).
            return '/api/v1/navigation';
        }

        throw new Error(
            'Backend URL is not configured. Set VITE_API_BASE_URL to your deployed backend URL.'
        );
    }

    return base.endsWith('/api/v1/navigation') ? base : `${base}/api/v1/navigation`;
};

const api = axios.create({
    baseURL: getBaseUrl()
});

const formatApiError = (error: any, fallback = 'Request failed'): Error => {
    const status = error?.response?.status;
    const responseData = error?.response?.data;
    const responseMessage = responseData?.message || responseData?.error;

    if (status === 401) {
        return new Error(
            'Unauthorized (HTTP 401): check that frontend VITE_API_KEY exactly matches backend APP_API_KEY.'
        );
    }

    if (responseMessage) {
        return new Error(status ? `${responseMessage} (HTTP ${status})` : responseMessage);
    }

    if (error?.message) {
        return new Error(error.message);
    }

    return new Error(fallback);
};

export const getFriendlyApiError = (error: any, fallback: string): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    const formatted = formatApiError(error, fallback);
    return formatted.message;
};

api.interceptors.request.use(async (requestConfig) => {
    const token = await getFirebaseIdToken();
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    requestConfig.headers = {
        ...requestConfig.headers,
        'Content-Type': 'application/json'
    };

    if (!API_KEY && !isLocalHost) {
        throw new Error(
            'VITE_API_KEY is missing in production. Set it to the same value as backend APP_API_KEY.'
        );
    }

    if (API_KEY) {
        requestConfig.headers['x-api-key'] = API_KEY;
    }

    if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    return requestConfig;
});

export interface RouteSafetyResponse {
    routes: RouteInfo[];
    safest_route: string;
}

export interface RouteInfo {
    route_name: string;
    safety_score: number;
    incident_count: number;
    risk_level: string;
    bounds_analyzed: number;
    incident_ids: number[];
}

export interface IncidentDetail {
    id: string;
    lang_id: string;
    status: string;
    admin_id: string;
    building: string;
    landmark: string;
    area: string;
    city: string;
    state: string;
    country: string;
    latitude: string;
    longitude: string;
    created_on: string;
    description: string;
    additional_detail: string;
    age: string;
    gender_id: string;
    gender: string | null;
    incident_date: string;
    is_date_estimate: string;
    time_from: string;
    time_to: string;
    is_time_estimate: string;
    categories: string;
    posted_by: string;
    detail_id: string | null;
    answer_tag: string | null;
    cat_ids: string;
    answers: any;
}

export interface WeatherAlert {
    type: string;
    severity: 'none' | 'low' | 'moderate' | 'severe' | 'extreme' | string;
    title: string;
    message: string;
}

export interface WeatherSnapshot {
    condition: string;
    conditionLabel: string;
    temperatureC: number;
    windSpeedKmh: number;
    rainfallMm: number;
    provider: string;
    observedAt: string;
}

export interface WeatherAlertsResponse {
    status: string;
    current: WeatherSnapshot | null;
    alerts: WeatherAlert[];
    highestSeverity: 'none' | 'low' | 'moderate' | 'severe' | 'extreme' | string;
    updatedAt: string;
    reason?: string;
    providerStatus?: number | null;
    providerMessage?: string;
    triggerReason?: string;
    routeAware?: boolean;
}

export const analyzeRouteSafety = async (origin: string, destination: string): Promise<RouteSafetyResponse> => {
    try {
        const response = await api.post('/safety', {
            origin,
            destination,
        });
        return response.data;
    } catch (error) {
        console.error('Error analyzing route safety:', error);
        throw formatApiError(error, 'Failed to analyze route safety');
    }
};

export const getIncidentDetails = async (ids: number[]): Promise<IncidentDetail[]> => {
    try {
        // API supports max 10 IDs at a time
        if (ids.length > 10) {
            console.warn('getIncidentDetails called with more than 10 IDs. API limit is 10.');
        }

        // Take first 10 IDs if more are provided, or just send all if <= 10.
        const idsToFetch = ids.slice(0, 10).join(',');

        const response = await api.get(`/incident/details?id=${idsToFetch}`);

        // Parse response based on actual structure: { count: number, incidents: [{ status, message, data: IncidentDetail }] }
        if (response.data && Array.isArray(response.data.incidents)) {
            return response.data.incidents.map((item: any) => item.data);
        }

        return [];
    } catch (error) {
        console.error('Error fetching incident details:', error);
        throw formatApiError(error, 'Failed to fetch incident details');
    }
};

export const getWeatherAlerts = async (
    currentLat: number,
    currentLng: number,
    routePolyline?: string
): Promise<WeatherAlertsResponse> => {
    try {
        const response = await api.post('/weather-alerts', {
            currentLat,
            currentLng,
            routePolyline,
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching weather alerts:', error);
        throw formatApiError(error, 'Failed to fetch weather alerts');
    }
};

export const getWeatherSnapshot = async (
    lat: number,
    lng: number
): Promise<WeatherAlertsResponse> => {
    try {
        const response = await api.get('/weather', {
            params: { lat, lng }
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching weather snapshot:', error);
        throw formatApiError(error, 'Failed to fetch weather snapshot');
    }
};
