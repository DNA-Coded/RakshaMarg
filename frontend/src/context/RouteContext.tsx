import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface RouteContextData {
  origin: string | null;
  destination: string | null;
  safetyScore: number | null;
  riskLevel: 'Low Risk' | 'Moderate Risk' | 'High Risk' | null;
  incidents: any[] | null;
  nearestHospital: any | null;
  nearestPolice: any | null;
  isNightTime: boolean;
  routes: any[] | null;
}

interface RouteContextType {
  routeData: RouteContextData;
  setRouteData: (data: RouteContextData) => void;
  clearRouteData: () => void;
  hasActiveRoute: boolean;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routeData, setRouteData] = useState<RouteContextData>({
    origin: null,
    destination: null,
    safetyScore: null,
    riskLevel: null,
    incidents: null,
    nearestHospital: null,
    nearestPolice: null,
    isNightTime: false,
    routes: null,
  });

  const clearRouteData = useCallback(() => {
    setRouteData((prev) => {
      const alreadyCleared =
        prev.origin === null &&
        prev.destination === null &&
        prev.safetyScore === null &&
        prev.riskLevel === null &&
        prev.incidents === null &&
        prev.nearestHospital === null &&
        prev.nearestPolice === null &&
        prev.isNightTime === false &&
        prev.routes === null;

      if (alreadyCleared) {
        return prev;
      }

      return {
        origin: null,
        destination: null,
        safetyScore: null,
        riskLevel: null,
        incidents: null,
        nearestHospital: null,
        nearestPolice: null,
        isNightTime: false,
        routes: null,
      };
    });
  }, []);

  const hasActiveRoute = routeData.origin !== null && routeData.destination !== null;

  const contextValue = useMemo(
    () => ({ routeData, setRouteData, clearRouteData, hasActiveRoute }),
    [routeData, clearRouteData, hasActiveRoute]
  );

  return (
    <RouteContext.Provider value={contextValue}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteContext must be used within RouteProvider');
  }
  return context;
};
