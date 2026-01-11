import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { analyzeRouteSafety, getIncidentDetails, IncidentDetail } from '@/services/navigation';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];

export const useRouteSafety = () => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [routeResult, setRouteResult] = useState<any>(null);
    const [allRoutes, setAllRoutes] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [directionsResponse, setDirectionsResponse] = useState<any>(null);

    const [policeStations, setPoliceStations] = useState<google.maps.places.PlaceResult[]>([]);
    const [hospitals, setHospitals] = useState<google.maps.places.PlaceResult[]>([]);

    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Initialize PlacesService
    useEffect(() => {
        if (map && !placesServiceRef.current && window.google) {
            placesServiceRef.current = new window.google.maps.places.PlacesService(map);
        }
    }, [map]);

    const handleCheckRoute = async (fromLocation: string, toLocation: string) => {
        if (!fromLocation || !toLocation || !isLoaded || !window.google) return;

        setIsAnalyzing(true);
        setError('');
        setShowResults(false);
        setDirectionsResponse(null);

        try {
            // 1. Get Google Maps Directions first
            const directionsService = new window.google.maps.DirectionsService();
            const googleResults = await directionsService.route({
                origin: fromLocation,
                destination: toLocation,
                travelMode: window.google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
            });
            setDirectionsResponse(googleResults);

            // 2. Get Safety Data from Backend
            const safetyData = await analyzeRouteSafety(fromLocation, toLocation);

            // 3. Merge datasets
            if (googleResults.routes && googleResults.routes.length > 0) {

                // Collect all incident IDs
                let allIncidentIds: number[] = [];
                if (safetyData.routes) {
                    safetyData.routes.forEach((r: any) => {
                        if (r.incident_ids && Array.isArray(r.incident_ids)) {
                            allIncidentIds = [...allIncidentIds, ...r.incident_ids];
                        }
                    });
                }

                // Fetch details
                let incidentDetailsMap: Record<string, IncidentDetail> = {};
                if (allIncidentIds.length > 0) {
                    try {
                        const uniqueIds = [...new Set(allIncidentIds)];
                        const details = await getIncidentDetails(uniqueIds);
                        details.forEach(d => {
                            incidentDetailsMap[d.id] = d;
                        });
                    } catch (e) {
                        console.warn("Failed to fetch incident details", e);
                    }
                }

                // Fetch Real Emergency Services near Destination
                let emergencyData: any = {
                    police: { name: "Local Police", address: "Nearby", formatted_phone_number: "100" },
                    hospital: { name: "City Hospital", address: "Nearby", formatted_phone_number: "108" }
                };

                try {
                    const route = googleResults.routes[0];
                    const legs = route.legs;
                    if (legs && legs.length > 0) {
                        const destLoc = legs[legs.length - 1].end_location;
                        const fetchPlace = (type: string, keyword: string) => {
                            // Need a temporary service if map isn't ready? 
                            // Actually utilize the existing map or create a service on a dummy node if needed.
                            // But we have placesServiceRef if map is loaded.
                            // However, for this specific logic we can use a temp div service as in original code.
                            return new Promise((resolve) => {
                                const service = new window.google.maps.places.PlacesService(document.createElement('div'));
                                const request = {
                                    location: destLoc,
                                    radius: 3000,
                                    type: type,
                                    keyword: keyword
                                };
                                service.nearbySearch(request, (results, status) => {
                                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                                        resolve(results[0]);
                                    } else {
                                        resolve(null);
                                    }
                                });
                            });
                        };

                        const [policePlace, hospitalPlace]: any = await Promise.all([
                            fetchPlace('police', 'police station'),
                            fetchPlace('hospital', 'hospital')
                        ]);

                        if (policePlace) {
                            emergencyData.police = {
                                name: policePlace.name,
                                address: policePlace.vicinity || policePlace.formatted_address,
                                formatted_phone_number: "100"
                            };
                        }
                        if (hospitalPlace) {
                            emergencyData.hospital = {
                                name: hospitalPlace.name,
                                address: hospitalPlace.vicinity || hospitalPlace.formatted_address,
                                formatted_phone_number: "108"
                            };
                        }
                    }
                } catch (e) { console.error("Error fetching emergency places", e); }

                const mergedRoutes = googleResults.routes.map((gRoute: any, index: number) => {
                    const sRoute: any = (safetyData.routes && safetyData.routes[index])
                        ? safetyData.routes[index]
                        : { safety_score: 70, risk_level: 'Moderate', incident_count: 0, incident_ids: [] };

                    const routeIncidents = (sRoute.incident_ids || []).map((id: number) => incidentDetailsMap[id]).filter(Boolean);

                    return {
                        ...gRoute,
                        ...sRoute,
                        safety_score: sRoute.safety_score || 70,
                        safetyScore: sRoute.safety_score || 70,
                        summary: gRoute.summary,
                        aiCrimeAnalysis: {
                            incidents: routeIncidents,
                            derived_risk_summary: {
                                primary_risk_factors: [sRoute.risk_level || "General Caution"]
                            }
                        },
                        emergencySupport: emergencyData
                    };
                });

                setAllRoutes(mergedRoutes);
                const safelyNamed = mergedRoutes.find((r: any) => r.route_name === safetyData.safest_route);
                setRouteResult(safelyNamed || mergedRoutes[0]);
                setShowResults(true);
            } else {
                setError('No routes found by Google Maps.');
            }
        } catch (e) {
            console.error("Route analysis error:", e);
            setError('Failed to analyze route safety. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Fetch police stations along route
    useEffect(() => {
        if (map && routeResult && window.google) {
            const fetchServices = async () => {
                if (!placesServiceRef.current) return;

                // Get path points
                let path: google.maps.LatLng[] = [];
                if (routeResult.overview_path) {
                    path = routeResult.overview_path;
                } else if (routeResult.overview_polyline) {
                    path = typeof routeResult.overview_polyline === 'string'
                        ? window.google.maps.geometry.encoding.decodePath(routeResult.overview_polyline)
                        : window.google.maps.geometry.encoding.decodePath(routeResult.overview_polyline.points);
                }

                if (path.length === 0) return;

                const samplePoints: google.maps.LatLng[] = [];
                const SAMPLE_DISTANCE_METERS = 5000;
                let distanceAccumulator = 0;
                if (path.length > 0) samplePoints.push(path[0]);

                for (let i = 0; i < path.length - 1; i++) {
                    const p1 = path[i];
                    const p2 = path[i + 1];
                    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
                    distanceAccumulator += distance;
                    if (distanceAccumulator >= SAMPLE_DISTANCE_METERS) {
                        samplePoints.push(p2);
                        distanceAccumulator = 0;
                    }
                }
                if (path.length > 1 && distanceAccumulator > 1000) samplePoints.push(path[path.length - 1]);

                const limitedSamplePoints = samplePoints.length > 15
                    ? samplePoints.filter((_, index) => index % Math.ceil(samplePoints.length / 15) === 0)
                    : samplePoints;

                const uniquePolice = new Map<string, google.maps.places.PlaceResult>();

                const searchAtPoint = (location: google.maps.LatLng, type: string): Promise<google.maps.places.PlaceResult[]> => {
                    return new Promise((resolve) => {
                        const request: google.maps.places.PlaceSearchRequest = {
                            location: location,
                            radius: 5000,
                            type: type
                        };
                        placesServiceRef.current?.nearbySearch(request, (results, status) => {
                            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                                resolve(results);
                            } else {
                                resolve([]);
                            }
                        });
                    });
                };

                for (const point of limitedSamplePoints) {
                    try {
                        const policeResults = await searchAtPoint(point, 'police');
                        policeResults.forEach(p => {
                            if (p.place_id && !uniquePolice.has(p.place_id)) uniquePolice.set(p.place_id, p);
                        });
                    } catch (e) { console.error(e); }
                    await new Promise(r => setTimeout(r, 200));
                }
                setPoliceStations(Array.from(uniquePolice.values()));
            };
            fetchServices();
        } else if (!routeResult) {
            setPoliceStations([]);
            setHospitals([]);
        }
    }, [map, routeResult]);

    return {
        isLoaded,
        map,
        onLoad,
        onUnmount,
        routeResult,
        setRouteResult,
        allRoutes,
        directionsResponse,
        policeStations,
        hospitals,
        isAnalyzing,
        showResults,
        setShowResults,
        error,
        setError,
        handleCheckRoute
    };
};
