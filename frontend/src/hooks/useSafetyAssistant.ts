import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, API_KEY } from '@/config';
import { toast } from './use-toast';

/**
 * Hook for managing voice-based interaction with MargRakshak
 * Handles speech recognition and text-to-speech
 */
export const useVoiceInteraction = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast({
        title: 'Microphone Error',
        description: event.error,
        variant: 'destructive'
      });
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const isFinal = event.results[i].isFinal;
        const trans = event.results[i][0].transcript;
        if (isFinal) {
          setTranscript(prev => (prev + trans).trim());
        } else {
          interim += trans;
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
};

/**
 * Hook for Smart Safety Mode
 * Monitors journey and provides proactive safety alerts
 */
export const useSmartSafetyMode = (
  isActive: boolean = false,
  journeyContext?: any
) => {
  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(isActive);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeSafety = useCallback(async () => {
    if (!journeyContext || !journeyContext.activeRoute) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/navigation/analyze-journey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          route: journeyContext.activeRoute,
          currentTime: new Date().toISOString(),
          userLocation: journeyContext.currentLocation,
          destination: journeyContext.destination,
          areasOfConcern: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.analysis) {
          setSafetyAlerts([...safetyAlerts, {
            message: data.analysis,
            timestamp: new Date().toISOString()
          }]);

          setLastAnalysisTime(Date.now());
        }
      }
    } catch (error) {
      console.error('Smart Safety analysis error:', error);
    }
  }, [journeyContext, safetyAlerts]);

  useEffect(() => {
    if (!isActive || !journeyContext) return;

    setIsMonitoring(true);

    // Analyze safety every 60 seconds
    monitoringIntervalRef.current = setInterval(() => {
      analyzeSafety();
    }, 60000);

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [isActive, journeyContext, analyzeSafety]);

  const toggleMonitoring = useCallback((active: boolean) => {
    setIsMonitoring(active);
    if (!active && monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setSafetyAlerts([]);
  }, []);

  return {
    safetyAlerts,
    isMonitoring,
    toggleMonitoring,
    clearAlerts,
    lastAnalysisTime,
    analyzeSafety
  };
};

/**
 * Hook for checking time-based safety risks
 */
export const useTimBasedSafetyCheck = (location?: { lat: number; lng: number }) => {
  const [riskWarning, setRiskWarning] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkRisk = useCallback(async () => {
    if (!location) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/navigation/time-based-risk?lat=${location.lat}&lng=${location.lng}`,
        {
          headers: {
            'x-api-key': API_KEY
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRiskWarning(data);

        if (data.hasWarning) {
          toast({
            title: '⚠️ Safety Warning',
            description: data.message,
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Time-based risk check error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  return {
    riskWarning,
    isLoading,
    checkRisk
  };
};

/**
 * Hook for managing emergency detection and response
 */
export const useEmergencyResponse = () => {
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyGuidance, setEmergencyGuidance] = useState<any>(null);

  const triggerEmergency = useCallback(async (message: string, journeyContext?: any) => {
    setIsEmergency(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/navigation/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          message,
          journeyContext
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEmergencyGuidance(data);

        // Play alarm or alert tone
        playEmergencyAlert();

        toast({
          title: '🚨 EMERGENCY MODE ACTIVATED',
          description: 'Follow the guidance provided and contact emergency services if needed.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Emergency trigger error:', error);
    }
  }, []);

  const playEmergencyAlert = () => {
    // Use Web Audio API to play a beep/alert
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz beep
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play emergency alert:', error);
    }
  };

  const clearEmergency = useCallback(() => {
    setIsEmergency(false);
    setEmergencyGuidance(null);
  }, []);

  return {
    isEmergency,
    emergencyGuidance,
    triggerEmergency,
    clearEmergency
  };
};
