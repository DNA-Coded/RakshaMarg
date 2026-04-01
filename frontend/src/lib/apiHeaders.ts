import { API_KEY } from '@/config';
import { getFirebaseIdToken } from './firebase';

type HeaderMap = Record<string, string>;

export async function getAuthHeaders(extraHeaders: HeaderMap = {}) {
    const token = await getFirebaseIdToken();

    const headers: HeaderMap = {
        'x-api-key': API_KEY,
        ...extraHeaders
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}
