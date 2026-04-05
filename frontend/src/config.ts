const normalizeBase = (value: string) => value.trim().replace(/\/$/, '');

export const API_BASE_URL = normalizeBase(import.meta.env.VITE_API_BASE_URL || '');
export const API_KEY = import.meta.env.VITE_API_KEY || '';

export const getNavigationApiBaseUrl = () => {
	if (API_BASE_URL) {
		return API_BASE_URL.endsWith('/api/v1/navigation')
			? API_BASE_URL
			: `${API_BASE_URL}/api/v1/navigation`;
	}

	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		if (host === 'localhost' || host === '127.0.0.1') {
			return '/api/v1/navigation';
		}
	}

	// Safe fallback for browser usage when base URL is unset.
	return '/api/v1/navigation';
};

export const buildNavigationApiUrl = (path: string) => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${getNavigationApiBaseUrl()}${normalizedPath}`;
};
