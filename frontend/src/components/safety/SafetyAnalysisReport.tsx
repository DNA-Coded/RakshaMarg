import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, UserPlus, AlertTriangle, CheckCircle, Info, Navigation, Siren, Phone, Hospital, Share2, CloudSun, Wind, Sun, CloudRain, Zap, CloudFog, ThermometerSun } from 'lucide-react';
import { createPortal } from 'react-dom';
import { WeatherAlert, WeatherSnapshot } from '@/services/navigation';

interface SafetyAnalysisReportProps {
    routeResult: any;
    allRoutes: any[];
    setRouteResult: (route: any) => void;
    trustedContacts: any[];
    setShowContactModal: (show: boolean) => void;
    trackingError: string | null;
    isGpsSignalLost: boolean;
    isRouteUpdatesPaused: boolean;
    nearestHospital: {
        name: string;
        address: string;
        distanceMeters: number;
        formattedPhoneNumber?: string;
    } | null;
    nearestPoliceStation: {
        name: string;
        address: string;
        distanceMeters: number;
        formattedPhoneNumber?: string;
    } | null;
    currentWeather: WeatherSnapshot | null;
    weatherAlerts: WeatherAlert[];
    weatherUpdatedAt: string | null;
    weatherStatus: string;
    weatherReason: string | null;
    isTracking: boolean;
    handleShareLocation: () => void;
    handleSOS: () => void;
    sosActive: boolean;
    isSosSending: boolean;
    fromLocation: string;
    toLocation: string;
    isFullScreen: boolean;
}

const getRiskLabel = (score: number) => {
    if (score >= 80) return { label: 'LOW RISK', color: 'text-brand-teal', status: 'Safe Route' };
    if (score >= 50) return { label: 'MODERATE', color: 'text-yellow-500', status: 'Caution Advised' };
    return { label: 'HIGH RISK', color: 'text-red-500', status: 'Avoid if possible' };
};

const severityRank: Record<string, number> = {
    none: 0,
    low: 1,
    moderate: 2,
    severe: 3,
    extreme: 4,
};

const getHighestWeatherSeverity = (alerts: WeatherAlert[]) => {
    return alerts.reduce((highest, alert) => {
        const current = String(alert.severity || 'none').toLowerCase();
        return (severityRank[current] || 0) > (severityRank[highest] || 0) ? current : highest;
    }, 'none');
};

const getWeatherSeverityStyles = (severity: string) => {
    switch (severity) {
        case 'extreme':
            return 'border-red-500/40 bg-red-500/20 text-red-100';
        case 'severe':
            return 'border-orange-500/40 bg-orange-500/20 text-orange-100';
        case 'moderate':
            return 'border-amber-500/40 bg-amber-500/20 text-amber-100';
        case 'low':
            return 'border-sky-500/40 bg-sky-500/20 text-sky-100';
        default:
            return 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100';
    }
};

const getWeatherAlertIcon = (type: string) => {
    const normalized = String(type || '').toLowerCase();

    if (normalized.includes('thunder')) return Zap;
    if (normalized.includes('rain') || normalized.includes('flood')) return CloudRain;
    if (normalized.includes('visibility') || normalized.includes('fog')) return CloudFog;
    if (normalized.includes('wind')) return Wind;
    if (normalized.includes('temperature') || normalized.includes('heat')) return ThermometerSun;
    return Sun;
};

const getConditionIcon = (condition: string) => {
    const normalized = String(condition || '').toLowerCase();

    if (normalized.includes('thunder')) return Zap;
    if (normalized.includes('rain') || normalized.includes('drizzle')) return CloudRain;
    if (normalized.includes('visibility') || normalized.includes('fog') || normalized.includes('haze')) return CloudFog;
    if (normalized.includes('wind')) return Wind;
    if (normalized.includes('clear') || normalized.includes('sun')) return Sun;

    return CloudSun;
};

const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    const timeMs = new Date(timestamp).getTime();

    if (!Number.isFinite(timeMs)) return null;

    const deltaMs = Date.now() - timeMs;
    const minutes = Math.floor(deltaMs / 60000);

    if (minutes <= 0) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
};

const SafetyAnalysisReport: React.FC<SafetyAnalysisReportProps> = ({
    routeResult,
    allRoutes,
    setRouteResult,
    trustedContacts,
    setShowContactModal,
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
    isTracking,
    handleShareLocation,
    handleSOS,
    sosActive,
    isSosSending,
    fromLocation,
    toLocation,
    isFullScreen
}) => {
    const [showAllIncidents, setShowAllIncidents] = useState(false);
    const [relativeUpdatedAt, setRelativeUpdatedAt] = useState<string | null>(formatRelativeTime(weatherUpdatedAt));
    const [isSeverityEscalated, setIsSeverityEscalated] = useState(false);
    const previousWeatherSeverityRef = useRef('none');

    if (!routeResult) return null;
    const safeAllRoutes = allRoutes || [];
    const safestRoute = safeAllRoutes.length > 0 
        ? safeAllRoutes.reduce((prev, current) => 
            (current.safety_score > prev.safety_score) ? current : prev
          )
        : null;
    const policeSupport = nearestPoliceStation || routeResult?.emergencySupport?.police || null;
    const hospitalSupport = nearestHospital || routeResult?.emergencySupport?.hospital || null;

    const policeDistanceLabel = nearestPoliceStation
        ? `${Math.round(nearestPoliceStation.distanceMeters)}m away`
        : null;

    const hospitalDistanceLabel = nearestHospital
        ? `${Math.round(nearestHospital.distanceMeters)}m away`
        : null;

    const policePhone = nearestPoliceStation?.formattedPhoneNumber || routeResult?.emergencySupport?.police?.formatted_phone_number || '100';
    const hospitalPhone = nearestHospital?.formattedPhoneNumber || routeResult?.emergencySupport?.hospital?.formatted_phone_number || '108';
    const isUsingLiveEmergencyData = Boolean(nearestHospital || nearestPoliceStation);
    const etaText = routeResult?.legs?.[0]?.duration?.text || routeResult?.duration || 'N/A';
    const hasWeatherAlerts = weatherAlerts.length > 0;
    const highestSeverity = getHighestWeatherSeverity(weatherAlerts);
    const weatherUpdatedTimeMs = weatherUpdatedAt ? new Date(weatherUpdatedAt).getTime() : null;
    const isWeatherDataStale = Boolean(weatherUpdatedTimeMs && Date.now() - weatherUpdatedTimeMs > 5 * 60 * 1000);
    const weatherStatusLabel = (() => {
        if (!isTracking) return 'Monitoring Off';
        if (weatherStatus === 'error') return 'Unavailable';
        if (weatherStatus === 'unavailable') return 'Unavailable';
        if (isWeatherDataStale) return 'Stale';
        return hasWeatherAlerts ? 'Active Alerts' : 'Clear';
    })();

    useEffect(() => {
        setRelativeUpdatedAt(formatRelativeTime(weatherUpdatedAt));

        if (!weatherUpdatedAt) {
            return;
        }

        const timerId = window.setInterval(() => {
            setRelativeUpdatedAt(formatRelativeTime(weatherUpdatedAt));
        }, 30000);

        return () => window.clearInterval(timerId);
    }, [weatherUpdatedAt]);

    useEffect(() => {
        const previous = previousWeatherSeverityRef.current;
        const isEscalated = (severityRank[highestSeverity] || 0) > (severityRank[previous] || 0);

        if (isEscalated && highestSeverity !== 'none') {
            setIsSeverityEscalated(true);
            const timeoutId = window.setTimeout(() => setIsSeverityEscalated(false), 1800);
            previousWeatherSeverityRef.current = highestSeverity;
            return () => window.clearTimeout(timeoutId);
        }

        previousWeatherSeverityRef.current = highestSeverity;
    }, [highestSeverity]);

    return (
        <div className={`space-y-4 transition-all duration-500 ${isFullScreen ? 'lg:col-span-5' : 'lg:col-span-2'}`}>
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
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className={`text-2xl font-bold ${getRiskLabel(routeResult.safety_score).color}`}>
                            {getRiskLabel(routeResult.safety_score).label}
                        </div>
                        <div className="rounded-full border border-brand-teal/40 bg-brand-teal/10 px-3 py-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-teal">ETA</span>
                            <span className="ml-2 text-sm font-bold text-white">{etaText}</span>
                        </div>
                    </div>
                    <div className="text-sm text-white/50">{getRiskLabel(routeResult.safety_score).status}</div>
                </div>
            </div>

            <div className={`bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg transition-all duration-500 ${isSeverityEscalated ? 'ring-2 ring-orange-400/40 shadow-orange-500/20' : ''}`}>
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                        <CloudSun className="w-4 h-4 text-brand-teal" />
                        Weather Alerts
                    </h3>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${getWeatherSeverityStyles(highestSeverity)}`}>
                        {weatherStatusLabel}
                    </span>
                </div>

                {currentWeather ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const ConditionIcon = getConditionIcon(currentWeather.condition || currentWeather.conditionLabel);
                                    return <ConditionIcon className="h-4 w-4 text-white/80" />;
                                })()}
                                <div>
                                <p className="text-sm font-semibold text-white">{currentWeather.conditionLabel}</p>
                                <p className="text-xs text-white/60">{Math.round(currentWeather.temperatureC)}°C · {Math.round(currentWeather.rainfallMm)} mm rain · {Math.round(currentWeather.windSpeedKmh)} km/h wind</p>
                                </div>
                            </div>
                            <Wind className="h-4 w-4 text-white/70" />
                        </div>
                        {weatherUpdatedAt && (
                            <p className="mt-2 text-[11px] text-white/40">
                                Updated {new Date(weatherUpdatedAt).toLocaleTimeString()}
                                {relativeUpdatedAt ? ` (${relativeUpdatedAt})` : ''}
                            </p>
                        )}
                        {isWeatherDataStale && (
                            <p className="mt-1 text-[11px] text-amber-200">Data is older than 5 minutes. Refreshing on movement.</p>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-sm text-white/70">
                            {!isTracking
                                ? 'Weather monitoring starts when live tracking is active.'
                                : weatherStatus === 'error' || weatherStatus === 'unavailable'
                                    ? weatherReason === 'invalid_api_key'
                                        ? 'Weather provider key is not active yet. Retrying automatically.'
                                        : 'Weather service is temporarily unavailable.'
                                    : 'Waiting for live weather updates...'}
                        </p>
                    </div>
                )}

                {hasWeatherAlerts && (
                    <div className="mt-3 space-y-2">
                        {weatherAlerts.slice(0, 3).map((alert, index) => (
                            <div key={`${alert.type}-${index}`} className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
                                <div className="flex items-start gap-2">
                                    {(() => {
                                        const AlertIcon = getWeatherAlertIcon(alert.type);
                                        return <AlertIcon className="mt-0.5 h-4 w-4 text-amber-200" />;
                                    })()}
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">{alert.severity} · {alert.title}</p>
                                        <p className="mt-1 text-sm text-amber-50/90">{alert.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
            {safeAllRoutes.length > 1 && (
                <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg mt-4">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-brand-purple" />
                        Alternative Routes
                    </h3>
                    <div className="space-y-2">
                        {safeAllRoutes.map((route, idx) => {
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

            {/* Open in Google Maps Button */}
            <Button
                variant="outline"
                className="w-full flex items-center justify-between p-4 h-auto bg-white/5 border-white/10 hover:bg-white/10 text-left group transition-all duration-300 mt-4 shadow-lg"
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

            {/* Trusted Contacts Button */}
            <Button
                onClick={() => setShowContactModal(true)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl h-12 flex items-center justify-between px-4"
            >
                <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-brand-teal" />
                    <span>Trusted Contacts</span>
                </div>
                <span className="bg-white/10 text-xs px-2 py-1 rounded-full">{trustedContacts.length} Added</span>
            </Button>

            {/* Safety Warning for Alternative Selection */}
            {safestRoute && routeResult !== safestRoute && routeResult.safety_score < safestRoute.safety_score && (
                <div className="bg-red-500/10 rounded-3xl p-5 border border-red-500/20 shadow-lg mt-4 animate-pulse">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                        <div>
                            <h3 className="text-sm font-bold text-red-200 uppercase tracking-wider mb-1">
                                Caution: Safer Route Available
                            </h3>
                            <p className="text-sm text-red-100/70 leading-relaxed">
                                You have selected a route with a <strong>lower safety score ({routeResult.safety_score})</strong> than the recommended option ({safestRoute.safety_score}).
                                Risk factors like lighting issues may be higher here.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="mt-3 bg-red-500/20 border-red-500/30 text-red-100 hover:bg-red-500/30"
                                onClick={() => setRouteResult(safestRoute)}
                            >
                                Switch to Safest Route
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nearest Emergency Services (Replaces Safer Alternative) */}
            <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg">
                <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                        <Siren className="w-4 h-4 text-brand-purple" />
                        Emergency Support Nearby
                    </h3>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${isUsingLiveEmergencyData ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100' : 'border-white/20 bg-white/10 text-white/70'}`}>
                        {isUsingLiveEmergencyData ? 'Live' : 'Route Data'}
                    </span>
                </div>

                <div className="space-y-3">
                    {/* Police Station */}
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                                <Shield className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white max-w-[150px] truncate" title={policeSupport?.name}>
                                    {policeSupport?.name || 'Nearest Police Station'}
                                </p>
                                <p className="text-xs text-white/50 truncate max-w-[160px]">
                                    {policeSupport?.address || 'Location Verified'}
                                </p>
                                {policeDistanceLabel && (
                                    <p className="text-[11px] text-blue-200/80 mt-0.5">{policeDistanceLabel}</p>
                                )}
                            </div>
                        </div>
                        <a href={`tel:${policePhone}`}>
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
                                <p className="text-sm font-bold text-white max-w-[150px] truncate" title={hospitalSupport?.name}>
                                    {hospitalSupport?.name || 'Nearest Hospital'}
                                </p>
                                <p className="text-xs text-white/50 truncate max-w-[160px]">
                                    {hospitalSupport?.address || 'Location Verified'}
                                </p>
                                {hospitalDistanceLabel && (
                                    <p className="text-[11px] text-red-200/80 mt-0.5">{hospitalDistanceLabel}</p>
                                )}
                            </div>
                        </div>
                        <a href={`tel:${hospitalPhone}`}>
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
                disabled={isSosSending || sosActive}
                className={`w-full h-16 ${isSosSending ? 'bg-red-600 animate-pulse' : sosActive ? 'bg-red-600' : 'bg-red-500 hover:bg-red-600'} text-white rounded-2xl text-lg font-bold shadow-2xl shadow-red-500/50 border-2 border-red-400`}
            >
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6" />
                    <span>{isSosSending ? '🚨 SENDING SOS...' : sosActive ? '🚨 SOS ACTIVE' : '🆘 EMERGENCY SOS'}</span>
                </div>
            </Button>

            {/* Route Tracking Controls */}
            {(trackingError || isGpsSignalLost || isRouteUpdatesPaused) && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-200">Tracking Status</p>
                    <p className="mt-1 text-sm text-yellow-100/90">
                        {trackingError || (isGpsSignalLost ? 'GPS signal is currently weak.' : 'Live route updates are paused.')}
                    </p>
                </div>
            )}

            <div>
                <Button
                    onClick={handleShareLocation}
                    className="w-full h-14 bg-gradient-to-r from-brand-teal/20 to-brand-purple/20 hover:from-brand-teal/30 hover:to-brand-purple/30 border border-brand-teal/30 text-white rounded-2xl font-bold shadow-lg"
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
