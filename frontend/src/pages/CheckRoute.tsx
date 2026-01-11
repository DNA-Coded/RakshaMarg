import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Autocomplete, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, Navigation, Search, Shield, AlertTriangle, CheckCircle, Info, Share2, Lightbulb, Phone, Siren, Hospital, Maximize2, Minimize2, UserPlus, Trash2, X } from 'lucide-react';
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

  // Refactored Safety Logic
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

  // Old state removed as it is now in useRouteSafety

  // isTracking and userLiveLocation are now managed by useLiveTracking hook
  const [sosActive, setSosActive] = useState(false);
  // userLiveLocation removed here

  // trackingInterval, watchIdRef, lastApiCallRef removed here

  // Trusted Contacts State
  const [showContactModal, setShowContactModal] = useState(false);
  const [trustedContacts, setTrustedContacts] = useState<{ name: string, phone: string }[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');


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

  // onLoad, onUnmount moved to useRouteSafety hook

  // Effects for map bounds and services moved to useRouteSafety hook
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const fetchCurrentLocation = () => {
    if (navigator.geolocation && window.google) {
      // Show some loading state if needed, or just rely on the input filling up

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
      // Auto-fetch on load (optional, maybe distracting if user wants to type?)
      // We'll keep it but use the shared function
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

  // calculateRoute and handleCheckRoute logics moved to useRouteSafety hook

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

  // Old tracking logic removed - replaced by useLiveTracking hook

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
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs uppercase tracking-wider text-white/40 font-bold block ml-1">Start Location</label>
                          {locationAccuracy && (
                            <span className="text-[10px] uppercase font-bold text-brand-teal animate-pulse">
                              Accuracy: ±{Math.round(locationAccuracy)}m
                            </span>
                          )}
                        </div>
                        {isLoaded ? (
                          <Autocomplete onLoad={onOriginLoad} onPlaceChanged={onOriginPlaceChanged}>
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="Where are you starting from?"
                                value={fromLocation}
                                onChange={(e) => setFromLocation(e.target.value)}
                                className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-teal rounded-xl text-lg pr-12"
                              />
                              <button
                                onClick={fetchCurrentLocation}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-brand-teal transition-colors"
                                title="Use my current location"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
                              </button>
                            </div>
                          </Autocomplete>
                        ) : (
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Where are you starting from?"
                              value={fromLocation}
                              onChange={(e) => setFromLocation(e.target.value)}
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-teal rounded-xl text-lg pr-12"
                            />
                            <button
                              onClick={fetchCurrentLocation}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-brand-teal transition-colors"
                              title="Use my current location"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
                            </button>
                          </div>
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
                      className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90 transition-[opacity,box-shadow] shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                      onClick={() => handleCheckRoute(fromLocation, toLocation)}
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

import ErrorBoundary from '../components/ErrorBoundary';

const CheckRouteWithErrorBoundary = () => {
  return (
    <ErrorBoundary>
      <CheckRoute />
    </ErrorBoundary>
  );
};

export default CheckRouteWithErrorBoundary;