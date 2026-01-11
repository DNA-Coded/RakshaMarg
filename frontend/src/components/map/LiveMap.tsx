import React from 'react';
import { GoogleMap, DirectionsRenderer, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Navigation, Minimize2, Maximize2 } from 'lucide-react';

interface LiveMapProps {
    isLoaded: boolean;
    map: google.maps.Map | null;
    onLoad: (map: google.maps.Map) => void;
    onUnmount: (map: google.maps.Map) => void;
    directionsResponse: any;
    routeResult: any;
    showResults: boolean;
    policeStations: google.maps.places.PlaceResult[];
    hospitals: google.maps.places.PlaceResult[];
    selectedPlace: google.maps.places.PlaceResult | null;
    setSelectedPlace: (place: google.maps.places.PlaceResult | null) => void;
    isTracking: boolean;
    userLiveLocation: google.maps.LatLngLiteral | null;
    isFullScreen: boolean;
    setIsFullScreen: (isFull: boolean) => void;
}

const getRiskLabel = (score: number) => {
    if (score >= 80) return { label: 'LOW RISK', color: 'text-brand-teal', status: 'Safe Route' };
    if (score >= 50) return { label: 'MODERATE', color: 'text-yellow-500', status: 'Caution Advised' };
    return { label: 'HIGH RISK', color: 'text-red-500', status: 'Avoid if possible' };
};

const LiveMap: React.FC<LiveMapProps> = ({
    isLoaded,
    map,
    onLoad,
    onUnmount,
    directionsResponse,
    routeResult,
    showResults,
    policeStations,
    hospitals,
    selectedPlace,
    setSelectedPlace,
    isTracking,
    userLiveLocation,
    isFullScreen,
    setIsFullScreen
}) => {
    if (showResults && !routeResult) return null;

    return (
        <div className={`${isFullScreen ? 'lg:col-span-5 h-[85vh]' : 'lg:col-span-3'} bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-lg flex flex-col relative group transition-all duration-500`}>
            {/* Badge */}
            <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-teal" />
                <span className="text-xs font-bold text-white">Route Preview</span>
            </div>

            {/* Full Screen Toggle */}
            <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur p-2 rounded-full border border-white/10 text-white/80 hover:bg-brand-teal hover:text-white transition-colors"
            >
                {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Tracking Status Indicator */}
            {isTracking && (
                <div className="absolute top-16 right-4 z-10 bg-green-500/90 backdrop-blur px-3 py-2 rounded-full border border-green-400 flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    <span className="text-xs font-bold text-white">Live Tracking Active</span>
                </div>
            )}

            {/* Recenter Button */}
            {isTracking && userLiveLocation && (
                <button
                    onClick={() => map?.panTo(userLiveLocation)}
                    className="absolute bottom-6 left-6 z-10 bg-black/60 backdrop-blur p-3 rounded-full border border-white/10 text-white/80 hover:bg-brand-teal hover:text-white transition-colors shadow-xl"
                    title="Center on my location"
                >
                    <Navigation className="w-5 h-5 mx-auto" />
                </button>
            )}

            {/* Map Container */}
            <div className="flex-1 min-h-[400px] relative bg-white/5">
                {isLoaded && directionsResponse ? (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        zoom={12}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{
                            mapId: '4f6ea60a12e3432',
                            disableDefaultUI: true,
                            zoomControl: true,
                            styles: [
                                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                                { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                                { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                            ],
                        }}
                    >
                        <DirectionsRenderer
                            directions={directionsResponse}
                            options={{
                                polylineOptions: {
                                    strokeColor: showResults && routeResult ? "#555555" : "#2dd4bf", // Dim original route if showing results
                                    strokeOpacity: showResults && routeResult ? 0.3 : 0.8,
                                    strokeWeight: 6,
                                },
                                suppressMarkers: showResults, // Hide markers if showing detailed result to avoid clutter
                                preserveViewport: !!showResults,
                            }}
                        />

                        {/* Render Safest Route Line */}
                        {showResults && routeResult && (routeResult.overview_path || routeResult.overview_polyline) && (
                            <Polyline
                                path={routeResult.overview_path || (typeof routeResult.overview_polyline === 'string'
                                    ? window.google.maps.geometry.encoding.decodePath(routeResult.overview_polyline)
                                    : window.google.maps.geometry.encoding.decodePath(routeResult.overview_polyline.points))}
                                options={{
                                    strokeColor: getRiskLabel(routeResult.safetyScore).color === 'text-brand-teal' ? '#2dd4bf' :
                                        getRiskLabel(routeResult.safetyScore).color === 'text-yellow-500' ? '#eab308' : '#ef4444',
                                    strokeOpacity: 1,
                                    strokeWeight: 8,
                                }}
                            />
                        )}

                        {/* Police Stations Markers */}
                        {policeStations.map((station, idx) => (
                            station.geometry?.location && (
                                <Marker
                                    key={`police-${idx}`}
                                    position={station.geometry.location}
                                    icon={{
                                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                                        scaledSize: new window.google.maps.Size(40, 40)
                                    }}
                                    onClick={() => setSelectedPlace(station)}
                                />
                            )
                        ))}

                        {/* Hospital Markers */}
                        {hospitals.map((hospital, idx) => (
                            hospital.geometry?.location && (
                                <Marker
                                    key={`hospital-${idx}`}
                                    position={hospital.geometry.location}
                                    icon={{
                                        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                                        scaledSize: new window.google.maps.Size(40, 40)
                                    }}
                                    onClick={() => setSelectedPlace(hospital)}
                                />
                            )
                        ))}

                        {selectedPlace && selectedPlace.geometry?.location && (
                            <InfoWindow
                                position={selectedPlace.geometry.location}
                                onCloseClick={() => setSelectedPlace(null)}
                            >
                                <div className="text-black p-2 min-w-[200px]">
                                    <h3 className="font-bold text-sm">{selectedPlace.name}</h3>
                                    <p className="text-xs mt-1">{selectedPlace.vicinity}</p>
                                    <div className="flex gap-2 mt-2">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.geometry.location.lat()},${selectedPlace.geometry.location.lng()}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                                        >
                                            Drive Here
                                        </a>
                                    </div>
                                </div>
                            </InfoWindow>
                        )}

                        {/* Live Location Marker */}
                        {userLiveLocation && (
                            <Marker
                                position={userLiveLocation}
                                icon={{
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: 8,
                                    fillColor: "#00d4ff",
                                    fillOpacity: 1,
                                    strokeColor: "white",
                                    strokeWeight: 2,
                                }}
                                zIndex={100} // Keep on top
                                title="Your Current Location"
                            />
                        )}
                    </GoogleMap>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Overlay Route Info (Compact) */}
                {routeResult && (
                    <div className="absolute bottom-6 right-6 bg-black/90 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-2xl pointer-events-none">
                        <div className="text-right">
                            <p className="text-brand-teal font-bold text-3xl leading-none tracking-tight">
                                {routeResult?.legs?.[0]?.duration?.text || '~25 min'}
                            </p>
                            <div className="flex items-center justify-end gap-2 mt-2">
                                <div className={`w-2 h-2 rounded-full ${getRiskLabel(routeResult?.safety_score || 0).color.replace('text-', 'bg-')}`} />
                                <p className={`text-xs font-bold uppercase tracking-wider ${getRiskLabel(routeResult?.safety_score || 0).color}`}>
                                    {getRiskLabel(routeResult?.safety_score || 0).status}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveMap;
