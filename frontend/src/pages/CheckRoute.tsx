import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Autocomplete, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Shield, Lightbulb, X } from 'lucide-react';
import TrustedContactsModal from '../components/safety/TrustedContactsModal';
import RouteInputForm from '../components/map/RouteInputForm';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { useRouteSafety } from '../hooks/useRouteSafety';
import { useSmartSafetyMode, useEmergencyResponse } from '../hooks/useSafetyAssistant';
import LiveMap from '../components/map/LiveMap';
import SafetyAnalysisReport from '../components/safety/SafetyAnalysisReport';
import { useRouteContext } from '../context/RouteContext';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import mapImage from '@/assets/map.png';
import { analyzeRouteSafety, getIncidentDetails, RouteInfo, IncidentDetail } from '@/services/navigation';
import { API_BASE_URL, buildNavigationApiUrl } from '@/config';
import { getAuthHeaders } from '@/lib/apiHeaders';
import { observeAuthState } from '@/lib/firebaseAuth';
import { toast } from '@/hooks/use-toast';

const safetyTips = [
  "Share your live location with a trusted contact.",
  "Keep emergency contacts easily accessible.",
  "Prefer well-lit and populated routes.",
  "Trust your instincts — if something feels wrong, seek help.",
  "Keep your phone charged and carry a power bank.",
  "Note landmarks along your route for easier navigation.",
];

const CheckRoute = () => {
  type TrustedContact = { name: string; phone: string };

  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');

  // Maps UI State
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  const {
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
  } = useRouteSafety();

  // Route Context for Chatbot Integration
  const { setRouteData, clearRouteData } = useRouteContext();

  const [originAutocomplete, setOriginAutocomplete] = useState<any>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Trusted Contacts State
  const [showContactModal, setShowContactModal] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const lastRouteContextSyncKeyRef = useRef<string | null>(null);
  const routeContextSyncedRef = useRef(false);

  const CONTACTS_STORAGE_KEY = 'raksha_trusted_contacts';

  const normalizeContacts = (contacts: TrustedContact[]) => {
    return contacts
      .map((contact) => ({
        name: String(contact.name || '').trim(),
        phone: String(contact.phone || '').trim()
      }))
      .filter((contact) => contact.name.length > 0 && contact.phone.length > 0);
  };

  const loadContactsFromLocal = () => {
    const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!saved) return [] as TrustedContact[];

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return normalizeContacts(parsed);
    } catch {
      return [];
    }
  };

  const saveContactsToLocal = (contacts: TrustedContact[]) => {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  };

  const saveContactsToServer = async (contacts: TrustedContact[]) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me/trusted-contacts`, {
      method: 'PUT',
      headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ contacts })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(details || `Failed to save contacts (${response.status})`);
    }

    const data = await response.json();
    return normalizeContacts(data.contacts || []);
  };

  const loadContactsFromServer = async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me/trusted-contacts`, {
      method: 'GET',
      headers: await getAuthHeaders()
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(details || `Failed to load contacts (${response.status})`);
    }

    const data = await response.json();
    return normalizeContacts(data.contacts || []);
  };

  const persistContacts = async (contacts: TrustedContact[]) => {
    const normalized = normalizeContacts(contacts);
    setTrustedContacts(normalized);
    saveContactsToLocal(normalized);

    if (!isAuthenticated) return;

    try {
      const serverContacts = await saveContactsToServer(normalized);
      setTrustedContacts(serverContacts);
      saveContactsToLocal(serverContacts);
    } catch (error) {
      console.error('Failed to save trusted contacts:', error);
      toast({
        title: 'Saved locally',
        description: 'Could not sync contacts to server right now.',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      const loggedIn = Boolean(user);
      setIsAuthenticated(loggedIn);

      if (!loggedIn) {
        setTrustedContacts(loadContactsFromLocal());
        return;
      }

      try {
        const localContacts = loadContactsFromLocal();
        const serverContacts = await loadContactsFromServer();

        // First login on a new account: migrate local contacts to server.
        if (serverContacts.length === 0 && localContacts.length > 0) {
          const synced = await saveContactsToServer(localContacts);
          setTrustedContacts(synced);
          saveContactsToLocal(synced);
          return;
        }

        setTrustedContacts(serverContacts);
        saveContactsToLocal(serverContacts);
      } catch (error) {
        console.error('Failed to sync trusted contacts:', error);
        setTrustedContacts(loadContactsFromLocal());
      }
    });

    return () => unsubscribe();
  }, []);

  // Update Route Context for Chatbot Integration
  useEffect(() => {
    if (routeResult && fromLocation && toLocation) {
      const currentHour = new Date().getHours();
      const isNightTime = currentHour < 5 || currentHour > 21;

      const nearestHospitalForContext = hospitals && hospitals.length > 0 ? hospitals[0] : null;
      const nearestPoliceForContext = policeStations && policeStations.length > 0 ? policeStations[0] : null;
      const routeContextSyncKey = JSON.stringify({
        origin: fromLocation,
        destination: toLocation,
        safetyScore: routeResult.safetyScore || null,
        summary: routeResult.summary || null,
        incidentsCount: routeResult.incidents?.length || 0,
        nearestHospitalName: nearestHospitalForContext?.name || null,
        nearestHospitalDistance: nearestHospitalForContext?.distance || null,
        nearestPoliceName: nearestPoliceForContext?.name || null,
        nearestPoliceDistance: nearestPoliceForContext?.distance || null,
        isNightTime,
        routesCount: allRoutes?.length || 0,
      });

      if (lastRouteContextSyncKeyRef.current === routeContextSyncKey) {
        return;
      }

      setRouteData({
        origin: fromLocation,
        destination: toLocation,
        safetyScore: routeResult.safetyScore || null,
        riskLevel: 
          (routeResult.safetyScore || 0) >= 70 ? 'Low Risk' :
          (routeResult.safetyScore || 0) >= 50 ? 'Moderate Risk' :
          'High Risk',
        incidents: routeResult.incidents || [],
        nearestHospital: nearestHospitalForContext,
        nearestPolice: nearestPoliceForContext,
        isNightTime,
        routes: allRoutes || [],
      });
      lastRouteContextSyncKeyRef.current = routeContextSyncKey;
      routeContextSyncedRef.current = true;
    } else if (!routeResult && routeContextSyncedRef.current) {
      clearRouteData();
      lastRouteContextSyncKeyRef.current = null;
      routeContextSyncedRef.current = false;
    }
  }, [routeResult, fromLocation, toLocation, hospitals, policeStations, allRoutes, setRouteData, clearRouteData]);

  const addContact = (name: string, phone: string) => {
    const updated = [...trustedContacts, { name, phone }];
    void persistContacts(updated);
  };

  const removeContact = (index: number) => {
    const updated = trustedContacts.filter((_, i) => i !== index);
    void persistContacts(updated);
  };

  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [shouldAutoScrollToResults, setShouldAutoScrollToResults] = useState(false);
  const [initialCoordinates, setInitialCoordinates] = useState<google.maps.LatLngLiteral | null>(null);

  const fetchCurrentLocation = () => {
    if (navigator.geolocation && window.google) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocationAccuracy(accuracy);
          setInitialCoordinates({ lat: latitude, lng: longitude });

          // Reverse Geocoding
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              console.log("Geocoding Results:", results);

              // Priority order for address precision
              const getPrecisionScore = (res: any) => {
                const types = res.types;
                if (types.includes('street_address') || types.includes('premise') || types.includes('subpremise')) return 3;
                if (types.includes('route') || types.includes('plus_code')) return 2;
                if (types.includes('neighborhood') || types.includes('political')) return 1;
                return 0;
              };

              // Sort by precision
              const bestResult = results.sort((a, b) => getPrecisionScore(b) - getPrecisionScore(a))[0];

              if (bestResult && getPrecisionScore(bestResult) >= 1) {
                setFromLocation(bestResult.formatted_address);
              } else {
                setFromLocation(results[0].formatted_address);
              }
            } else {
              setFromLocation(`${latitude},${longitude}`);
            }
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          const locationErrorMessage = error.code === error.PERMISSION_DENIED
            ? 'Location access is blocked. Enable location permission and try again.'
            : 'Could not get your location. Please ensure location services are enabled.';
          toast({
            title: 'Location unavailable',
            description: locationErrorMessage,
            variant: 'destructive'
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    }
  };

  useEffect(() => {
    if (isLoaded && navigator.geolocation && window.google) {
      fetchCurrentLocation();
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

  useEffect(() => {
    if (!shouldAutoScrollToResults || !showResults || !routeResult) return;

    // Wait for result section (including map) to mount before scrolling.
    const timer = window.setTimeout(() => {
      const resultSection = document.getElementById('results');
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setShouldAutoScrollToResults(false);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [shouldAutoScrollToResults, showResults, routeResult]);

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
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied',
          description: 'Live location link copied to clipboard.'
        });
      } catch (error) {
        console.error('Clipboard write failed:', error);
        toast({
          title: 'Share failed',
          description: 'Could not copy the live location link. Please copy it manually from the address bar.',
          variant: 'destructive'
        });
      }
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

  // Tracking Hook
  const {
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
  } = useLiveTracking(
    routeResult,
    fromLocation,
    toLocation,
    notifyTrustedContacts,
    () => handleCheckRoute(fromLocation, toLocation),
    map
  );

  const autoTrackingRouteKeyRef = useRef<string | null>(null);
  const hasNotifiedTrackingStartRef = useRef(false);

  useEffect(() => {
    if (!showResults || !routeResult?.overview_polyline || !fromLocation || !toLocation) {
      return;
    }

    const routePolyline =
      typeof routeResult.overview_polyline === 'string'
        ? routeResult.overview_polyline
        : routeResult?.overview_polyline?.points || '';

    if (!routePolyline) {
      return;
    }

    const routeKey = `${fromLocation}::${toLocation}::${routePolyline}`;

    if (autoTrackingRouteKeyRef.current === routeKey && isTracking) {
      return;
    }

    if (isTracking) {
      stopTracking();
    }

    const shouldNotifyContacts = !hasNotifiedTrackingStartRef.current;
    startTracking('navigation', { notifyContacts: shouldNotifyContacts });
    autoTrackingRouteKeyRef.current = routeKey;
    hasNotifiedTrackingStartRef.current = true;
  }, [showResults, routeResult, fromLocation, toLocation, isTracking, startTracking, stopTracking]);

  useEffect(() => {
    if (showResults && routeResult) {
      return;
    }

    autoTrackingRouteKeyRef.current = null;
    hasNotifiedTrackingStartRef.current = false;
  }, [showResults, routeResult]);

  const [sosActive, setSosActive] = useState(false);
  const [isSosSending, setIsSosSending] = useState(false);

  // Smart Safety Mode
  const [smartSafetyEnabled, setSmartSafetyEnabled] = useState(false);
  const { safetyAlerts, isMonitoring, toggleMonitoring } = useSmartSafetyMode(
    smartSafetyEnabled && isTracking,
    {
      activeRoute: routeResult,
      currentLocation: userLiveLocation || initialCoordinates,
      destination: toLocation,
      nearbyPlaces: { hospitals, policeStations }
    }
  );

  // Emergency Response
  const { isEmergency, emergencyGuidance, triggerEmergency, clearEmergency } = useEmergencyResponse();

  // Journey context for ChatAssistant
  const journeyContext = {
    currentLocation: userLiveLocation || initialCoordinates ? {
      lat: (userLiveLocation || initialCoordinates)?.lat || 0,
      lng: (userLiveLocation || initialCoordinates)?.lng || 0,
      address: fromLocation
    } : undefined,
    destination: toLocation ? {
      address: toLocation,
      lat: 0,
      lng: 0
    } : undefined,
    activeRoute: routeResult ? {
      summary: routeResult.summary,
      safetyScore: routeResult.safetyScore || 0,
      duration: routeResult.duration || 'N/A'
    } : undefined,
    nearbyPlaces: {
      hospitals: hospitals || [],
      policeStations: policeStations || []
    },
    currentTime: new Date().toISOString(),
    isNightTime: new Date().getHours() < 5 || new Date().getHours() > 21
  };

  const handleSOS = async () => {
    if (sosActive || isSosSending) return;

    setIsSosSending(true);

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

          // Notify backend
          await fetch(buildNavigationApiUrl('/sos'), {
            method: 'POST',
            headers: await getAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ lat: latitude, lng: longitude, timestamp: new Date().toISOString(), route: routeResult?.summary })
          });
          // 1. Notify Trusted Contacts (WhatsApp)
          const sosMsg = `🚨 *EMERGENCY SOS* 🚨\nI need help!\nMy Location: ${locationLink}\nRoute: ${fromLocation} to ${toLocation}`;
          notifyTrustedContacts(sosMsg);

          // 2. Share via Web Share API (native sheet)
          if (navigator.share) {
            try {
              await navigator.share({ title: '🚨 EMERGENCY', text: sosMsg, url: locationLink });
            } catch (e) { console.log(e); }
          } else {
            toast({
              title: 'Emergency alert sent',
              description: `Alert sent to ${trustedContacts.length} contacts. Calling police helpline...`
            });
            window.location.href = 'tel:100';
          }

          // SOS is considered active after message/location dispatch completes.
          setSosActive(true);
        } catch (e) {
          console.error(e);
          toast({
            title: 'SOS failed',
            description: 'Unable to send emergency alert right now. Please try again.',
            variant: 'destructive'
          });
        } finally {
          setIsSosSending(false);
        }
      }, (error) => {
        console.error("SOS location error:", error);
        toast({
          title: 'SOS location failed',
          description: 'Unable to fetch your location for SOS. Turn on GPS and retry.',
          variant: 'destructive'
        });
        setIsSosSending(false);
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } else {
      toast({
        title: 'SOS unavailable',
        description: 'Geolocation is not supported in this browser.',
        variant: 'destructive'
      });
      setIsSosSending(false);
    }
  };

  const mapContent = (
    <LiveMap
      isLoaded={isLoaded}
      map={map}
      onLoad={onLoad}
      onUnmount={onUnmount}
      directionsResponse={liveDirectionsResponse || directionsResponse}
      routeResult={routeResult}
      showResults={showResults}
      policeStations={policeStations}
      hospitals={hospitals}
      selectedPlace={selectedPlace}
      setSelectedPlace={setSelectedPlace}
      isTracking={isTracking}
      userLiveLocation={userLiveLocation || initialCoordinates}
      nearestHospital={nearestHospital}
      nearestPoliceStation={nearestPoliceStation}
      currentWeather={currentWeather}
      weatherAlerts={weatherAlerts}
      weatherStatus={weatherStatus}
      weatherReason={weatherReason}
      userBearing={userBearing}
      isFullScreen={isFullScreen}
      setIsFullScreen={setIsFullScreen}
    />
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
              <RouteInputForm
                isLoaded={isLoaded}
                fromLocation={fromLocation}
                setFromLocation={setFromLocation}
                toLocation={toLocation}
                setToLocation={setToLocation}
                fetchCurrentLocation={fetchCurrentLocation}
                onOriginLoad={onOriginLoad}
                onOriginPlaceChanged={onOriginPlaceChanged}
                onDestLoad={onDestLoad}
                onDestPlaceChanged={onDestPlaceChanged}
                handleCheckRoute={(from, to) => {
                  setShouldAutoScrollToResults(true);
                  return handleCheckRoute(from, to);
                }}
                isAnalyzing={isAnalyzing}
                locationAccuracy={locationAccuracy}
                error={error}
              />
            </motion.div>
          </section>

          {/* Results Section (Restored Map Layout) */}
          {showResults && routeResult && (
            <section className={`container px-4 mb-16 scroll-mt-24 ${!isFullScreen ? 'animate-fade-in' : ''}`} id="results">
              <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-6">

                {/* Map Section */}
                {mapContent}

                {/* Safety Analysis Sidebar */}
                <SafetyAnalysisReport
                  routeResult={routeResult}
                  allRoutes={allRoutes}
                  setRouteResult={setRouteResult}
                  trustedContacts={trustedContacts}
                  setShowContactModal={setShowContactModal}
                  trackingError={trackingError}
                  isGpsSignalLost={isGpsSignalLost}
                  isRouteUpdatesPaused={isRouteUpdatesPaused}
                  nearestHospital={nearestHospital}
                  nearestPoliceStation={nearestPoliceStation}
                  currentWeather={currentWeather}
                  weatherAlerts={weatherAlerts}
                  weatherUpdatedAt={weatherUpdatedAt}
                  weatherStatus={weatherStatus}
                  weatherReason={weatherReason}
                  isTracking={isTracking}
                  handleShareLocation={handleShareLocation}
                  handleSOS={handleSOS}
                  sosActive={sosActive}
                  isSosSending={isSosSending}
                  fromLocation={fromLocation}
                  toLocation={toLocation}
                  isFullScreen={isFullScreen}
                />
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
        <TrustedContactsModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          contacts={trustedContacts}
          onAddContact={addContact}
          onRemoveContact={removeContact}
        />

        <Footer />
      </div >
    </>
  );
};

import ErrorBoundary from '../components/ErrorBoundary';

const CheckRouteWithErrorBoundary = () => {
  return (
    <ErrorBoundary>
      <CheckRoute />
    </ErrorBoundary>
  );
};

export default CheckRouteWithErrorBoundary;