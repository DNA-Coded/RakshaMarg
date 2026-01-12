import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Autocomplete, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Shield, Lightbulb, X } from 'lucide-react';
import TrustedContactsModal from '../components/safety/TrustedContactsModal';
import RouteInputForm from '../components/map/RouteInputForm';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { useRouteSafety } from '../hooks/useRouteSafety';
import LiveMap from '../components/map/LiveMap';
import SafetyAnalysisReport from '../components/safety/SafetyAnalysisReport';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import mapImage from '@/assets/map.png';
import { analyzeRouteSafety, getIncidentDetails, RouteInfo, IncidentDetail } from '@/services/navigation';
import { API_BASE_URL, API_KEY } from '@/config';

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

  const [originAutocomplete, setOriginAutocomplete] = useState<any>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Trusted Contacts State
  const [showContactModal, setShowContactModal] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState<{ name: string, phone: string }[]>([]);

  // Load contacts from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('raksha_trusted_contacts');
    if (saved) setTrustedContacts(JSON.parse(saved));
  }, []);

  const addContact = (name: string, phone: string) => {
    const updated = [...trustedContacts, { name, phone }];
    setTrustedContacts(updated);
    localStorage.setItem('raksha_trusted_contacts', JSON.stringify(updated));
  };

  const removeContact = (index: number) => {
    const updated = trustedContacts.filter((_, i) => i !== index);
    setTrustedContacts(updated);
    localStorage.setItem('raksha_trusted_contacts', JSON.stringify(updated));
  };

  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const fetchCurrentLocation = () => {
    if (navigator.geolocation && window.google) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocationAccuracy(accuracy);

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
          alert("Could not get your location. Please ensure location services are enabled.");
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

  // Tracking Hook
  const {
    isTracking,
    userLiveLocation,
    startTracking,
    stopTracking
  } = useLiveTracking(
    routeResult,
    fromLocation,
    toLocation,
    notifyTrustedContacts,
    () => handleCheckRoute(fromLocation, toLocation)
  );

  const [sosActive, setSosActive] = useState(false);

  const handleSOS = async () => {
    setSosActive(true);

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

        // Notify backend
        try {
          await fetch(`${API_BASE_URL}/sos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
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
      }, (error) => console.error("SOS location error:", error), { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    }
  };

  const mapContent = (
    <LiveMap
      isLoaded={isLoaded}
      map={map}
      onLoad={onLoad}
      onUnmount={onUnmount}
      directionsResponse={directionsResponse}
      routeResult={routeResult}
      showResults={showResults}
      policeStations={policeStations}
      hospitals={hospitals}
      selectedPlace={selectedPlace}
      setSelectedPlace={setSelectedPlace}
      isTracking={isTracking}
      userLiveLocation={userLiveLocation}
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
                handleCheckRoute={handleCheckRoute}
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
                  isTracking={isTracking}
                  startTracking={startTracking}
                  stopTracking={stopTracking}
                  handleShareLocation={handleShareLocation}
                  handleSOS={handleSOS}
                  sosActive={sosActive}
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