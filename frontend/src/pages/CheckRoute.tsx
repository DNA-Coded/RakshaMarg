import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Autocomplete, Polyline } from '@react-google-maps/api';
import { MapPin, Navigation, Search, Shield, AlertTriangle, CheckCircle, Info, Share2, Lightbulb, Phone, Siren, Hospital, Maximize2, Minimize2, UserPlus, Trash2, X } from 'lucide-react';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import mapImage from '@/assets/map.png';
import { analyzeRouteSafety, getIncidentDetails, RouteInfo, IncidentDetail } from '@/services/navigation';

const safetyTips = [
  "Share your live location with a trusted contact.",
  "Keep emergency contacts easily accessible.",
  "Prefer well-lit and populated routes.",
  "Trust your instincts — if something feels wrong, seek help.",
  "Keep your phone charged and carry a power bank.",
  "Note landmarks along your route for easier navigation.",
];

const CheckRoute = () => {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [directionsResponse, setDirectionsResponse] = useState<any>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [originAutocomplete, setOriginAutocomplete] = useState<any>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const [trackingInterval, setTrackingInterval] = useState<any>(null);

  // Trusted Contacts State
  const [showContactModal, setShowContactModal] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState<{ name: string, phone: string }[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showAllIncidents, setShowAllIncidents] = useState(false);

  // Load contacts from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('raksha_trusted_contacts');
    if (saved) setTrustedContacts(JSON.parse(saved));
  }, []);

  const addContact = () => {
    if (newContactName && newContactPhone) {
      const updated = [...trustedContacts, { name: newContactName, phone: newContactPhone }];
      setTrustedContacts(updated);
      localStorage.setItem('raksha_trusted_contacts', JSON.stringify(updated));
      setNewContactName('');
      setNewContactPhone('');
    }
  };

  const removeContact = (index: number) => {
    const updated = trustedContacts.filter((_, i) => i !== index);
    setTrustedContacts(updated);
    localStorage.setItem('raksha_trusted_contacts', JSON.stringify(updated));
  };

  const onLoad = React.useCallback(function callback(map: any) {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback(map: any) {
    setMap(null);
  }, []);

  // Effect to fit map bounds to the selected route without reloading the map
  useEffect(() => {
    if (map && routeResult) {
      const bounds = new window.google.maps.LatLngBounds();
      if (routeResult.overview_path) {
        routeResult.overview_path.forEach((point: any) => bounds.extend(point));
      } else if (routeResult.overview_polyline) {
        const points = typeof routeResult.overview_polyline === 'string'
          ? window.google.maps.geometry.encoding.decodePath(routeResult.overview_polyline)
          : window.google.maps.geometry.encoding.decodePath(routeResult.overview_polyline.points);
        points.forEach(point => bounds.extend(point));
      }
      map.fitBounds(bounds);
    }
  }, [map, routeResult, isFullScreen]);
  useEffect(() => {
    if (isLoaded && navigator.geolocation && window.google) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Reverse Geocoding
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setFromLocation(results[0].formatted_address);
            } else {
              // Fallback if geocoding fails
              setFromLocation(`${latitude},${longitude}`);
            }
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Don't show error immediately on load, just log it
        }
      );
    }
  }, [isLoaded]);

  const onOriginLoad = (autocomplete: any) => setOriginAutocomplete(autocomplete);
  const onOriginPlaceChanged = () => {
    if (originAutocomplete !== null) {
      const place = originAutocomplete.getPlace();
      setFromLocation(place.formatted_address || place.name);
    }
  };

  const onDestLoad = (autocomplete: any) => setDestAutocomplete(autocomplete);
  const onDestPlaceChanged = () => {
    if (destAutocomplete !== null) {
      const place = destAutocomplete.getPlace();
      setToLocation(place.formatted_address || place.name);
    }
  };

  const calculateRoute = async () => {
    if (!isLoaded || !window.google) return;
    const directionsService = new window.google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: fromLocation,
        destination: toLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      setDirectionsResponse(results);
    } catch (e) {
      console.error("Maps Directions Error:", e);
    }
  };

  const handleCheckRoute = async () => {
    if (!fromLocation || !toLocation) return;

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
      console.log('Google Maps API Response:', googleResults);
      console.log('Routes found by Google:', googleResults.routes?.length);

      // 2. Get Safety Data from Backend
      const safetyData = await analyzeRouteSafety(fromLocation, toLocation);

      // 3. Merge datasets
      if (googleResults.routes && googleResults.routes.length > 0) {

        // Collect all incident IDs across all routes
        let allIncidentIds: number[] = [];
        if (safetyData.routes) {
          safetyData.routes.forEach((r: any) => {
            if (r.incident_ids && Array.isArray(r.incident_ids)) {
              allIncidentIds = [...allIncidentIds, ...r.incident_ids];
            }
          });
        }

        // Fetch details if we have any IDs
        let incidentDetailsMap: Record<string, IncidentDetail> = {};
        if (allIncidentIds.length > 0) {
          try {
            // De-duplicate IDs
            const uniqueIds = [...new Set(allIncidentIds)];
            // Fetch in batches (API handles 10 max usually, but let's send distinct)
            const details = await getIncidentDetails(uniqueIds);
            details.forEach(d => {
              incidentDetailsMap[d.id] = d;
            });
          } catch (e) {
            console.warn("Failed to fetch incident details", e);
          }
        }

        // Fetch Real Emergency Services near the Destination
        let emergencyData: any = {
          police: { name: "Local Police", address: "Nearby", formatted_phone_number: "100" },
          hospital: { name: "City Hospital", address: "Nearby", formatted_phone_number: "108" }
        };

        try {
          // Get destination coordinates from the first route's last leg
          const route = googleResults.routes[0];
          const legs = route.legs;
          if (legs && legs.length > 0) {
            const destLoc = legs[legs.length - 1].end_location;

            // Helper to fetch places
            const fetchPlace = (type: string, keyword: string) => {
              return new Promise((resolve) => {
                const service = new window.google.maps.places.PlacesService(document.createElement('div'));
                const request = {
                  location: destLoc,
                  radius: 3000, // 3km radius
                  type: type,
                  keyword: keyword
                };
                service.nearbySearch(request, (results, status) => {
                  if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    resolve(results[0]); // Take the first/nearest one
                  } else {
                    resolve(null);
                  }
                });
              });
            };

            // Fetch both in parallel
            const [policePlace, hospitalPlace]: any = await Promise.all([
              fetchPlace('police', 'police station'),
              fetchPlace('hospital', 'hospital')
            ]);

            if (policePlace) {
              emergencyData.police = {
                name: policePlace.name,
                address: policePlace.vicinity || policePlace.formatted_address,
                formatted_phone_number: "100" // Places Search doesn't return phone in list view, would need Detail search. Keep default for now or use if available.
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
        } catch (e) {
          console.error("Error fetching emergency places", e);
        }

        const mergedRoutes = googleResults.routes.map((gRoute: any, index: number) => {
          // Match with safety route (strict match, no fallback to 0 to avoid duplicates)
          const sRoute: any = (safetyData.routes && safetyData.routes[index])
            ? safetyData.routes[index]
            : { safety_score: 70, risk_level: 'Moderate', incident_count: 0, incident_ids: [] };

          // Resolve full incident objects for this route
          const routeIncidents = (sRoute.incident_ids || []).map((id: number) => incidentDetailsMap[id]).filter(Boolean);

          return {
            ...gRoute,
            ...sRoute, // Overwrite with backend data
            // Map backend properties to UI expected properties
            safety_score: sRoute.safety_score || 70,
            safetyScore: sRoute.safety_score || 70,
            summary: gRoute.summary,
            // Construct mock objects for UI components
            aiCrimeAnalysis: {
              incidents: routeIncidents,
              derived_risk_summary: {
                primary_risk_factors: [sRoute.risk_level || "General Caution"]
              }
            },
            emergencySupport: emergencyData // Use the fetched real data
          };
        });

        setAllRoutes(mergedRoutes);

        // Find "safest" by backend suggestion or sorting
        const safelyNamed = mergedRoutes.find((r: any) => r.route_name === safetyData.safest_route);
        setRouteResult(safelyNamed || mergedRoutes[0]);
        setShowResults(true);
      } else {
        setError('No routes found by Google Maps.');
      }

    } catch (err) {
      console.error(err);
      setError('Failed to analyze route. Is the backend running?');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShareLocation = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Live Location',
          text: `I'm travelling from ${fromLocation} to ${toLocation}. Track my safety status on Raksha.`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      alert('Live location link copied to clipboard!');
    }
  };

  // Helper to notify trusted contacts
  const notifyTrustedContacts = (message: string) => {
    if (trustedContacts.length === 0) return;

    trustedContacts.forEach(contact => {
      // Create WhatsApp link
      const phone = contact.phone.replace(/\D/g, ''); // Clean number
      const encodedMsg = encodeURIComponent(`Hi ${contact.name}, ${message}`);
      // Open WhatsApp in new tab (in real app, this would be an SMS API)
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    });
  };

  const handleSOS = async () => {
    setSosActive(true);

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

        // Notify backend
        try {
          await fetch('http://localhost:3000/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': 'raksha-secure-key-2024' },
            body: JSON.stringify({ lat: latitude, lng: longitude, timestamp: new Date().toISOString(), route: routeResult?.summary })
          });
        } catch (e) { console.error(e); }

        // 1. Notify Trusted Contacts (WhatsApp)
        const sosMsg = `🚨 *EMERGENCY SOS* 🚨\nI need help!\nMy Location: ${locationLink}\nRoute: ${fromLocation} to ${toLocation}`;
        notifyTrustedContacts(sosMsg);

        // 2. Share via Web Share API (native sheet)
        if (navigator.share) {
          try {
            await navigator.share({ title: '🚨 EMERGENCY', text: sosMsg, url: locationLink });
          } catch (e) { console.log(e); }
        } else {
          alert(`Emergency alert sent to ${trustedContacts.length} contacts! Calling Police...`);
          window.location.href = 'tel:100';
        }
      });
    }
  };

  const startTracking = () => {
    if (!routeResult?.overview_polyline) return;
    setIsTracking(true);

    // Notify contacts that tracking started
    notifyTrustedContacts(`🛡️ I've started a journey on Raksha.\nRoute: ${fromLocation} to ${toLocation}.\nTrack my safety status here: ${window.location.href}`);

    // Track location every 10 seconds
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const response = await fetch('http://localhost:3000/api/track', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'raksha-secure-key-2024'
              },
              body: JSON.stringify({
                currentLat: latitude,
                currentLng: longitude,
                routePolyline: typeof routeResult.overview_polyline === 'string' ? routeResult.overview_polyline : routeResult.overview_polyline?.points
              })
            });

            const data = await response.json();

            if (data.needsReroute) {
              const shouldReroute = confirm(`⚠️ You've deviated ${Math.round(data.distanceFromRoute)}m from the safe route.\n\nWould you like to recalculate?`);
              if (shouldReroute) {
                stopTracking();
                handleCheckRoute();
              }
            }
          } catch (error) {
            console.error('Tracking error:', error);
          }
        });
      }
    }, 10000);
    setTrackingInterval(interval);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  };

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [trackingInterval]);

  const getTimeRiskWarning = () => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      return { show: true, level: 'high', message: 'Night Travel: Reduced safety score due to low visibility and fewer people' };
    } else if ((hour >= 18 && hour < 22) || (hour >= 6 && hour < 8)) {
      return { show: true, level: 'moderate', message: 'Evening/Early Morning: Moderate risk period - stay alert' };
    }
    return { show: false, level: 'low', message: '' };
  };

  const resetSearch = () => {
    setFromLocation('');
    setToLocation('');
    setShowResults(false);
    setRouteResult(null);
    setError('');
  };

  const getRiskLabel = (score: number) => {
    if (score >= 80) return { label: 'LOW RISK', color: 'text-brand-teal', status: 'Safe Route' };
    if (score >= 50) return { label: 'MODERATE', color: 'text-yellow-500', status: 'Caution Advised' };
    return { label: 'HIGH RISK', color: 'text-red-500', status: 'Avoid if possible' };
  };

  const mapContent = (
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

      {/* Map Container */}
      <div className="flex-1 min-h-[400px] relative bg-white/5">
        {isLoaded && directionsResponse ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: 28.6139, lng: 77.2090 }} // New Delhi Default
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
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Overlay Route Info (Compact) */}
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
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Check Route Safety | RakshaMarg</title>
        <meta name="description" content="Prioritize safety over speed. Analyze route safety with RakshaMarg." />
      </Helmet>

      <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white selection:bg-brand-teal/30">
        <Navbar />

        <main className="flex-1 pt-24 md:pt-32 pb-20">

          {/* Header Section */}
          <section className="container px-4 mb-12">
            <div className="max-w-4xl mx-auto text-center">



              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Not just the fastest route <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-brand-purple">
                  — the safest one.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-white/60 max-w-2xl mx-auto mb-8"
              >
                Lighting  •  Crowd presence  •  Area risk patterns  •  Time of travel
              </motion.p>
            </div>
          </section>

          {/* New Input Section (Timeline without Time) */}
          <section className="container px-4 mb-16 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Subtle background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl -z-10" />

                <div className="space-y-8">
                  {/* Timeline UI */}
                  <div className="relative">

                    {/* Vertical Line */}
                    <div className="absolute left-[1.65rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-brand-teal/50 via-white/10 to-brand-purple/50 md:left-8" />

                    {/* Start Location */}
                    <div className="relative flex items-center gap-4 md:gap-6 mb-8">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0 z-10">
                        <div className="w-3 h-3 bg-brand-teal rounded-full animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2 block ml-1">Start Location</label>
                        {isLoaded ? (
                          <Autocomplete onLoad={onOriginLoad} onPlaceChanged={onOriginPlaceChanged}>
                            <Input
                              type="text"
                              placeholder="Where are you starting from?"
                              value={fromLocation}
                              onChange={(e) => setFromLocation(e.target.value)}
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-teal rounded-xl text-lg"
                            />
                          </Autocomplete>
                        ) : (
                          <Input
                            type="text"
                            placeholder="Where are you starting from?"
                            value={fromLocation}
                            onChange={(e) => setFromLocation(e.target.value)}
                            className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-teal rounded-xl text-lg"
                          />
                        )}
                      </div>
                    </div>

                    <div className="relative flex items-center gap-4 md:gap-6">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0 z-10">
                        <MapPin className="w-6 h-6 text-brand-purple" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2 block ml-1">Destination</label>
                        {isLoaded ? (
                          <Autocomplete onLoad={onDestLoad} onPlaceChanged={onDestPlaceChanged}>
                            <Input
                              type="text"
                              placeholder="Where do you want to go?"
                              value={toLocation}
                              onChange={(e) => setToLocation(e.target.value)}
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-purple rounded-xl text-lg"
                            />
                          </Autocomplete>
                        ) : (
                          <Input
                            type="text"
                            placeholder="Where do you want to go?"
                            value={toLocation}
                            onChange={(e) => setToLocation(e.target.value)}
                            className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-purple rounded-xl text-lg"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTA Area */}
                  <div className="pt-4">
                    <Button
                      size="xl"
                      className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                      onClick={handleCheckRoute}
                      disabled={!fromLocation || !toLocation || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Analysing Safety Patterns...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Search className="w-5 h-5" />
                          <span>Analyze Route Safety</span>
                        </div>
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-4 mt-4 text-[10px] uppercase tracking-widest text-white/30 font-medium">

                      <span>•</span>
                      <span>Privacy-first</span>
                      <span>•</span>
                      <span>AI Powered Analysis</span>
                    </div>
                    {error && (
                      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-200">
                        <p>{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Results Section (Restored Map Layout) */}
          {showResults && routeResult && (
            <section className={`container px-4 mb-16 scroll-mt-24 ${!isFullScreen ? 'animate-fade-in' : ''}`} id="results">
              <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-6">

                {/* Map Section */}
                {mapContent}

                {/* Safety Analysis Sidebar */}
                <div className={`space-y-4 transition-all duration-500 ${isFullScreen ? 'lg:col-span-5' : 'lg:col-span-2'}`}>
                  {/* Trusted Contacts Button */}
                  <Button
                    onClick={() => setShowContactModal(true)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl h-12 flex items-center justify-between px-4 mb-4"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-brand-teal" />
                      <span>Trusted Contacts</span>
                    </div>
                    <span className="bg-white/10 text-xs px-2 py-1 rounded-full">{trustedContacts.length} Added</span>
                  </Button>


                  <h3 className="font-display text-lg font-bold text-white/80 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-purple" />
                    Safety Analysis
                  </h3>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center relative">
                      <span className="text-xl font-bold text-white">{Math.round(routeResult.safety_score || 0)}</span>
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className={getRiskLabel(routeResult.safety_score).color} strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (routeResult.safety_score || 0)) / 100} strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${getRiskLabel(routeResult.safety_score).color}`}>
                        {getRiskLabel(routeResult.safety_score).label}
                      </div>
                      <div className="text-sm text-white/50">{getRiskLabel(routeResult.safety_score).status}</div>
                    </div>
                  </div>

                  {/* Detailed Risk Report (New) */}
                  {routeResult.aiCrimeAnalysis && (
                    <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg animate-fade-in-up">
                      <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Risk Analysis Report
                      </h3>

                      {/* AI Reasoning Text */}


                      {/* Incidents List */}
                      {/* Incidents List */}
                      <div className="space-y-3">
                        {routeResult.aiCrimeAnalysis.incidents?.length > 0 ? (
                          <>
                            <div className={`space-y-3 ${showAllIncidents ? 'max-h-[300px] overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                              {(showAllIncidents
                                ? routeResult.aiCrimeAnalysis.incidents
                                : routeResult.aiCrimeAnalysis.incidents.slice(0, 3)
                              ).map((incident: any, idx: number) => (
                                <div key={idx} className="flex gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/10">
                                  <div className="shrink-0 mt-0.5">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <p className="text-xs font-bold text-red-200 uppercase tracking-wider">{incident.category || 'Incident'}</p>
                                      <span className="text-[10px] text-white/40">{incident.incident_date || 'Recent'}</span>
                                    </div>
                                    <p className="text-sm text-white/70 mt-1">{incident.description || 'Safety concern reported in this area.'}</p>
                                    {incident.area && <p className="text-[10px] text-white/30 mt-1">📍 {incident.area}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {routeResult.aiCrimeAnalysis.incidents.length > 3 && (
                              <button
                                onClick={() => setShowAllIncidents(!showAllIncidents)}
                                className="w-full py-2 text-xs font-bold text-center text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-dashed border-white/10"
                              >
                                {showAllIncidents ? "Show Less" : `View ${routeResult.aiCrimeAnalysis.incidents.length - 3} More Incidents`}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/10">
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-green-200">No major recent incidents reported in this specific corridor.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {routeResult.aiCrimeAnalysis?.derived_risk_summary?.primary_risk_factors?.length > 0 ? (
                      routeResult.aiCrimeAnalysis.derived_risk_summary.primary_risk_factors.slice(0, 3).map((factor: string, idx: number) => (
                        <div key={idx} className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                          <Info className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
                          <p className="text-sm text-white/70">{typeof factor === 'string' ? factor : 'Route factor analyzed.'}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <Info className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
                        <p className="text-sm text-white/70">Safety analysis based on available street data.</p>
                      </div>
                    )}
                  </div>




                  {/* Alternative Routes Selector */}
                  {allRoutes.length > 1 && (
                    <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg mt-4">
                      <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-brand-purple" />
                        Alternative Routes
                      </h3>
                      <div className="space-y-2">
                        {allRoutes.map((route, idx) => {
                          const isSelected = routeResult === route;
                          const risk = getRiskLabel(route.safety_score);
                          return (
                            <button
                              key={idx}
                              onClick={() => setRouteResult(route)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected
                                ? 'bg-brand-purple/20 border-brand-purple shadow-lg shadow-brand-purple/10'
                                : 'bg-black/20 border-white/5 hover:bg-white/5'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-brand-purple text-white' : 'bg-white/10 text-white/50'
                                  }`}>
                                  {idx + 1}
                                </div>
                                <div className="text-left">
                                  <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                    {route.route_name || `Route ${idx + 1}`}
                                  </p>
                                  <p className="text-xs text-white/40">{route.incident_count} incidents near route</p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold ${risk.color}`}>{risk.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Safety Warning for Alternative Selection */}
                  {allRoutes.length > 0 && routeResult !== allRoutes[0] && (
                    <div className="bg-red-500/10 rounded-3xl p-5 border border-red-500/20 shadow-lg mt-4 animate-pulse">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold text-red-200 uppercase tracking-wider mb-1">
                            Caution: Safer Route Available
                          </h3>
                          <p className="text-sm text-red-100/70 leading-relaxed">
                            You have selected a route with a <strong>lower safety score ({routeResult.safety_score})</strong> than the recommended option ({allRoutes[0].safety_score}).
                            Risk factors like lighting issues may be higher here.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 bg-red-500/20 border-red-500/30 text-red-100 hover:bg-red-500/30"
                            onClick={() => setRouteResult(allRoutes[0])}
                          >
                            Switch to Safest Route
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nearest Emergency Services (Replaces Safer Alternative) */}
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Siren className="w-4 h-4 text-brand-purple" />
                      Emergency Support Nearby
                    </h3>

                    <div className="space-y-3">
                      {/* Police Station */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                            <Shield className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white max-w-[150px] truncate" title={routeResult?.emergencySupport?.police?.name}>
                              {routeResult?.emergencySupport?.police?.name || "Nearest Police Station"}
                            </p>
                            <p className="text-xs text-white/50 truncate max-w-[160px]">
                              {routeResult?.emergencySupport?.police?.address || "Location Verified"}
                            </p>
                          </div>
                        </div>
                        <a href={`tel:${routeResult?.emergencySupport?.police?.formatted_phone_number || '100'}`}>
                          <Button size="icon" className="w-9 h-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>

                      {/* Hospital */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/20">
                            <Hospital className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white max-w-[150px] truncate" title={routeResult?.emergencySupport?.hospital?.name}>
                              {routeResult?.emergencySupport?.hospital?.name || "Nearest Hospital"}
                            </p>
                            <p className="text-xs text-white/50 truncate max-w-[160px]">
                              {routeResult?.emergencySupport?.hospital?.address || "Location Verified"}
                            </p>
                          </div>
                        </div>
                        <a href={`tel:${routeResult?.emergencySupport?.hospital?.formatted_phone_number || '108'}`}>
                          <Button size="icon" className="w-9 h-9 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* SOS Emergency Button */}
                  <Button
                    onClick={handleSOS}
                    className={`w-full h-16 ${sosActive ? 'bg-red-600 animate-pulse' : 'bg-red-500 hover:bg-red-600'} text-white rounded-2xl text-lg font-bold shadow-2xl shadow-red-500/50 border-2 border-red-400`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6" />
                      <span>{sosActive ? '🚨 SOS ACTIVE' : '🆘 EMERGENCY SOS'}</span>
                    </div>
                  </Button>

                  {/* Route Tracking Controls */}
                  <div className="flex gap-3">
                    <Button
                      onClick={isTracking ? stopTracking : startTracking}
                      className={`flex-1 h-14 ${isTracking ? 'bg-green-500 hover:bg-green-600' : 'bg-brand-purple hover:bg-brand-purple/80'} text-white rounded-2xl font-bold shadow-lg`}
                    >
                      <div className="flex items-center gap-2">
                        <Navigation className={`w-5 h-5 ${isTracking ? 'animate-pulse' : ''}`} />
                        <span>{isTracking ? 'Stop Tracking' : 'Start Tracking'}</span>
                      </div>
                    </Button>

                    <Button
                      onClick={handleShareLocation}
                      className="flex-1 h-14 bg-gradient-to-r from-brand-teal/20 to-brand-purple/20 hover:from-brand-teal/30 hover:to-brand-purple/30 border border-brand-teal/30 text-white rounded-2xl font-bold shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-brand-teal" />
                        <span>Share</span>
                      </div>
                    </Button>
                  </div>

                </div>
              </div>
            </section>
          )}


          {/* Safety Tips */}
          <section className="container px-4">
            <div className="max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-brand-purple" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  Smart Travel Tips
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {safetyTips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-black/20 rounded-2xl border border-white/5"
                  >
                    <div className="w-6 h-6 bg-brand-teal/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-brand-teal">{index + 1}</span>
                    </div>
                    <p className="text-sm text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>

        {/* Trusted Contacts Modal */}
        {showContactModal && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in-up">
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-purple" />
                Trusted Contacts
              </h2>
              <p className="text-sm text-white/50 mb-6">
                Add contacts to automatically notify them when you start tracking or trigger SOS.
              </p>

              {/* List of Contacts */}
              <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar">
                {trustedContacts.length === 0 ? (
                  <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                    <UserPlus className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-white/40">No contacts added yet.</p>
                  </div>
                ) : (
                  trustedContacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-teal/20 flex items-center justify-center text-xs font-bold text-brand-teal">
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{contact.name}</p>
                          <p className="text-xs text-white/50">{contact.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeContact(idx)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Contact Form */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Add New Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                  <Input
                    placeholder="Phone (with code)"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <Button
                  onClick={addContact}
                  disabled={!newContactName || !newContactPhone}
                  className="w-full bg-brand-purple hover:bg-brand-purple/80 text-white font-bold"
                >
                  Add Contact
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <Footer />
      </div >
    </>
  );
};

export default CheckRoute;