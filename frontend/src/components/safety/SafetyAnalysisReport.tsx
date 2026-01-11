import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, UserPlus, AlertTriangle, CheckCircle, Info, Navigation, Siren, Phone, Hospital, Share2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SafetyAnalysisReportProps {
    routeResult: any;
    allRoutes: any[];
    setRouteResult: (route: any) => void;
    trustedContacts: any[];
    setShowContactModal: (show: boolean) => void;
    isTracking: boolean;
    startTracking: () => void;
    stopTracking: () => void;
    handleShareLocation: () => void;
    handleSOS: () => void;
    sosActive: boolean;
    fromLocation: string;
    toLocation: string;
    isFullScreen: boolean;
}

const getRiskLabel = (score: number) => {
    if (score >= 80) return { label: 'LOW RISK', color: 'text-brand-teal', status: 'Safe Route' };
    if (score >= 50) return { label: 'MODERATE', color: 'text-yellow-500', status: 'Caution Advised' };
    return { label: 'HIGH RISK', color: 'text-red-500', status: 'Avoid if possible' };
};

const SafetyAnalysisReport: React.FC<SafetyAnalysisReportProps> = ({
    routeResult,
    allRoutes,
    setRouteResult,
    trustedContacts,
    setShowContactModal,
    isTracking,
    startTracking,
    stopTracking,
    handleShareLocation,
    handleSOS,
    sosActive,
    fromLocation,
    toLocation,
    isFullScreen
}) => {
    const [showAllIncidents, setShowAllIncidents] = useState(false);

    return (
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

            {/* Detailed Risk Report */}
            {routeResult.aiCrimeAnalysis && (
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg animate-fade-in-up">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Risk Analysis Report
                    </h3>

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

                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-between p-4 h-auto bg-white/5 border-white/10 hover:bg-white/10 text-left group transition-all duration-300"
                        onClick={() => {
                            const baseUrl = "https://www.google.com/maps/dir/?api=1";
                            const origin = encodeURIComponent(fromLocation || "Current Location");
                            const destination = encodeURIComponent(toLocation);
                            const travelMode = "driving";
                            const url = `${baseUrl}&origin=${origin}&destination=${destination}&travelmode=${travelMode}`;
                            window.open(url, '_blank');
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-blue-400" />
                            <span>Open in Google Maps</span>
                        </div>
                        <span className="text-white/40 text-xs group-hover:text-white/80 transition-colors">Start Navigation &rarr;</span>
                    </Button>

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
    );
};

export default SafetyAnalysisReport;
