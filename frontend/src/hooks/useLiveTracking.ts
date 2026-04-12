import { useState, useRef, useEffect } from 'react';

import { buildNavigationApiUrl } from '../config';
import { getAuthHeaders } from '@/lib/apiHeaders';
import { toast } from './use-toast';
import { getWeatherAlerts, WeatherAlert, WeatherSnapshot } from '@/services/navigation';

const ROUTE_RECALC_MIN_DISTANCE_METERS = 15;
const ROUTE_RECALC_MIN_INTERVAL_MS = 5000;
const ROUTE_UPDATE_DEBOUNCE_MS = 400;
const GPS_SIGNAL_TIMEOUT_MS = 20000;
const ROUTE_UPDATE_BACKOFF_MS = [5000, 10000, 20000] as const;
const DEVIATION_NOTICE_COOLDOWN_MS = 30000;
const TRACKING_ERROR_NOTICE_COOLDOWN_MS = 15000;
const WEATHER_CHECK_MIN_MOVEMENT_METERS = 150;
const WEATHER_CHECK_MIN_INTERVAL_MS = 60000;

type TrackingMode = 'passive' | 'navigation' | 'sos';

interface StartTrackingOptions {
    notifyContacts?: boolean;
}

interface NearbySafetyPlace {
    name: string;
    address: string;
    distanceMeters: number;
    location: google.maps.LatLngLiteral;
    placeId?: string;
    formattedPhoneNumber?: string;
}

const getDistanceMeters = (
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral
): number => {
    if (window.google?.maps?.geometry?.spherical) {
        return window.google.maps.geometry.spherical.computeDistanceBetween(
            new window.google.maps.LatLng(from),
            new window.google.maps.LatLng(to)
        );
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
};

const extractRouteMetrics = (directions: google.maps.DirectionsResult) => {
    const route = directions.routes?.[0];
    const leg = route?.legs?.[0];

    if (!route || !leg) return null;

    return {
        summary: route.summary || '',
        distanceMeters: leg.distance?.value || 0,
        durationSeconds: leg.duration?.value || 0,
        endLocation: {
            lat: leg.end_location?.lat?.() || 0,
            lng: leg.end_location?.lng?.() || 0,
        },
    };
};

const isNearlyIdenticalRoute = (
    prevDirections: google.maps.DirectionsResult,
    nextDirections: google.maps.DirectionsResult
) => {
    const prev = extractRouteMetrics(prevDirections);
    const next = extractRouteMetrics(nextDirections);

    if (!prev || !next) return false;

    const sameSummary = prev.summary === next.summary;
    const distanceDiff = Math.abs(prev.distanceMeters - next.distanceMeters);
    const durationDiff = Math.abs(prev.durationSeconds - next.durationSeconds);
    const destinationDrift = getDistanceMeters(prev.endLocation, next.endLocation);

    return sameSummary && distanceDiff < 40 && durationDiff < 20 && destinationDrift < 15;
};

const getLatLngLiteral = (location: google.maps.LatLng): google.maps.LatLngLiteral => ({
    lat: location.lat(),
    lng: location.lng(),
});

export const useLiveTracking = (
    routeResult: any,
    fromLocation: string,
    toLocation: string,
    notifyTrustedContacts?: (msg: string) => void,
    handleCheckRoute?: () => void,
    map?: google.maps.Map | null
) => {
    const [isTracking, setIsTracking] = useState(false);
    const [userLiveLocation, setUserLiveLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [liveDirectionsResponse, setLiveDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const [isGpsSignalLost, setIsGpsSignalLost] = useState(false);
    const [isRouteUpdatesPaused, setIsRouteUpdatesPaused] = useState(false);
    const [nearestHospital, setNearestHospital] = useState<NearbySafetyPlace | null>(null);
    const [nearestPoliceStation, setNearestPoliceStation] = useState<NearbySafetyPlace | null>(null);
    const [userBearing, setUserBearing] = useState<number>(0);
    const [currentWeather, setCurrentWeather] = useState<WeatherSnapshot | null>(null);
    const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
    const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<string | null>(null);
    const [weatherStatus, setWeatherStatus] = useState<string>('idle');
    const [weatherReason, setWeatherReason] = useState<string | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const lastApiCallRef = useRef<number>(0);
    const lastRouteOriginRef = useRef<google.maps.LatLngLiteral | null>(null);
    const lastLocationRef = useRef<google.maps.LatLngLiteral | null>(null);
    const lastRouteCallAtRef = useRef<number>(0);
    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
    const routeUpdateDebounceRef = useRef<number | null>(null);
    const nearbySearchDebounceRef = useRef<number | null>(null);
    const gpsSignalTimeoutRef = useRef<number | null>(null);
    const trackingModeRef = useRef<TrackingMode>('navigation');
    const routeUpdateFailureCountRef = useRef(0);
    const routeUpdateNextAttemptAtRef = useRef(0);
    const lastNearbySearchOriginRef = useRef<google.maps.LatLngLiteral | null>(null);
    const lastNearbySearchCallAtRef = useRef<number>(0);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const placePhoneCacheRef = useRef<Map<string, string | null>>(new Map());
    const nearbySearchRequestIdRef = useRef(0);
    const lastDeviationNoticeAtRef = useRef(0);
    const trackRequestAbortControllerRef = useRef<AbortController | null>(null);
    const isTrackRequestInFlightRef = useRef(false);
    const isTrackingActiveRef = useRef(false);
    const isMountedRef = useRef(true);
    const lastTrackingErrorNoticeAtRef = useRef(0);
    const isWeatherRequestInFlightRef = useRef(false);
    const lastWeatherLocationRef = useRef<google.maps.LatLngLiteral | null>(null);
    const lastWeatherCheckAtRef = useRef(0);
    const lastWeatherAlertSignatureRef = useRef('');
    const lastWeatherSeverityRef = useRef('none');

    const clearGpsSignalTimeout = () => {
        if (gpsSignalTimeoutRef.current !== null) {
            window.clearTimeout(gpsSignalTimeoutRef.current);
            gpsSignalTimeoutRef.current = null;
        }
    };

    const armGpsSignalTimeout = () => {
        clearGpsSignalTimeout();
        gpsSignalTimeoutRef.current = window.setTimeout(() => {
            setIsGpsSignalLost(true);
            setTrackingError('GPS signal seems weak. Waiting for location updates...');
        }, GPS_SIGNAL_TIMEOUT_MS);
    };

    const clearRouteDebounce = () => {
        if (routeUpdateDebounceRef.current !== null) {
            window.clearTimeout(routeUpdateDebounceRef.current);
            routeUpdateDebounceRef.current = null;
        }
    };

    const clearNearbySearchDebounce = () => {
        if (nearbySearchDebounceRef.current !== null) {
            window.clearTimeout(nearbySearchDebounceRef.current);
            nearbySearchDebounceRef.current = null;
        }
    };

    const abortTrackRequest = () => {
        if (trackRequestAbortControllerRef.current) {
            trackRequestAbortControllerRef.current.abort();
            trackRequestAbortControllerRef.current = null;
        }
        isTrackRequestInFlightRef.current = false;
    };

    const getPlacesService = () => {
        if (!window.google?.maps?.places?.PlacesService) return null;

        if (!placesServiceRef.current) {
            placesServiceRef.current = map
                ? new window.google.maps.places.PlacesService(map)
                : new window.google.maps.places.PlacesService(document.createElement('div'));
        }

        return placesServiceRef.current;
    };

    const findClosestPlace = async (
        currentLocation: google.maps.LatLngLiteral,
        placeType: 'hospital' | 'police'
    ): Promise<NearbySafetyPlace | null> => {
        const placesService = getPlacesService();
        if (!placesService) return null;

        const getPlacePhoneNumber = async (placeId?: string) => {
            if (!placeId) return null;

            const cachedPhone = placePhoneCacheRef.current.get(placeId);
            if (cachedPhone !== undefined) {
                return cachedPhone;
            }

            const detailsService = getPlacesService();
            if (!detailsService) return null;

            return new Promise<string | null>((resolve) => {
                const request: google.maps.places.PlaceDetailsRequest = {
                    placeId,
                    fields: ['formatted_phone_number', 'international_phone_number'],
                };

                detailsService.getDetails(request, (place, status) => {
                    if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
                        placePhoneCacheRef.current.set(placeId, null);
                        resolve(null);
                        return;
                    }

                    const phone = place.formatted_phone_number || place.international_phone_number || null;
                    placePhoneCacheRef.current.set(placeId, phone);
                    resolve(phone);
                });
            });
        };

        return new Promise((resolve) => {
            const request: google.maps.places.PlaceSearchRequest = {
                location: currentLocation,
                radius: 3000,
                type: placeType,
            };

            placesService.nearbySearch(request, async (results, status) => {
                if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results || results.length === 0) {
                    resolve(null);
                    return;
                }

                const withDistance = results
                    .filter((result) => result.geometry?.location)
                    .map((result) => {
                        const resultLocation = getLatLngLiteral(result.geometry!.location as google.maps.LatLng);
                        return {
                            result,
                            distanceMeters: getDistanceMeters(currentLocation, resultLocation),
                            location: resultLocation,
                        };
                    })
                    .sort((a, b) => a.distanceMeters - b.distanceMeters);

                const closest = withDistance[0];
                if (!closest) {
                    resolve(null);
                    return;
                }

                const formattedPhoneNumber = await getPlacePhoneNumber(closest.result.place_id);

                resolve({
                    name: closest.result.name || `Nearest ${placeType}`,
                    address: closest.result.vicinity || closest.result.formatted_address || 'Nearby',
                    distanceMeters: closest.distanceMeters,
                    location: closest.location,
                    placeId: closest.result.place_id,
                    formattedPhoneNumber: formattedPhoneNumber || undefined,
                });
            });
        });
    };

    const updateNearestSafetyPlaces = async (currentLocation: google.maps.LatLngLiteral) => {
        if (!navigator.onLine || !window.google?.maps?.places) return;

        const now = Date.now();
        const lastNearbyLocation = lastNearbySearchOriginRef.current;
        const movedEnough =
            !lastNearbyLocation ||
            getDistanceMeters(lastNearbyLocation, currentLocation) >= ROUTE_RECALC_MIN_DISTANCE_METERS;

        const cooldownPassed = now - lastNearbySearchCallAtRef.current >= ROUTE_RECALC_MIN_INTERVAL_MS;

        if (!movedEnough || !cooldownPassed) return;

        lastNearbySearchOriginRef.current = currentLocation;
        lastNearbySearchCallAtRef.current = now;

        const requestId = ++nearbySearchRequestIdRef.current;

        try {
            const [hospital, police] = await Promise.all([
                findClosestPlace(currentLocation, 'hospital'),
                findClosestPlace(currentLocation, 'police'),
            ]);

            if (requestId !== nearbySearchRequestIdRef.current) return;

            setNearestHospital(hospital);
            setNearestPoliceStation(police);
        } catch (error) {
            console.error('Nearby safety places lookup failed:', error);
        }
    };

    const canCallDirectionsApi = () => {
        if (!navigator.onLine) {
            setIsRouteUpdatesPaused(true);
            const now = Date.now();
            routeUpdateFailureCountRef.current += 1;
            const backoffIndex = Math.min(routeUpdateFailureCountRef.current - 1, ROUTE_UPDATE_BACKOFF_MS.length - 1);
            const backoffMs = ROUTE_UPDATE_BACKOFF_MS[backoffIndex];
            routeUpdateNextAttemptAtRef.current = now + backoffMs;
            setTrackingError(`Network unavailable. Live route updates are paused. Retrying in ${Math.ceil(backoffMs / 1000)}s.`);
            return false;
        }

        setIsRouteUpdatesPaused(false);
        return true;
    };

    const shouldCheckWeather = (currentLocation: google.maps.LatLngLiteral) => {
        const now = Date.now();
        const lastLocation = lastWeatherLocationRef.current;
        const hasMovedEnough = !lastLocation || getDistanceMeters(lastLocation, currentLocation) >= WEATHER_CHECK_MIN_MOVEMENT_METERS;
        const intervalElapsed = now - lastWeatherCheckAtRef.current >= WEATHER_CHECK_MIN_INTERVAL_MS;

        return hasMovedEnough || intervalElapsed;
    };

    const rankSeverity = (severity: string) => {
        switch (severity) {
            case 'extreme':
                return 4;
            case 'severe':
                return 3;
            case 'moderate':
                return 2;
            case 'low':
                return 1;
            case 'none':
            default:
                return 0;
        }
    };

    const updateWeatherState = async (latitude: number, longitude: number, routePolyline?: string) => {
        if (!navigator.onLine || isWeatherRequestInFlightRef.current) {
            return;
        }

        const location = { lat: latitude, lng: longitude };
        if (!shouldCheckWeather(location)) {
            return;
        }

        isWeatherRequestInFlightRef.current = true;

        try {
            const weatherResponse = await getWeatherAlerts(latitude, longitude, routePolyline);

            if (!isTrackingActiveRef.current || !isMountedRef.current) {
                return;
            }

            lastWeatherLocationRef.current = location;
            lastWeatherCheckAtRef.current = Date.now();
            setWeatherStatus(weatherResponse.status || 'ok');
            setWeatherReason(weatherResponse.reason || null);
            setCurrentWeather(weatherResponse.current || null);
            setWeatherUpdatedAt(weatherResponse.updatedAt || new Date().toISOString());

            const nextAlerts = Array.isArray(weatherResponse.alerts) ? weatherResponse.alerts : [];
            const nextSignature = JSON.stringify(nextAlerts.map((alert) => `${alert.type}:${alert.severity}`));
            const nextSeverity = weatherResponse.highestSeverity || 'none';
            const shouldUpdateAlerts =
                nextSignature !== lastWeatherAlertSignatureRef.current ||
                rankSeverity(nextSeverity) > rankSeverity(lastWeatherSeverityRef.current);

            if (shouldUpdateAlerts) {
                setWeatherAlerts(nextAlerts);
                lastWeatherAlertSignatureRef.current = nextSignature;
                lastWeatherSeverityRef.current = nextSeverity;
            }
        } catch (error) {
            console.error('Weather check failed:', error);
            setWeatherStatus('error');
        } finally {
            isWeatherRequestInFlightRef.current = false;
        }
    };

    const resetRouteUpdateBackoff = () => {
        routeUpdateFailureCountRef.current = 0;
        routeUpdateNextAttemptAtRef.current = 0;
    };

    const registerRouteUpdateFailure = () => {
        const now = Date.now();
        routeUpdateFailureCountRef.current += 1;
        const backoffIndex = Math.min(routeUpdateFailureCountRef.current - 1, ROUTE_UPDATE_BACKOFF_MS.length - 1);
        const backoffMs = ROUTE_UPDATE_BACKOFF_MS[backoffIndex];
        routeUpdateNextAttemptAtRef.current = now + backoffMs;
        return backoffMs;
    };

    const updateLiveRoute = async (origin: google.maps.LatLngLiteral) => {
        if (!window.google || !toLocation || !canCallDirectionsApi()) return;

        if (!directionsServiceRef.current) {
            directionsServiceRef.current = new window.google.maps.DirectionsService();
        }

        try {
            const now = Date.now();
            if (now < routeUpdateNextAttemptAtRef.current) {
                return;
            }

            if (now - lastRouteCallAtRef.current < ROUTE_RECALC_MIN_INTERVAL_MS) {
                return;
            }

            lastRouteCallAtRef.current = now;
            const response = await directionsServiceRef.current.route({
                origin,
                destination: toLocation,
                travelMode: window.google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: false,
            });

            setLiveDirectionsResponse((previous) => {
                if (previous && isNearlyIdenticalRoute(previous, response)) {
                    return previous;
                }
                return response;
            });
            resetRouteUpdateBackoff();
            setIsRouteUpdatesPaused(false);
            setTrackingError(null);
        } catch (error) {
            const backoffMs = registerRouteUpdateFailure();
            setIsRouteUpdatesPaused(true);
            setTrackingError(`Unable to refresh live route right now. Retrying in ${Math.ceil(backoffMs / 1000)}s.`);
            console.error('Live route update failed:', error);
        }
    };

    const scheduleRouteUpdate = (origin: google.maps.LatLngLiteral) => {
        clearRouteDebounce();
        routeUpdateDebounceRef.current = window.setTimeout(() => {
            updateLiveRoute(origin);
        }, ROUTE_UPDATE_DEBOUNCE_MS);
    };

    const scheduleNearbySafetyPlacesUpdate = (origin: google.maps.LatLngLiteral) => {
        clearNearbySearchDebounce();
        nearbySearchDebounceRef.current = window.setTimeout(() => {
            updateNearestSafetyPlaces(origin);
        }, ROUTE_UPDATE_DEBOUNCE_MS);
    };

    const startTracking = (
        mode: TrackingMode = 'navigation',
        options: StartTrackingOptions = {}
    ) => {
        const shouldNotifyContacts = options.notifyContacts !== false;

        if (!routeResult?.overview_polyline) {
            setTrackingError('Please analyze a route first before starting live tracking.');
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        abortTrackRequest();
        setIsTracking(true);
        setLiveDirectionsResponse(null);
        setTrackingError(null);
        setIsGpsSignalLost(false);
        setIsRouteUpdatesPaused(false);
        isTrackingActiveRef.current = true;
        lastApiCallRef.current = 0;
        lastRouteOriginRef.current = null;
        lastRouteCallAtRef.current = 0;
        lastNearbySearchOriginRef.current = null;
        lastNearbySearchCallAtRef.current = 0;
        setNearestHospital(null);
        setNearestPoliceStation(null);
        setCurrentWeather(null);
        setWeatherAlerts([]);
        setWeatherUpdatedAt(null);
        setWeatherStatus('idle');
        setWeatherReason(null);
        resetRouteUpdateBackoff();
        lastDeviationNoticeAtRef.current = 0;
        lastWeatherCheckAtRef.current = 0;
        lastWeatherLocationRef.current = null;
        lastWeatherAlertSignatureRef.current = '';
        lastWeatherSeverityRef.current = 'none';
        trackingModeRef.current = mode;
        armGpsSignalTimeout();

        // Backend SOS now handles emergency notifications. Keep tracking silent here.

        if (navigator.geolocation) {
            const id = navigator.geolocation.watchPosition(
                async (position) => {
                    if (!isTrackingActiveRef.current || !isMountedRef.current) {
                        return;
                    }

                    const { latitude, longitude, heading } = position.coords;
                    const currentLocation = { lat: latitude, lng: longitude };

                    // Calculate bearing if heading is not provided by device
                    let currentBearing = heading || 0;
                    if (heading === null && lastLocationRef.current && window.google) {
                        try {
                           currentBearing = window.google.maps.geometry.spherical.computeHeading(
                                lastLocationRef.current,
                                currentLocation
                            );
                        } catch (e) {
                             currentBearing = userBearing;
                        }
                    }

                    // Instant UI Update
                    setUserLiveLocation(currentLocation);
                    if (currentBearing !== null && !isNaN(currentBearing)) {
                         setUserBearing(currentBearing);
                    }
                    lastLocationRef.current = currentLocation;
                    map?.panTo(currentLocation);
                    setIsGpsSignalLost(false);
                    armGpsSignalTimeout();

                    const lastRouteOrigin = lastRouteOriginRef.current;
                    const shouldUpdateRoute =
                        !lastRouteOrigin ||
                        getDistanceMeters(lastRouteOrigin, currentLocation) >= ROUTE_RECALC_MIN_DISTANCE_METERS;

                    if (shouldUpdateRoute) {
                        lastRouteOriginRef.current = currentLocation;
                        scheduleRouteUpdate(currentLocation);
                        scheduleNearbySafetyPlacesUpdate(currentLocation);
                    }

                    // Throttled Backend Call (every 5 seconds)
                    const now = Date.now();
                    if (now - lastApiCallRef.current > 5000) {
                        if (!navigator.onLine) {
                            setIsRouteUpdatesPaused(true);
                            setTrackingError('You are offline. Some live safety checks are paused.');
                            return;
                        }

                        if (isTrackRequestInFlightRef.current) {
                            return;
                        }

                        lastApiCallRef.current = now;
                        const controller = new AbortController();
                        trackRequestAbortControllerRef.current = controller;
                        isTrackRequestInFlightRef.current = true;

                        try {
                            const response = await fetch(buildNavigationApiUrl('/track'), {
                                method: 'POST',
                                headers: await getAuthHeaders({
                                    'Content-Type': 'application/json'
                                }),
                                signal: controller.signal,
                                body: JSON.stringify({
                                    currentLat: latitude,
                                    currentLng: longitude,
                                    routePolyline: typeof routeResult.overview_polyline === 'string' ? routeResult.overview_polyline : routeResult?.overview_polyline?.points
                                })
                            });

                            if (!response.ok) {
                                throw new Error(`Track endpoint failed with status ${response.status}`);
                            }

                            const data = await response.json().catch(() => ({}));

                            if (!isTrackingActiveRef.current || !isMountedRef.current) {
                                return;
                            }

                            setTrackingError(null);

                            if (data?.needsReroute) {
                                console.warn('Reroute needed:', data.distanceFromRoute);

                                const deviationMeters = Math.max(0, Math.round(Number(data.distanceFromRoute) || 0));
                                const noticeDue = now - lastDeviationNoticeAtRef.current >= DEVIATION_NOTICE_COOLDOWN_MS;

                                if (noticeDue) {
                                    lastDeviationNoticeAtRef.current = now;
                                    toast({
                                        title: 'Route deviation detected',
                                        description: deviationMeters > 0
                                            ? `You are ${deviationMeters}m away from the safer route. Recalculating now.`
                                            : 'You are away from the safer route. Recalculating now.'
                                    });
                                }

                                scheduleRouteUpdate(currentLocation);
                            }

                            const routePolyline = typeof routeResult.overview_polyline === 'string'
                                ? routeResult.overview_polyline
                                : routeResult?.overview_polyline?.points;

                            await updateWeatherState(latitude, longitude, routePolyline);
                        } catch (error) {
                            if ((error as Error)?.name === 'AbortError') {
                                return;
                            }

                            const nowError = Date.now();
                            if (nowError - lastTrackingErrorNoticeAtRef.current >= TRACKING_ERROR_NOTICE_COOLDOWN_MS) {
                                lastTrackingErrorNoticeAtRef.current = nowError;
                                setTrackingError('Live safety checks are delayed. Retrying automatically.');
                            }
                            console.error('Tracking error:', error);
                        } finally {
                            if (trackRequestAbortControllerRef.current === controller) {
                                trackRequestAbortControllerRef.current = null;
                            }
                            isTrackRequestInFlightRef.current = false;
                        }
                    }
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        setTrackingError('Location permission denied. Enable location access to use live tracking.');
                        stopTracking();
                        return;
                    }

                    if (error.code === error.POSITION_UNAVAILABLE) {
                        setIsGpsSignalLost(true);
                        setTrackingError('Unable to fetch GPS signal. Move to an open area and try again.');
                        return;
                    }

                    if (error.code === error.TIMEOUT) {
                        setIsGpsSignalLost(true);
                        setTrackingError('Location update timed out. Retrying automatically.');
                        return;
                    }

                    setTrackingError('An unexpected location error occurred.');
                    console.error("Tracking location error:", error);
                },
                {
                    enableHighAccuracy: trackingModeRef.current !== 'passive',
                    timeout: 20000,
                    maximumAge: trackingModeRef.current === 'passive' ? 15000 : 5000
                }
            );
            watchIdRef.current = id;
        } else {
            setTrackingError('Geolocation is not supported by this browser.');
        }
    };

    const stopTracking = () => {
        isTrackingActiveRef.current = false;
        setIsTracking(false);
        setUserLiveLocation(null);
        setLiveDirectionsResponse(null);
        setIsGpsSignalLost(false);
        setIsRouteUpdatesPaused(false);
        lastApiCallRef.current = 0;
        lastRouteOriginRef.current = null;
        lastRouteCallAtRef.current = 0;
        lastNearbySearchOriginRef.current = null;
        lastNearbySearchCallAtRef.current = 0;
        setNearestHospital(null);
        setNearestPoliceStation(null);
        setCurrentWeather(null);
        setWeatherAlerts([]);
        setWeatherUpdatedAt(null);
        setWeatherStatus('idle');
        setWeatherReason(null);
        resetRouteUpdateBackoff();
        lastDeviationNoticeAtRef.current = 0;
        lastWeatherCheckAtRef.current = 0;
        lastWeatherLocationRef.current = null;
        lastWeatherAlertSignatureRef.current = '';
        lastWeatherSeverityRef.current = 'none';
        abortTrackRequest();
        clearGpsSignalTimeout();
        clearRouteDebounce();
        clearNearbySearchDebounce();
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    useEffect(() => {
        const handleOffline = () => {
            if (!isTracking) return;
            setIsRouteUpdatesPaused(true);
            setTrackingError('You are offline. Live route updates are paused.');
            abortTrackRequest();
        };

        const handleOnline = () => {
            if (!isTracking) return;
            setIsRouteUpdatesPaused(false);
            resetRouteUpdateBackoff();
            setTrackingError(null);
            if (lastLocationRef.current) {
                scheduleRouteUpdate(lastLocationRef.current);
                scheduleNearbySafetyPlacesUpdate(lastLocationRef.current);
            }
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [isTracking]);

    // Cleanup tracking on unmount
    useEffect(() => {
        return () => {
            isTrackingActiveRef.current = false;
            isMountedRef.current = false;
            abortTrackRequest();
            clearGpsSignalTimeout();
            clearRouteDebounce();
            clearNearbySearchDebounce();
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        isTracking,
        userLiveLocation,
        liveDirectionsResponse,
        trackingError,
        isGpsSignalLost,
        isRouteUpdatesPaused,
        nearestHospital,
        nearestPoliceStation,
        currentWeather,
        weatherAlerts,
        weatherUpdatedAt,
        weatherStatus,
        weatherReason,
        userBearing,
        startTracking,
        stopTracking
    };
};
