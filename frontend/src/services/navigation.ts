import axios from 'axios';

import { API_BASE_URL, API_KEY } from '../config';
import { getFirebaseIdToken } from '@/lib/firebase';

const getBaseUrl = () => {
    const base = API_BASE_URL.replace(/\/$/, "");
    return base.endsWith('/api/v1/navigation') ? base : `${base}/api/v1/navigation`;
};

const api = axios.create({
    baseURL: getBaseUrl()
});

api.interceptors.request.use(async (requestConfig) => {
    const token = await getFirebaseIdToken();

    requestConfig.headers = {
        ...requestConfig.headers,
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    };

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

export const analyzeRouteSafety = async (origin: string, destination: string): Promise<RouteSafetyResponse> => {
    try {
        const response = await api.post('/safety', {
            origin,
            destination,
        });
        return response.data;
    } catch (error) {
        console.error('Error analyzing route safety:', error);
        throw error;
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
        throw error;
    }
};
