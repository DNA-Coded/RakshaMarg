import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker, InfoWindow } from '@react-google-maps/api';
import { Shield, AlertTriangle, Cross, Phone } from 'lucide-react';
import { Button } from './ui/button';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

interface SafetyMapProps {
    origin: string;
    destination: string;
    onMapLoad?: (map: google.maps.Map) => void;
    onRoutesFound?: (routes: google.maps.DirectionsRoute[]) => void;
    selectedRouteIndex?: number;
    showEmergency?: boolean;
    onEmergencyFound?: (type: 'hospital' | 'police', places: google.maps.places.PlaceResult[]) => void;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '1rem',
};

const defaultCenter = {
    lat: 28.6139, // New Delhi
    lng: 77.2090,
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
        },
        {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
        },
        {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
        },
        {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
        },
        {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
        },
    ],
};

const SafetyMap: React.FC<SafetyMapProps> = ({
    origin,
    destination,
    onMapLoad,
    onRoutesFound,
    selectedRouteIndex = 0,
    showEmergency = false,
    onEmergencyFound
}) => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '', // Need to ensure user sets this
        libraries: LIBRARIES
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
    const [hospitals, setHospitals] = useState<google.maps.places.PlaceResult[]>([]);
    const [policeStations, setPoliceStations] = useState<google.maps.places.PlaceResult[]>([]);
    const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);

    const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
        directionsServiceRef.current = new google.maps.DirectionsService();
        placesServiceRef.current = new google.maps.places.PlacesService(map);
        if (onMapLoad) onMapLoad(map);

        // Get current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(pos);
                    map.setCenter(pos);
                },
                () => {
                    console.log("Error fetching location");
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                }
            );
        }
    }, [onMapLoad]);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    useEffect(() => {
        if (isLoaded && map && origin && destination) {
            const fetchDirections = async () => {
                if (!directionsServiceRef.current) return;

                try {
                    const results = await directionsServiceRef.current.route({
                        origin: origin,
                        destination: destination,
                        travelMode: google.maps.TravelMode.DRIVING,
                        provideRouteAlternatives: true,
                    });

                    setDirectionsResponse(results);
                    if (onRoutesFound) {
                        onRoutesFound(results.routes);
                    }

                    // Generate safety data visualization if needed here
                } catch (error) {
                    console.error("Directions request failed", error);
                }
            };

            fetchDirections();
        }
    }, [isLoaded, map, origin, destination, onRoutesFound]);

    // Fetch Nearby Emergency Services
    useEffect(() => {
        if (isLoaded && map && showEmergency && userLocation) {
            const requestPlace = (type: string, setter: React.Dispatch<React.SetStateAction<google.maps.places.PlaceResult[]>>) => {
                if (!placesServiceRef.current) return;

                const request: google.maps.places.PlaceSearchRequest = {
                    location: userLocation,
                    radius: 2000, // 2km radius
                    type: type
                };

                placesServiceRef.current.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        const topPlaces = results.slice(0, 5);
                        setter(topPlaces);
                        if (onEmergencyFound) onEmergencyFound(type as 'hospital' | 'police', topPlaces);
                    }
                });
            };

            requestPlace('hospital', setHospitals);
            requestPlace('police', setPoliceStations);
        } else {
            setHospitals([]);
            setPoliceStations([]);
        }
    }, [isLoaded, map, showEmergency, userLocation, onEmergencyFound, origin, destination]);

    if (loadError) {
        return <div className="text-white p-4">Error loading maps. Please check API Key.</div>;
    }

    if (!isLoaded) {
        return <div className="text-white p-4">Loading Maps...</div>;
    }

    return (
        <div className='relative w-full h-full'>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={userLocation || defaultCenter}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    ...mapOptions,
                    disableDefaultUI: true,
                    zoomControl: false, // Cleaner look
                }}
            >
                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#4285F4",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                        }}
                        title="Your Location"
                    />
                )}

                {directionsResponse && (
                    <DirectionsRenderer
                        directions={directionsResponse}
                        routeIndex={selectedRouteIndex}
                        options={{
                            polylineOptions: {
                                strokeColor: "#2DD4BF", // Teal color matching brand
                                strokeWeight: 5,
                            },
                        }}
                    />
                )}

                {showEmergency && hospitals.map((place, idx) => (
                    place.geometry?.location && (
                        <Marker
                            key={`h-${idx}`}
                            position={place.geometry.location}
                            icon={{
                                url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                            }}
                            title={place.name}
                        />
                    )
                ))}

                {showEmergency && policeStations.map((place, idx) => (
                    place.geometry?.location && (
                        <Marker
                            key={`p-${idx}`}
                            position={place.geometry.location}
                            icon={{
                                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                            }}
                            title={place.name}
                        />
                    )
                ))}
            </GoogleMap>

            {/* Alert Overlay if needed */}
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-2 rounded text-center z-50">
                    Accessing Google Maps requires a valid API Key in .env file (VITE_GOOGLE_MAPS_API_KEY)
                </div>
            )}
        </div>
    );
};

export default SafetyMap;
