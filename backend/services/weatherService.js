import axios from 'axios';
import { config } from '../config/env.js';

const weatherCache = new Map();
const inFlightRequests = new Map();

const severityRank = {
    none: 0,
    low: 1,
    moderate: 2,
    severe: 3,
    extreme: 4
};

function normalizeConditionCode(main) {
    if (!main) return 'clear';
    const value = String(main).toLowerCase();

    if (value.includes('thunderstorm')) return 'thunderstorm';
    if (value.includes('drizzle') || value.includes('rain')) return 'rain';
    if (value.includes('snow')) return 'snow';
    if (value.includes('mist') || value.includes('fog') || value.includes('haze') || value.includes('smoke')) return 'low_visibility';
    if (value.includes('squall') || value.includes('tornado')) return 'wind_extreme';

    return 'clear';
}

function buildCurrentWeather(payload) {
    const primary = payload?.weather?.[0] || {};
    const temperatureC = Number(payload?.main?.temp ?? 0);
    const windSpeedKmh = Number(payload?.wind?.speed ?? 0) * 3.6;
    const rainfallMm = Number(payload?.rain?.['1h'] ?? payload?.rain?.['3h'] ?? 0);

    return {
        condition: normalizeConditionCode(primary.main),
        conditionLabel: primary.description || primary.main || 'clear',
        temperatureC: Math.round(temperatureC * 10) / 10,
        windSpeedKmh: Math.round(windSpeedKmh * 10) / 10,
        rainfallMm: Math.round(rainfallMm * 10) / 10,
        provider: 'openweathermap',
        observedAt: payload?.dt ? new Date(payload.dt * 1000).toISOString() : new Date().toISOString()
    };
}

function computeAlerts(current) {
    const alerts = [];
    const {
        windKmh,
        heavyRainMmPerHour,
        extremeTempHighC,
        extremeTempLowC
    } = config.weatherAlertThresholds;

    if (current.condition === 'thunderstorm') {
        alerts.push({
            type: 'thunderstorm',
            severity: 'extreme',
            title: 'Thunderstorm risk on route',
            message: 'Severe thunderstorm activity detected nearby. Consider delaying travel if possible.'
        });
    }

    if (current.windSpeedKmh >= windKmh) {
        alerts.push({
            type: 'high_wind',
            severity: current.windSpeedKmh >= windKmh * 1.4 ? 'severe' : 'moderate',
            title: 'High wind conditions',
            message: `Strong winds around ${Math.round(current.windSpeedKmh)} km/h may reduce control and visibility.`
        });
    }

    if (current.rainfallMm >= heavyRainMmPerHour) {
        alerts.push({
            type: 'heavy_rain',
            severity: current.rainfallMm >= heavyRainMmPerHour * 1.6 ? 'severe' : 'moderate',
            title: 'Heavy rainfall expected',
            message: 'Heavy rain can reduce road visibility and increase braking distance.'
        });
    }

    if (current.temperatureC >= extremeTempHighC || current.temperatureC <= extremeTempLowC) {
        alerts.push({
            type: 'extreme_temperature',
            severity: 'moderate',
            title: 'Extreme temperature conditions',
            message: 'Carry water, avoid long exposure, and stay alert to fatigue.'
        });
    }

    if (current.condition === 'low_visibility') {
        alerts.push({
            type: 'low_visibility',
            severity: 'moderate',
            title: 'Low visibility conditions',
            message: 'Fog or haze detected. Keep headlights on and maintain extra following distance.'
        });
    }

    const highestSeverity = alerts.reduce((highest, alert) => {
        return severityRank[alert.severity] > severityRank[highest] ? alert.severity : highest;
    }, 'none');

    return {
        alerts,
        highestSeverity
    };
}

function getCacheKey(lat, lng) {
    return `${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

async function fetchOpenWeather(lat, lng) {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
            lat,
            lon: lng,
            appid: config.weatherApiKey,
            units: 'metric'
        },
        timeout: config.weatherRequestTimeoutMs
    });

    return response.data;
}

function getProviderFailurePayload(error) {
    const status = error?.response?.status;
    const providerMessage = error?.response?.data?.message || error?.message || 'unknown_provider_error';

    let reason = 'provider_error';
    if (status === 401) {
        reason = 'invalid_api_key';
    } else if (status === 429) {
        reason = 'provider_rate_limited';
    } else if (status >= 500) {
        reason = 'provider_unavailable';
    }

    return {
        status: 'unavailable',
        reason,
        providerStatus: status || null,
        providerMessage,
        current: null,
        alerts: [],
        highestSeverity: 'none',
        updatedAt: new Date().toISOString()
    };
}

export const weatherService = {
    severityRank,

    async getWeatherSnapshot(lat, lng) {
        if (!config.weatherApiKey) {
            return {
                status: 'unavailable',
                reason: 'missing_weather_api_key',
                current: null,
                alerts: [],
                highestSeverity: 'none',
                updatedAt: new Date().toISOString()
            };
        }

        if (config.weatherProvider !== 'openweathermap') {
            return {
                status: 'unavailable',
                reason: 'unsupported_weather_provider',
                current: null,
                alerts: [],
                highestSeverity: 'none',
                updatedAt: new Date().toISOString()
            };
        }

        const cacheKey = getCacheKey(lat, lng);
        const now = Date.now();
        const cached = weatherCache.get(cacheKey);

        if (cached && now - cached.cachedAt < config.weatherCacheTtlMs) {
            return cached.payload;
        }

        if (inFlightRequests.has(cacheKey)) {
            return inFlightRequests.get(cacheKey);
        }

        const requestPromise = (async () => {
            try {
                const providerPayload = await fetchOpenWeather(lat, lng);
                const current = buildCurrentWeather(providerPayload);
                const { alerts, highestSeverity } = computeAlerts(current);

                const payload = {
                    status: 'ok',
                    current,
                    alerts,
                    highestSeverity,
                    updatedAt: new Date().toISOString()
                };

                weatherCache.set(cacheKey, {
                    cachedAt: Date.now(),
                    payload
                });

                return payload;
            } catch (error) {
                return getProviderFailurePayload(error);
            }
        })();

        inFlightRequests.set(cacheKey, requestPromise);

        try {
            return await requestPromise;
        } finally {
            inFlightRequests.delete(cacheKey);
        }
    }
};
