import { useState, useRef, useEffect } from 'react';

import { API_BASE_URL, API_KEY } from '../config';

export const useLiveTracking = (
    routeResult: any,
    fromLocation: string,
    toLocation: string,
    notifyTrustedContacts?: (msg: string) => void,
    handleCheckRoute?: () => void
) => {
    const [isTracking, setIsTracking] = useState(false);
    const [userLiveLocation, setUserLiveLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [userBearing, setUserBearing] = useState<number>(0);

    const watchIdRef = useRef<number | null>(null);
    const lastApiCallRef = useRef<number>(0);
    const lastLocationRef = useRef<google.maps.LatLngLiteral | null>(null);

    const startTracking = () => {
        if (!routeResult?.overview_polyline) return;
        setIsTracking(true);

        // Notify contacts that tracking started
        if (notifyTrustedContacts) {
            notifyTrustedContacts(`🛡️ I've started a journey on Raksha.\nRoute: ${fromLocation} to ${toLocation}.\nTrack my safety status here: ${window.location.href}`);
        }

        if (navigator.geolocation) {
            const id = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude, heading } = position.coords;
                    const newLocation = { lat: latitude, lng: longitude };

                    // Calculate bearing if heading is not provided by device
                    let currentBearing = heading || 0;
                    if (heading === null && lastLocationRef.current && window.google) {
                        try {
                           currentBearing = window.google.maps.geometry.spherical.computeHeading(
                                lastLocationRef.current,
                                newLocation
                            );
                        } catch (e) {
                             currentBearing = userBearing;
                        }
                    }

                    // Instant UI Update
                    setUserLiveLocation(newLocation);
                    if (currentBearing !== null && !isNaN(currentBearing)) {
                         setUserBearing(currentBearing);
                    }
                    lastLocationRef.current = newLocation;

                    // Throttled Backend Call (every 5 seconds)
                    const now = Date.now();
                    if (now - lastApiCallRef.current > 5000) {
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
                (error) => console.error("Tracking location error:", error),
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );
            watchIdRef.current = id;
        }
    };

    const stopTracking = () => {
        setIsTracking(false);
        setUserLiveLocation(null);
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    // Cleanup tracking on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return {
        isTracking,
        userLiveLocation,
        userBearing,
        startTracking,
        stopTracking
    };
};
