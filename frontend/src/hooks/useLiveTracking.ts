import { useState, useRef, useEffect } from 'react';

import { API_BASE_URL, API_KEY } from '../config';

const ROUTE_RECALC_MIN_DISTANCE_METERS = 15;
const ROUTE_RECALC_MIN_INTERVAL_MS = 5000;
const ROUTE_UPDATE_DEBOUNCE_MS = 400;
const GPS_SIGNAL_TIMEOUT_MS = 20000;
const ROUTE_UPDATE_BACKOFF_MS = [5000, 10000, 20000] as const;

type TrackingMode = 'passive' | 'navigation' | 'sos';

interface NearbySafetyPlace {
    name: string;
    address: string;
    distanceMeters: number;
    location: google.maps.LatLngLiteral;
    placeId?: string;
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

    const watchIdRef = useRef<number | null>(null);
    const lastApiCallRef = useRef<number>(0);
    const lastRouteOriginRef = useRef<google.maps.LatLngLiteral | null>(null);
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
    const nearbySearchRequestIdRef = useRef(0);

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

        return new Promise((resolve) => {
            const request: google.maps.places.PlaceSearchRequest = {
                location: currentLocation,
                radius: 3000,
                type: placeType,
            };

            placesService.nearbySearch(request, (results, status) => {
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

                resolve({
                    name: closest.result.name || `Nearest ${placeType}`,
                    address: closest.result.vicinity || closest.result.formatted_address || 'Nearby',
                    distanceMeters: closest.distanceMeters,
                    location: closest.location,
                    placeId: closest.result.place_id,
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

    const startTracking = (mode: TrackingMode = 'navigation') => {
        if (!routeResult?.overview_polyline) return;
        setIsTracking(true);
        setLiveDirectionsResponse(null);
        setTrackingError(null);
        setIsGpsSignalLost(false);
        setIsRouteUpdatesPaused(false);
        lastRouteOriginRef.current = null;
        lastRouteCallAtRef.current = 0;
        lastNearbySearchOriginRef.current = null;
        lastNearbySearchCallAtRef.current = 0;
        setNearestHospital(null);
        setNearestPoliceStation(null);
        resetRouteUpdateBackoff();
        trackingModeRef.current = mode;
        armGpsSignalTimeout();

        // Notify contacts that tracking started
        if (notifyTrustedContacts) {
            notifyTrustedContacts(`🛡️ I've started a journey on Raksha.\nRoute: ${fromLocation} to ${toLocation}.\nTrack my safety status here: ${window.location.href}`);
        }

        if (navigator.geolocation) {
            const id = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const currentLocation = { lat: latitude, lng: longitude };

                    // Instant UI Update
                    setUserLiveLocation(currentLocation);
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
                            setTrackingError('You are offline. Some live safety checks are paused.');
                            return;
                        }

                        lastApiCallRef.current = now;

                        try {
                            const response = await fetch(`${API_BASE_URL}/track`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-api-key': API_KEY
                                },
                                body: JSON.stringify({
                                    currentLat: latitude,
                                    currentLng: longitude,
                                    routePolyline: typeof routeResult.overview_polyline === 'string' ? routeResult.overview_polyline : routeResult?.overview_polyline?.points
                                })
                            });

                            const data = await response.json();

                            if (data.needsReroute) {
                                // Optional: Notify user subtly or via toast instead of blocking alert
                                console.warn('Reroute needed:', data.distanceFromRoute);

                                const shouldReroute = confirm(`⚠️ You've deviated ${Math.round(data.distanceFromRoute)}m from the safe route.\n\nWould you like to recalculate?`);
                                if (shouldReroute && handleCheckRoute) {
                                    stopTracking();
                                    handleCheckRoute();
                                }
                            }
                        } catch (error) {
                            console.error('Tracking error:', error);
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
        setIsTracking(false);
        setUserLiveLocation(null);
        setLiveDirectionsResponse(null);
        setIsGpsSignalLost(false);
        setIsRouteUpdatesPaused(false);
        lastRouteOriginRef.current = null;
        lastRouteCallAtRef.current = 0;
        lastNearbySearchOriginRef.current = null;
        lastNearbySearchCallAtRef.current = 0;
        setNearestHospital(null);
        setNearestPoliceStation(null);
        resetRouteUpdateBackoff();
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
        };

        const handleOnline = () => {
            if (!isTracking) return;
            setIsRouteUpdatesPaused(false);
            resetRouteUpdateBackoff();
            setTrackingError(null);
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
        startTracking,
        stopTracking
    };
};
