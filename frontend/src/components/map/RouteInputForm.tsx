import React from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RouteInputFormProps {
    isLoaded: boolean;
    fromLocation: string;
    setFromLocation: (value: string) => void;
    toLocation: string;
    setToLocation: (value: string) => void;
    fetchCurrentLocation: () => void;
    onOriginLoad: (autocomplete: any) => void;
    onOriginPlaceChanged: () => void;
    onDestLoad: (autocomplete: any) => void;
    onDestPlaceChanged: () => void;
    handleCheckRoute: (origin: string, dest: string) => void;
    isAnalyzing: boolean;
    locationAccuracy: number | null;
    error: string;
}

const RouteInputForm: React.FC<RouteInputFormProps> = ({
    isLoaded,
    fromLocation,
    setFromLocation,
    toLocation,
    setToLocation,
    fetchCurrentLocation,
    onOriginLoad,
    onOriginPlaceChanged,
    onDestLoad,
    onDestPlaceChanged,
    handleCheckRoute,
    isAnalyzing,
    locationAccuracy,
    error
}) => {
    return (
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
    );
};

export default RouteInputForm;
