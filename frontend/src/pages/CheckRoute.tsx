import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Navigation, Search, Shield, AlertTriangle, CheckCircle, Info, Clock, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const safetyTips = [
  "Share your live location with a trusted contact before traveling.",
  "Keep emergency contacts easily accessible on your phone.",
  "Prefer well-lit and populated routes, especially at night.",
  "Trust your instincts — if something feels wrong, seek help.",
  "Keep your phone charged and carry a power bank.",
  "Note landmarks along your route for easier navigation.",
];

const CheckRoute = () => {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleCheckRoute = () => {
    if (!fromLocation || !toLocation) return;
    
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 2000);
  };

  const resetSearch = () => {
    setFromLocation('');
    setToLocation('');
    setShowResults(false);
  };

  return (
    <>
      <Helmet>
        <title>Check Route Safety | RakshaMarg</title>
        <meta name="description" content="Check the safety of your travel route before you go." />
      </Helmet>

      {/* Main Page Background: First Color (Light) */}
      <div className="min-h-screen bg-brand-first flex flex-col">
        <Navbar />
        
        <main className="flex-1 pt-20 md:pt-24">
          {/* Hero Section */}
          <section className="py-12">
            <div className="container px-4">
              <div className="max-w-3xl mx-auto text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-teal/20 rounded-2xl mb-6">
                  <Shield className="w-8 h-8 text-brand-navy" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-navy mb-4">
                  Check Your Route Safety
                </h1>
                <p className="text-lg text-brand-slate">
                  Enter your starting point and destination to get safety awareness information for your journey.
                </p>
              </div>

              {/* Route Input Card - White Background to pop against First Color */}
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-brand-slate/10">
                  <div className="space-y-4">
                    {/* From Input */}
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-slate">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Enter starting location"
                        value={fromLocation}
                        onChange={(e) => setFromLocation(e.target.value)}
                        // Explicitly white background, Slate border
                        className="pl-12 h-14 text-base bg-white border-brand-slate/30 focus-visible:ring-2 focus-visible:ring-brand-teal"
                      />
                    </div>

                    {/* Connector */}
                    <div className="flex items-center justify-center">
                      <div className="w-0.5 h-6 bg-brand-slate/30 rounded-full" />
                    </div>

                    {/* To Input */}
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-teal">
                        <Navigation className="w-5 h-5" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Enter destination"
                        value={toLocation}
                        onChange={(e) => setToLocation(e.target.value)}
                        className="pl-12 h-14 text-base bg-white border-brand-slate/30 focus-visible:ring-2 focus-visible:ring-brand-teal"
                      />
                    </div>

                    {/* Button using Hero Variant */}
                    <Button 
                      variant="hero" 
                      size="xl" 
                      className="w-full mt-4"
                      onClick={handleCheckRoute}
                      disabled={!fromLocation || !toLocation || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-brand-light/30 border-t-brand-light rounded-full animate-spin" />
                          Analyzing Route...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Check Route Safety
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Results Section */}
          {showResults && (
            <section className="py-12 animate-fade-in">
              <div className="container px-4">
                <div className="max-w-4xl mx-auto">
                  <div className="grid lg:grid-cols-5 gap-6">
                    {/* Route Preview Card */}
                    <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg overflow-hidden border border-brand-slate/10">
                      <div className="p-6 border-b border-brand-slate/10">
                        <h2 className="font-display text-xl font-semibold text-brand-navy flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-brand-teal" />
                          Route Preview
                        </h2>
                      </div>
                      
                      {/* Map Placeholder */}
                      <div className="aspect-[4/3] bg-brand-first flex items-center justify-center relative">
                        <div className="text-center z-10">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Navigation className="w-8 h-8 text-brand-slate" />
                          </div>
                          <p className="text-brand-navy font-medium">Route Visualization</p>
                          <p className="text-sm text-brand-slate mt-1">
                            {fromLocation} → {toLocation}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 bg-brand-first/50">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-brand-slate">
                            <Clock className="w-4 h-4" />
                            <span>Estimated time: ~25 min</span>
                          </div>
                          <div className="w-1 h-1 bg-brand-slate/30 rounded-full" />
                          <div className="flex items-center gap-2 text-brand-slate">
                            <MapPin className="w-4 h-4" />
                            <span>Distance: ~8.5 km</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Safety Panel */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-2xl shadow-lg p-6 border border-brand-slate/10">
                        <h3 className="font-display text-lg font-semibold text-brand-navy mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5 text-brand-teal" />
                          Safety Awareness
                        </h3>
                        
                        <div className="bg-brand-teal/10 rounded-xl p-4 mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-brand-teal/20 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-brand-navy" />
                            </div>
                            <div>
                              <p className="font-semibold text-brand-navy">Moderate Awareness</p>
                              <p className="text-xs text-brand-slate">Route conditions analyzed</p>
                            </div>
                          </div>
                          <div className="h-2 bg-brand-first rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-brand-teal rounded-full" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-brand-first rounded-lg">
                            <Info className="w-4 h-4 text-brand-slate mt-0.5" />
                            <p className="text-sm text-brand-slate">
                              This route passes through moderately populated areas.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full border-brand-slate text-brand-navy hover:bg-brand-slate hover:text-white" onClick={resetSearch}>
                        Check Another Route
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Safety Tips Section */}
          <section className="py-12 bg-white">
            <div className="container px-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-brand-teal/20 rounded-lg flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-brand-navy" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-brand-navy">
                    Travel Safety Tips
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {safetyTips.map((tip, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-4 bg-brand-first rounded-xl"
                    >
                      <div className="w-6 h-6 bg-brand-slate/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-brand-navy">{index + 1}</span>
                      </div>
                      <p className="text-sm text-brand-slate">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CheckRoute;