import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, AlertTriangle, Mic, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL, API_KEY } from '@/config';
import { useRouteContext } from '@/context/RouteContext';
import './ChatAssistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isEmergency?: boolean;
  suggestedActions?: Array<{
    type: string;
    label: string;
    description?: string;
    priority?: string;
  }>;
}

interface JourneyContext {
  currentLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  destination?: {
    address: string;
    lat: number;
    lng: number;
  };
  activeRoute?: {
    summary: string;
    safetyScore: number;
    duration: string;
  };
  nearbyPlaces?: {
    hospitals: Array<any>;
    policeStations: Array<any>;
  };
  currentTime?: string;
  isNightTime?: boolean;
}

interface ChatAssistantProps {
  journeyContext?: JourneyContext;
  onEmergencyDetected?: (guidance: any) => void;
  onSOSRequested?: () => void;
  isMinimized?: boolean;
  isInPopup?: boolean; // New prop: true when inside NirvhayaPopup
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  journeyContext = {},
  onEmergencyDetected,
  onSOSRequested,
  isMinimized: initialMinimized = false,
  isInPopup = false // New prop
}) => {
  // Route Context Integration
  const { routeData, hasActiveRoute } = useRouteContext();

  // Merge RouteContext with journeyContext for comprehensive route awareness
  const enhancedJourneyContext = {
    ...journeyContext,
    ...(hasActiveRoute && {
      activeRoute: {
        summary: `${routeData.origin} → ${routeData.destination}`,
        safetyScore: routeData.safetyScore,
        duration: journeyContext.activeRoute?.duration || 'N/A',
        riskLevel: routeData.riskLevel,
        isNightTime: routeData.isNightTime,
        incidentCount: routeData.incidents?.length || 0
      },
      emergencyServices: {
        nearestHospital: routeData.nearestHospital,
        nearestPolice: routeData.nearestPolice
      }
    })
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm Nirbhaya, your AI safety companion. I'm here to help you navigate safely. Feel free to ask me anything about your route, potential safety concerns, or if you need guidance. Stay safe!`,
      timestamp: new Date().toISOString()
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech Recognition not supported in this browser');
      toast({
        title: 'Microphone Not Supported',
        description: 'Your browser does not support speech recognition. Try using Chrome, Edge, or Safari.',
        variant: 'destructive'
      });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN'; // Indian English for better results
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setMicError(false); // Reset error state when starting fresh
      toast({
        title: 'Listening...',
        description: 'Start speaking now',
      });
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimText('');
      setMicError(true);
      
      // Auto-recover from network errors after 2 seconds
      if (event.error === 'network') {
        setTimeout(() => setMicError(false), 2000);
      }
      
      let errorMsg = event.error;
      let title = 'Microphone Error';
      
      if (event.error === 'network') {
        errorMsg = 'Could not connect to speech recognition service. This is usually temporary. Please try again.';
        title = 'Speech Service Unavailable';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Please speak clearly and try again.';
      } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        errorMsg = 'Microphone permission denied. Please allow microphone access:\n1. Check browser permissions\n2. Go to Settings > Privacy > Microphone\n3. Allow this website';
        title = 'Microphone Permission Required';
      } else if (event.error === 'audio-capture') {
        errorMsg = 'No microphone device found. Please check your microphone connection.';
      } else if (event.error === 'bad-grammar') {
        errorMsg = 'Language configuration error. Please try again.';
      }
      
      toast({
        title: title,
        description: errorMsg,
        variant: 'destructive'
      });
    };

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Show interim text as user speaks
      if (interimTranscript) {
        setInterimText(interimTranscript);
      }
      
      if (finalTranscript) {
        setInputValue(prev => (prev + finalTranscript).trim());
        setInterimText(''); // Clear interim text once finalized
      }
    };
  }, []);

  // Initialize available voices for text-to-speech
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Log available voices for debugging
        const indianVoices = voices.filter(v => 
          v.lang.includes('hi') || v.lang.includes('en-IN')
        );
        console.log('Available voices:', voices.length);
        console.log('Indian voices:', indianVoices.length);
        indianVoices.forEach(v => console.log(`- ${v.name} (${v.lang})`));
      }
    };

    // Load voices when available
    loadVoices();
    
    // Some browsers load voices asynchronously
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSpeechVoice = () => {
    // If user has selected a specific voice, use that
    if (selectedVoiceIndex !== null && availableVoices[selectedVoiceIndex]) {
      return availableVoices[selectedVoiceIndex];
    }

    // Priority order for voice selection:
    // 1. Indian female voices (Hindi or English-India)
    // 2. Any Indian voice
    // 3. Female voices
    // 4. Default voice

    if (availableVoices.length === 0) return undefined;

    // Try to find Indian female voice
    let voice = availableVoices.find(v => 
      (v.lang.includes('hi') || v.lang.includes('en-IN')) && v.name.toLowerCase().includes('female')
    );

    if (voice) return voice;

    // Try any Indian female voice (different naming conventions)
    voice = availableVoices.find(v => 
      (v.lang.includes('hi') || v.lang.includes('en-IN')) && 
      (v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('girl'))
    );

    if (voice) return voice;

    // Try any Indian voice
    voice = availableVoices.find(v => 
      v.lang.includes('hi') || v.lang.includes('en-IN')
    );

    if (voice) return voice;

    // Try any female voice
    voice = availableVoices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('woman') ||
      v.name.toLowerCase().includes('girl')
    );

    if (voice) return voice;

    // Return first voice as fallback
    return availableVoices[0];
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Microphone Not Available',
        description: 'Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isListening) {
        // Stop listening
        recognitionRef.current.stop();
        setIsListening(false);
        setInterimText('');
      } else if (micError) {
        // Recovering from error - try to restart
        setMicError(false);
        setIsListening(false);
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
        // Wait a moment before restarting
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Error restarting speech recognition:', e);
          }
        }, 500);
      } else {
        // Start listening
        recognitionRef.current.start();
      }
    } catch (error) {
      console.error('Error with voice input:', error);
      setIsListening(false);
      setMicError(true);
      toast({
        title: 'Microphone Error',
        description: 'Could not start microphone. Please check permissions and try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue('');

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/navigation/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          journeyContext: enhancedJourneyContext,
          routeContext: hasActiveRoute ? {
            safetyScore: routeData.safetyScore,
            riskLevel: routeData.riskLevel,
            incidents: routeData.incidents,
            hospitals: routeData.nearestHospital,
            policeStation: routeData.nearestPolice,
            isNightTime: routeData.isNightTime
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle emergency detection
      if (data.isEmergency) {
        toast({
          title: '⚠️ EMERGENCY DETECTED',
          description: 'Nirbhaya is providing emergency guidance.',
          variant: 'destructive'
        });

        if (onEmergencyDetected) {
          onEmergencyDetected(data);
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        isEmergency: data.isEmergency,
        suggestedActions: data.suggestedActions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak response if available
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 0.9; // Slightly slower for clarity
        
        // Set the best available voice (preferring Indian female)
        const selectedVoice = getSpeechVoice();
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        utterance.pitch = 1.1; // Slightly higher pitch for female voice
        utterance.volume = 1.0; // Full volume
        
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get response from Nirbhaya',
        variant: 'destructive'
      });

      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or use the emergency features on the interface.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'SOS') {
      if (onSOSRequested) {
        onSOSRequested();
      }
      toast({
        title: 'SOS Alert',
        description: 'Preparing to send emergency alert to trusted contacts',
        variant: 'destructive'
      });
    } else if (action.type === 'SAFE_ROUTE') {
      setInputValue('Can you verify if my current route is safe?');
    } else if (action.type === 'EMERGENCY_SERVICES') {
      toast({
        title: 'Emergency Services',
        description: 'Please call 100 for immediate police assistance'
      });
    } else if (action.type === 'SAFE_PLACES') {
      setInputValue('Where are the nearest safe places near me?');
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (isMinimized && !isInPopup) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleMinimize}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Open Nirbhaya Chat"
        >
          <MessageCircle size={24} />
        </button>
      </div>
    );
  }

  // Main chat content
  return (
    <div className={`${isInPopup ? '' : 'fixed bottom-6 right-6'} w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">Nirbhaya</h3>
          <p className="text-sm opacity-90">Your AI Safety Companion</p>
        </div>
        <button
          onClick={toggleMinimize}
          className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
          aria-label="Minimize chat"
        >
          <X size={20} />
        </button>
      </div>

      {/* Voice Selection - Collapsible */}
      {availableVoices.length > 0 && (
        <div className="bg-purple-100 border-b border-purple-200 p-3">
          <details className="cursor-pointer">
            <summary className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              🎤 Voice ({availableVoices.length} available)
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto">
              <div className="space-y-1 text-xs">
                <button
                  onClick={() => setSelectedVoiceIndex(null)}
                  className={`w-full text-left px-2 py-1 rounded transition-colors ${
                    selectedVoiceIndex === null
                      ? 'bg-purple-500 text-white'
                      : 'hover:bg-purple-200 text-purple-900'
                  }`}
                >
                  🔄 Auto Select (Best Available)
                </button>
                {availableVoices.map((voice, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVoiceIndex(idx)}
                    className={`w-full text-left px-2 py-1 rounded transition-colors ${
                      selectedVoiceIndex === idx
                        ? 'bg-purple-500 text-white'
                        : 'hover:bg-purple-200 text-purple-900'
                    }`}
                    title={voice.name}
                  >
                    {voice.name} ({voice.lang})
                  </button>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Route Safety Summary - Display when active route exists */}
      {hasActiveRoute && (
        <div className="border-b border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-800">
            📍 Live Route Analysis
          </div>
          
          {/* Route Info */}
          <div className="text-xs text-gray-700 space-y-1">
            <div className="font-medium">{routeData.origin} → {routeData.destination}</div>
            
            {/* Safety Score Visual */}
            <div className="flex items-center gap-2">
              <span>Safety Score:</span>
              <div className="flex-1 bg-gray-300 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    (routeData.safetyScore || 0) >= 70
                      ? 'bg-green-500'
                      : (routeData.safetyScore || 0) >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${routeData.safetyScore || 0}%` }}
                />
              </div>
              <span className="font-semibold">{routeData.safetyScore || 0}/100</span>
            </div>

            {/* Risk Level & Time */}
            <div className="flex justify-between gap-2">
              <span className="inline-block px-2 py-1 bg-white rounded text-xs font-semibold"
                style={{
                  color: (routeData.riskLevel === 'Low Risk') ? '#059669' :
                         (routeData.riskLevel === 'Moderate Risk') ? '#d97706' : '#dc2626'
                }}>
                {routeData.riskLevel}
              </span>
              {routeData.isNightTime && (
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                  🌙 Night Travel (+30% Risk)
                </span>
              )}
            </div>

            {/* Emergency Services */}
            {(routeData.nearestHospital || routeData.nearestPolice) && (
              <div className="mt-2 pt-2 border-t border-orange-200 space-y-1">
                {routeData.nearestHospital && (
                  <div className="text-xs flex items-center gap-1">
                    <span>🏥</span>
                    <span>{routeData.nearestHospital.name?.substring(0, 30)}...</span>
                  </div>
                )}
                {routeData.nearestPolice && (
                  <div className="text-xs flex items-center gap-1">
                    <span>🚔</span>
                    <span>{routeData.nearestPolice.name?.substring(0, 30)}...</span>
                  </div>
                )}
              </div>
            )}

            {/* Incidents Count */}
            {routeData.incidents && routeData.incidents.length > 0 && (
              <div className="mt-2 text-xs font-semibold text-red-600">
                ⚠️ {routeData.incidents.length} incident(s) detected on this route
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, idx) => (
          <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-pink-500 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{message.content}</p>

              {/* Emergency Indicator */}
              {message.isEmergency && (
                <div className="mt-2 pt-2 border-t border-gray-300 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-600" />
                  <span className="text-xs font-semibold text-red-600">EMERGENCY MODE</span>
                </div>
              )}

              {/* Suggested Actions */}
              {message.suggestedActions && message.suggestedActions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 space-y-2">
                  {message.suggestedActions.map((action, actionIdx) => (
                    <button
                      key={actionIdx}
                      onClick={() => handleActionClick(action)}
                      className={`w-full text-xs py-1 px-2 rounded transition-colors ${
                        action.priority === 'CRITICAL'
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : action.priority === 'HIGH'
                          ? 'bg-orange-400 text-white hover:bg-orange-500'
                          : 'bg-blue-400 text-white hover:bg-blue-500'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border border-gray-200 rounded-lg rounded-bl-none px-4 py-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4 rounded-b-lg space-y-3">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Ask about route safety, express concerns..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-white text-gray-900 border border-gray-300 placeholder-gray-400"
            />
            {isListening && interimText && (
              <div className="absolute top-3 left-3 text-gray-500 text-sm italic pointer-events-none">
                {interimText}
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-pink-500 hover:bg-pink-600 text-white px-4"
          >
            <Send size={18} />
          </Button>
          <Button
            type="button"
            onClick={handleVoiceInput}
            disabled={isLoading || micError}
            className={`px-4 transition-all duration-200 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : micError
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={
              micError 
                ? 'Recovering from error...' 
                : isListening 
                  ? 'Listening... Click to stop' 
                  : 'Click to speak'
            }
          >
            <Mic size={18} className={isListening ? 'animate-bounce' : ''} />
          </Button>
        </form>
        {micError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
            Microphone service is recovering... If this persists, please try typing instead.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatAssistant;
