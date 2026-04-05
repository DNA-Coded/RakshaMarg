import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  Command,
  Copy,
  FileUp,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  SidebarClose,
  SidebarOpen,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from '@/hooks/use-toast';
import { buildNavigationApiUrl } from '@/config';
import { getAuthHeaders } from '@/lib/apiHeaders';
import { useRouteContext } from '@/context/RouteContext';
import nirbhayaLogo from '@/assets/nirbhaya_bot_img.png';
import './ChatAssistant.css';

interface Message {
  id: string;
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
  isInPopup?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  messageIndex: number;
}

const SUGGESTIONS = [
  'Is this route safe right now?',
  'Show nearby police stations',
  'What should I do in an emergency?',
  'Suggest safer alternatives',
];

const COMMANDS = [
  { id: 'new-chat', label: 'Start New Chat', hint: 'Ctrl+Shift+N' },
  { id: 'focus-input', label: 'Focus Input', hint: '/' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', hint: 'Ctrl+B' },
  { id: 'toggle-mute', label: 'Toggle Voice', hint: 'M' },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const POPUP_MESSAGES_STORAGE_KEY = 'nirvhaya.popup.messages.v1';

const createWelcomeMessage = (): Message => ({
  id: makeId(),
  role: 'assistant',
  content:
    "Hi! I'm Nirbhaya, your AI safety companion. I can assess your route, flag risks, and guide you with calm step-by-step help.",
  timestamp: new Date().toISOString(),
});

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDay = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const shouldShowDivider = (current: Message, previous?: Message) => {
  if (!previous) return true;

  const currentDate = new Date(current.timestamp);
  const previousDate = new Date(previous.timestamp);
  const isDifferentDay = currentDate.toDateString() !== previousDate.toDateString();
  const diffMinutes = Math.abs(currentDate.getTime() - previousDate.getTime()) / (1000 * 60);

  return isDifferentDay || diffMinutes >= 20;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  journeyContext = {},
  onEmergencyDetected,
  onSOSRequested,
  isMinimized: initialMinimized = false,
  isInPopup = false,
}) => {
  const { routeData, hasActiveRoute } = useRouteContext();

  const enhancedJourneyContext = {
    ...journeyContext,
    ...(hasActiveRoute && {
      activeRoute: {
        summary: `${routeData.origin} -> ${routeData.destination}`,
        safetyScore: routeData.safetyScore,
        duration: journeyContext.activeRoute?.duration || 'N/A',
        riskLevel: routeData.riskLevel,
        isNightTime: routeData.isNightTime,
        incidentCount: routeData.incidents?.length || 0,
      },
      emergencyServices: {
        nearestHospital: routeData.nearestHospital,
        nearestPolice: routeData.nearestPolice,
      },
    }),
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    if (!isInPopup || typeof window === 'undefined') {
      return [createWelcomeMessage()];
    }

    try {
      const raw = window.localStorage.getItem(POPUP_MESSAGES_STORAGE_KEY);
      if (!raw) {
        return [createWelcomeMessage()];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [createWelcomeMessage()];
      }

      const restored = parsed
        .filter(item => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
        .map(item => ({
          id: typeof item.id === 'string' ? item.id : makeId(),
          role: item.role,
          content: item.content,
          timestamp:
            typeof item.timestamp === 'string' ? item.timestamp : new Date().toISOString(),
          isEmergency: Boolean(item.isEmergency),
          suggestedActions: Array.isArray(item.suggestedActions) ? item.suggestedActions : undefined,
        })) as Message[];

      return restored.length > 0 ? restored : [createWelcomeMessage()];
    } catch {
      return [createWelcomeMessage()];
    }
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRouteMinimized, setIsRouteMinimized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isInPopup);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(40);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [quotaRetrySeconds, setQuotaRetrySeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isMutedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePlaceholder = SUGGESTIONS[0];
  const isDesktopExperience = !isInPopup;
  const isQuotaCoolingDown = quotaRetrySeconds > 0;

  const chatHistory = useMemo(() => {
    const grouped: Array<{ id: string; title: string; preview: string; time: string }> = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        grouped.push({
          id: messages[i].id,
          title: messages[i].content.slice(0, 34) || 'Untitled chat',
          preview: messages[i + 1]?.content?.slice(0, 48) || 'No assistant response yet',
          time: formatTime(messages[i].timestamp),
        });
      }
      if (grouped.length >= 16) break;
    }

    return grouped;
  }, [messages]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return chatHistory;
    return chatHistory.filter(item =>
      `${item.title} ${item.preview}`.toLowerCase().includes(historySearch.toLowerCase()),
    );
  }, [chatHistory, historySearch]);

  const visibleMessages = useMemo(() => messages.slice(-visibleCount), [messages, visibleCount]);

  useEffect(() => {
    if (quotaRetrySeconds <= 0) return;

    const timer = window.setInterval(() => {
      setQuotaRetrySeconds(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [quotaRetrySeconds]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [inputValue, interimText]);

  useEffect(() => {
    isMutedRef.current = isMuted;

    if (isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (isDesktopExperience && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }

      if (isDesktopExperience && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarOpen(prev => !prev);
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleNewChat();
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'textarea' && tag !== 'input') {
          event.preventDefault();
          textareaRef.current?.focus();
        }
      }

      if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== 'textarea' && tag !== 'input') {
          setIsMuted(prev => !prev);
        }
      }

      if (event.key === 'Escape') {
        setContextMenu(null);
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isDesktopExperience]);

  useEffect(() => {
    if (isInPopup) {
      setSidebarOpen(false);
      setCommandPaletteOpen(false);
    }
  }, [isInPopup]);

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);

    return () => window.removeEventListener('click', closeMenu);
  }, [contextMenu]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN';
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setMicError(false);
      toast({
        title: 'Listening...',
        description: 'Speak naturally. Nirbhaya will transcribe your voice.',
      });
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current.onerror = (event: any) => {
      setIsListening(false);
      setInterimText('');
      setMicError(true);

      if (event.error === 'network') {
        setTimeout(() => setMicError(false), 2000);
      }

      toast({
        title: 'Microphone Error',
        description:
          event.error === 'not-allowed' || event.error === 'permission-denied'
            ? 'Microphone permission denied. Please allow microphone access and retry.'
            : 'Voice input is temporarily unavailable. You can continue typing.',
        variant: 'destructive',
      });
    };

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
      }

      if (finalTranscript) {
        setInputValue(prev => `${prev}${finalTranscript}`.trim());
        setInterimText('');
      }
    };
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }
    };

    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isThinking]);

  useEffect(() => {
    if (!isInPopup || typeof window === 'undefined') return;

    try {
      // Keep only recent messages to avoid unbounded localStorage growth.
      window.localStorage.setItem(
        POPUP_MESSAGES_STORAGE_KEY,
        JSON.stringify(messages.slice(-200)),
      );
    } catch {
      // Ignore storage errors gracefully (private mode/quota limits).
    }
  }, [messages, isInPopup]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const nearBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight) < 120;

    const shouldShow = !nearBottom;
    setShowScrollBottom(prev => (prev === shouldShow ? prev : shouldShow));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getSpeechVoice = () => {
    if (selectedVoiceIndex !== null && availableVoices[selectedVoiceIndex]) {
      return availableVoices[selectedVoiceIndex];
    }

    if (availableVoices.length === 0) return undefined;

    const indianFemale = availableVoices.find(
      voice =>
        (voice.lang.includes('hi') || voice.lang.includes('en-IN')) &&
        (voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('girl')),
    );

    if (indianFemale) return indianFemale;

    const indianVoice = availableVoices.find(
      voice => voice.lang.includes('hi') || voice.lang.includes('en-IN'),
    );

    return indianVoice || availableVoices[0];
  };

  const speakIfEnabled = (text: string) => {
    if (isMutedRef.current || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_~`#>-]/g, '').trim());
    const selectedVoice = getSpeechVoice();

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.08;
    utterance.volume = 1.0;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const streamAssistantMessage = async (
    responseText: string,
    options?: {
      isEmergency?: boolean;
      suggestedActions?: Message['suggestedActions'];
    },
  ) => {
    const text = responseText || '';
    const id = makeId();
    const timestamp = new Date().toISOString();

    setMessages(prev => [
      ...prev,
      {
        id,
        role: 'assistant',
        content: '',
        timestamp,
        isEmergency: options?.isEmergency,
        suggestedActions: options?.suggestedActions,
      },
    ]);

    setStreamingMessageId(id);

    // Keep streaming lightweight to avoid UI jank on long responses.
    const maxSteps = 24;
    const steps = Math.min(maxSteps, Math.max(8, Math.ceil(text.length / 85)));
    const chunkSize = Math.max(1, Math.ceil(text.length / steps));

    for (let i = chunkSize; i <= text.length; i += chunkSize) {
      const chunk = text.slice(0, i);
      setMessages(prev =>
        prev.map(message => (message.id === id ? { ...message, content: chunk } : message)),
      );
      await sleep(20);
    }

    setMessages(prev =>
      prev.map(message =>
        message.id === id ? { ...message, content: text } : message,
      ),
    );

    setStreamingMessageId(null);
  };

  const fetchAssistantResponse = async (
    userMessage: string,
    history: Message[],
  ) => {
    const requestBody = {
      message: userMessage,
      conversationHistory: history.map(item => ({ role: item.role, content: item.content })),
      journeyContext: enhancedJourneyContext,
      routeContext: hasActiveRoute
        ? {
            safetyScore: routeData.safetyScore,
            riskLevel: routeData.riskLevel,
            incidents: routeData.incidents,
            hospitals: routeData.nearestHospital,
            policeStation: routeData.nearestPolice,
            isNightTime: routeData.isNightTime,
          }
        : undefined,
    };

    const transientStatuses = new Set([502, 503, 504]);
    let response: Response | null = null;
    let networkError: unknown = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(buildNavigationApiUrl('/chat'), {
          method: 'POST',
          headers: await getAuthHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(requestBody),
        });

        // Retry transient upstream errors that commonly happen while Render wakes up.
        if (!response.ok && transientStatuses.has(response.status) && attempt < 3) {
          await sleep(2000 * attempt);
          continue;
        }

        break;
      } catch (error) {
        networkError = error;
        if (attempt < 3) {
          await sleep(2000 * attempt);
          continue;
        }
      }
    }

    if (!response) {
      throw new Error(`Network request failed: ${networkError instanceof Error ? networkError.message : 'Unknown network error'}`);
    }

    if (!response.ok) {
      let details = '';

      try {
        const raw = await response.text();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            details =
              parsed?.message || parsed?.error || parsed?.details || JSON.stringify(parsed);
          } catch {
            details = raw;
          }
        }
      } catch {
        details = '';
      }

      const message = details
        ? `API ${response.status}: ${details}`
        : `API ${response.status}: ${response.statusText}`;

      const isQuotaError = /quota exceeded|rate limit|resource_exhausted|\b429\b/i.test(message);
      if (isQuotaError) {
        const retryMatch =
          message.match(/retry(?:\s+in)?\s+([0-9]+(?:\.[0-9]+)?)s/i) ||
          message.match(/seconds:\s*([0-9]+)/i);
        const retrySeconds = retryMatch
          ? Math.max(1, Math.ceil(Number(retryMatch[1])))
          : 60;
        throw new Error(`QUOTA_EXCEEDED::${retrySeconds}`);
      }

      throw new Error(message);
    }

    return response.json();
  };

  const sendMessage = async (userMessage: string, appendUser = true) => {
    if (!userMessage.trim() || isQuotaCoolingDown) return;

    let updatedHistory = messages;

    if (appendUser) {
      const newUserMessage: Message = {
        id: makeId(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      updatedHistory = [...messages, newUserMessage];
      setMessages(updatedHistory);
    }

    setInputValue('');
    setUploadedFileName('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      const data = await fetchAssistantResponse(userMessage, updatedHistory);

      if (data.isEmergency) {
        toast({
          title: 'Emergency mode activated',
          description: 'Nirbhaya detected urgent intent and generated safety guidance.',
          variant: 'destructive',
        });

        onEmergencyDetected?.(data);
      }

      const assistantMessage: Message = {
        id: makeId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        isEmergency: data.isEmergency,
        suggestedActions: data.suggestedActions,
      };
      setMessages(prev => [...prev, assistantMessage]);

      speakIfEnabled(data.response);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorText = error instanceof Error ? error.message : 'Unknown error';
      const quotaTokenMatch = errorText.match(/^QUOTA_EXCEEDED::([0-9]+)/i);
      const quotaMatch = errorText.match(/retry(?:\s+in)?\s+([0-9]+(?:\.[0-9]+)?)s/i);
      const isQuotaError =
        Boolean(quotaTokenMatch) ||
        /quota exceeded|api 429|rate limit|resource_exhausted/i.test(errorText);

      if (isQuotaError) {
        const retrySeconds = quotaTokenMatch
          ? Math.max(1, Number(quotaTokenMatch[1]))
          : quotaMatch
            ? Math.max(1, Math.ceil(Number(quotaMatch[1])))
            : 60;
        setQuotaRetrySeconds(retrySeconds);
      }

      const userFacingError = isQuotaError
        ? `Gemini quota reached. Please retry in ${quotaTokenMatch ? quotaTokenMatch[1] : quotaMatch ? Math.max(1, Math.ceil(Number(quotaMatch[1]))) : 60}s.`
        : 'Could not contact assistant. Please try again.';

      toast({
        title: isQuotaError ? 'AI quota reached' : 'Connection issue',
        description: userFacingError,
        variant: 'destructive',
      });

      const fallbackError: Message = {
        id: makeId(),
        role: 'assistant',
        content: isQuotaError
          ? 'AI quota is temporarily exhausted. Please wait for the cooldown timer and then try again.'
          : 'I ran into a temporary error. Please retry, or use emergency actions if you need immediate help.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, fallbackError]);
    } finally {
      setIsThinking(false);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendMessage(inputValue, true);
  };

  const handleRegenerate = async (messageIndex: number) => {
    const previousUser = [...messages]
      .slice(0, messageIndex)
      .reverse()
      .find(item => item.role === 'user');

    if (!previousUser || isLoading) {
      toast({
        title: 'Regenerate unavailable',
        description: 'No user prompt found to regenerate this response.',
      });
      return;
    }

    await sendMessage(previousUser.content, false);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Message copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy this message.', variant: 'destructive' });
    }
  };

  const handleShare = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Nirbhaya Chat',
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Copied for sharing', description: 'Message copied to clipboard.' });
      }
    } catch {
      toast({ title: 'Share cancelled', description: 'No message was shared.' });
    }
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'SOS') {
      onSOSRequested?.();
      toast({
        title: 'SOS Trigger Requested',
        description: 'Preparing emergency alert to trusted contacts.',
        variant: 'destructive',
      });
      return;
    }

    if (action.type === 'SAFE_ROUTE') {
      setInputValue('Can you verify if my current route is safe now?');
      textareaRef.current?.focus();
      return;
    }

    if (action.type === 'EMERGENCY_SERVICES') {
      toast({
        title: 'Emergency Number',
        description: 'For immediate help, call 100 / 112.',
      });
      return;
    }

    if (action.type === 'SAFE_PLACES') {
      setInputValue('Show me the nearest safe places near my route.');
      textareaRef.current?.focus();
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Microphone Unsupported',
        description: 'Voice input is unavailable in this browser.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        setInterimText('');
        return;
      }

      if (micError) {
        setMicError(false);
      }

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error with voice input:', error);
      setIsListening(false);
      setMicError(true);
      toast({
        title: 'Microphone Error',
        description: 'Unable to start voice input. Please type your message.',
        variant: 'destructive',
      });
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        ...createWelcomeMessage(),
        content:
          "New conversation started. Share your route or concern, and I'll guide you in real time.",
      },
    ]);
    setVisibleCount(40);
    setCommandPaletteOpen(false);
    setContextMenu(null);
    setInputValue('');
    setUploadedFileName('');
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  const executeCommand = (id: string) => {
    if (id === 'new-chat') {
      handleNewChat();
      return;
    }

    if (id === 'focus-input') {
      setCommandPaletteOpen(false);
      textareaRef.current?.focus();
      return;
    }

    if (id === 'toggle-sidebar') {
      setSidebarOpen(prev => !prev);
      setCommandPaletteOpen(false);
      return;
    }

    if (id === 'toggle-mute') {
      setIsMuted(prev => !prev);
      setCommandPaletteOpen(false);
    }
  };

  const filteredCommands = COMMANDS.filter(command =>
    command.label.toLowerCase().includes(commandSearch.toLowerCase()),
  );

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  if (isMinimized && !isInPopup) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleMinimize}
          className="group relative h-14 w-14 overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#0b1020]/90 p-1 shadow-[0_0_35px_rgba(8,145,178,0.35)] transition-all duration-300 hover:-translate-y-1"
          aria-label="Open Nirbhaya Chat"
        >
          <img
            src={nirbhayaLogo}
            alt="Nirbhaya"
            className="h-full w-full rounded-xl object-cover"
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${
        isInPopup
          ? 'h-full w-full'
          : 'fixed bottom-6 right-6 h-[760px] w-[min(1080px,96vw)] rounded-3xl border border-white/10'
      } chat-shell ${isInPopup ? 'chat-shell-embedded' : ''} relative z-50 overflow-hidden`}
    >
      <div className="chat-aurora" />
      <div className="chat-grid" />

      {!isInPopup && (
        <div className="chat-top-floating flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <img src={nirbhayaLogo} alt="Nirbhaya" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Nirbhaya AI</h3>
              <p className="text-xs text-cyan-200/80">Safety Copilot</p>
            </div>
          </div>
          <button
            onClick={toggleMinimize}
            className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
            aria-label="Minimize chat"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="relative flex h-full min-h-0">
        {isDesktopExperience && (
          <aside
            className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar-open' : 'chat-sidebar-closed'}`}
          >
          <div className="border-b border-white/10 p-4">
            <button
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
            >
              <Plus size={16} />
              New Chat
            </button>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                value={historySearch}
                onChange={event => setHistorySearch(event.target.value)}
                placeholder="Search conversations"
                className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="chat-history-list">
            {filteredHistory.length === 0 && (
              <p className="px-4 py-6 text-xs text-slate-500">No matching conversations</p>
            )}
            {filteredHistory.map(item => (
              <button
                key={item.id}
                className="chat-history-item"
                onClick={() => {
                  setSidebarOpen(false);
                  textareaRef.current?.focus();
                }}
              >
                <div className="truncate text-xs font-semibold text-slate-200">{item.title}</div>
                <div className="mt-1 truncate text-[11px] text-slate-400">{item.preview}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wide text-cyan-300/70">{item.time}</div>
              </button>
            ))}
          </div>
          </aside>
        )}

        <section className="chat-main">
          <div className={`chat-main-header ${isInPopup ? 'chat-main-header-compact' : ''}`}>
            <div className="flex items-center gap-2">
              {isDesktopExperience && (
                <button
                  onClick={() => setSidebarOpen(prev => !prev)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? <SidebarClose size={16} /> : <SidebarOpen size={16} />}
                </button>
              )}
              {isDesktopExperience && (
                <button
                  onClick={() => setCommandPaletteOpen(true)}
                  className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 md:flex"
                  aria-label="Open command palette"
                >
                  <Command size={14} />
                  Command
                </button>
              )}
            </div>

            {!isInPopup && (
              <div className="chat-header-controls">
                <div className="chat-voice-wrap">
                  <label className="sr-only" htmlFor="chat-voice-select">Voice</label>
                  <select
                    id="chat-voice-select"
                    value={selectedVoiceIndex === null ? 'auto' : String(selectedVoiceIndex)}
                    onChange={event => {
                      const value = event.target.value;
                      setSelectedVoiceIndex(value === 'auto' ? null : Number(value));
                    }}
                    className="chat-voice-select"
                    title="Select voice"
                  >
                    <option value="auto">Voice: Auto</option>
                    {availableVoices.map((voice, index) => (
                      <option key={`${voice.name}-${index}`} value={String(index)}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className={`rounded-lg border p-2 transition ${
                    isMuted
                      ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                      : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                  }`}
                  title={isMuted ? 'Unmute voice' : 'Mute voice'}
                  aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            )}
          </div>

          {hasActiveRoute && (
            <div className="mx-4 mt-3 rounded-2xl border border-orange-300/25 bg-gradient-to-r from-orange-400/15 to-rose-400/10 p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200/80">
                    Live Route Analysis
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-200">
                    {routeData.origin} {'->'} {routeData.destination}
                  </div>
                </div>
                <button
                  onClick={() => setIsRouteMinimized(prev => !prev)}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10"
                  aria-label={isRouteMinimized ? 'Expand route analysis' : 'Collapse route analysis'}
                >
                  {isRouteMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>

              {!isRouteMinimized && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Safety Score</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`${
                          (routeData.safetyScore || 0) >= 70
                            ? 'bg-emerald-400'
                            : (routeData.safetyScore || 0) >= 50
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                        } h-full transition-all`}
                        style={{ width: `${routeData.safetyScore || 0}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-100">{routeData.safetyScore || 0}/100</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-slate-200">
                      {routeData.riskLevel}
                    </span>
                    {routeData.isNightTime && (
                      <span className="rounded-full border border-blue-300/35 bg-blue-500/20 px-2 py-1 text-blue-100">
                        Night Travel (+30% Risk)
                      </span>
                    )}
                    {routeData.incidents?.length > 0 && (
                      <span className="rounded-full border border-rose-300/35 bg-rose-500/20 px-2 py-1 text-rose-100">
                        {routeData.incidents.length} incident(s) detected
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="chat-container relative mt-3 flex-1 min-h-0 overflow-y-auto px-4 pb-4"
          >
            {messages.length > visibleCount && (
              <div className="mb-4 flex justify-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 30)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                >
                  Load older messages
                </button>
              </div>
            )}

            <div className="space-y-4">
              {visibleMessages.map((message, localIndex) => {
                const globalIndex = messages.length - visibleMessages.length + localIndex;
                const previous = visibleMessages[localIndex - 1];
                const showDivider = shouldShowDivider(message, previous);

                return (
                  <React.Fragment key={message.id}>
                    {showDivider && (
                      <div className="flex items-center justify-center">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-400">
                          {formatDay(message.timestamp)} - {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}

                    <div
                      className={`chat-message-row ${
                        message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
                      }`}
                    >
                      <div className="chat-avatar">
                        {message.role === 'assistant' ? (
                          <img src={nirbhayaLogo} alt="Nirbhaya" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <User size={16} className="text-cyan-100" />
                        )}
                      </div>

                      <div
                        className={`chat-bubble ${
                          message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                        }`}
                        onContextMenu={event => {
                          event.preventDefault();
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            messageIndex: globalIndex,
                          });
                        }}
                      >
                        <div
                          className={`chat-markdown ${
                            message.role === 'user' ? 'chat-markdown-user' : 'chat-markdown-assistant'
                          }`}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {streamingMessageId === message.id && (
                          <span className="chat-stream-caret" aria-hidden="true" />
                        )}

                        {message.isEmergency && (
                          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-300/35 bg-rose-500/15 px-2 py-1 text-xs text-rose-100">
                            <AlertTriangle size={14} />
                            Emergency mode response
                          </div>
                        )}

                        {message.suggestedActions && message.suggestedActions.length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {message.suggestedActions.map((action, actionIndex) => (
                              <button
                                key={`${action.type}-${actionIndex}`}
                                onClick={() => handleActionClick(action)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                  action.priority === 'CRITICAL'
                                    ? 'bg-rose-500 text-white hover:bg-rose-400'
                                    : action.priority === 'HIGH'
                                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="chat-message-actions">
                          <button
                            onClick={() => handleCopy(message.content)}
                            className="chat-action-btn"
                            aria-label="Copy message"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => handleShare(message.content)}
                            className="chat-action-btn"
                            aria-label="Share message"
                          >
                            <Share2 size={13} />
                          </button>
                          {message.role === 'assistant' && (
                            <button
                              onClick={() => handleRegenerate(globalIndex)}
                              className="chat-action-btn"
                              aria-label="Regenerate response"
                              disabled={isLoading}
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                          <button
                            onClick={event => {
                              const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                              setContextMenu({
                                x: rect.left,
                                y: rect.bottom + 6,
                                messageIndex: globalIndex,
                              });
                            }}
                            className="chat-action-btn"
                            aria-label="Open message menu"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {(isLoading || isThinking) && (
                <div className="chat-message-row chat-message-assistant">
                  <div className="chat-avatar">
                    <Bot size={16} className="text-cyan-100" />
                  </div>
                  <div className="chat-thinking">
                    <div className="chat-thinking-label">Thinking...</div>
                    <div className="chat-thinking-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {showScrollBottom && (
              <button
                onClick={scrollToBottom}
                className="chat-scroll-bottom"
                aria-label="Scroll to bottom"
              >
                <ChevronDown size={16} />
              </button>
            )}
          </div>

          <div className="chat-input-wrap">
            {isInPopup && (
              <div className="chat-inline-controls">
                <div className="chat-voice-wrap chat-voice-wrap-inline">
                  <label className="sr-only" htmlFor="chat-voice-select-inline">Voice</label>
                  <select
                    id="chat-voice-select-inline"
                    value={selectedVoiceIndex === null ? 'auto' : String(selectedVoiceIndex)}
                    onChange={event => {
                      const value = event.target.value;
                      setSelectedVoiceIndex(value === 'auto' ? null : Number(value));
                    }}
                    className="chat-voice-select"
                    title="Select voice"
                  >
                    <option value="auto">Voice: Auto</option>
                    {availableVoices.map((voice, index) => (
                      <option key={`${voice.name}-${index}`} value={String(index)}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMuted(prev => !prev)}
                  className={`chat-mute-btn rounded-lg border p-2 transition ${
                    isMuted
                      ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                      : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                  }`}
                  title={isMuted ? 'Unmute voice' : 'Mute voice'}
                  aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            )}

            {interimText && (
              <div className="chat-interim-text">Listening: {interimText}</div>
            )}

            {uploadedFileName && (
              <div className="chat-upload-pill">
                <FileUp size={12} />
                {uploadedFileName}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="chat-form">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  setUploadedFileName(file?.name || '');
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="chat-icon-btn"
                aria-label="Upload file"
                title="Upload (UI only)"
              >
                <FileUp size={16} />
              </button>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={event => setInputValue(event.target.value)}
                placeholder={activePlaceholder}
                className="chat-textarea"
                disabled={isLoading || isQuotaCoolingDown}
                rows={1}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey && !isQuotaCoolingDown) {
                    event.preventDefault();
                    void handleSendMessage(event as unknown as React.FormEvent);
                  }
                }}
              />

              <div className="chat-input-actions">
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={isLoading || micError || isQuotaCoolingDown}
                  className={`chat-icon-btn ${isListening ? 'chat-icon-btn-active' : ''}`}
                  aria-label="Voice input"
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  <Mic size={16} />
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim() || isQuotaCoolingDown}
                  className="chat-send-btn"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>

            <div className="chat-suggestions">
              {SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => {
                    setInputValue(suggestion);
                    textareaRef.current?.focus();
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {micError && (
              <div className="chat-error-note">
                Microphone is recovering. You can continue by typing.
              </div>
            )}
            {isQuotaCoolingDown && (
              <div className="chat-error-note">
                AI request quota reached. Please retry in {quotaRetrySeconds}s.
              </div>
            )}
          </div>
        </section>
      </div>

      {isDesktopExperience && commandPaletteOpen && (
        <div className="chat-overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="chat-command-palette" onClick={event => event.stopPropagation()}>
            <div className="chat-command-header">
              <Search size={14} className="text-slate-400" />
              <input
                autoFocus
                value={commandSearch}
                onChange={event => setCommandSearch(event.target.value)}
                placeholder="Type a command"
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredCommands.map(command => (
                <button
                  key={command.id}
                  className="chat-command-item"
                  onClick={() => executeCommand(command.id)}
                >
                  <span>{command.label}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">{command.hint}</span>
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-slate-500">No command found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={event => event.stopPropagation()}
        >
          <button
            className="chat-context-item"
            onClick={() => {
              const message = messages[contextMenu.messageIndex];
              if (message) {
                void handleCopy(message.content);
              }
              setContextMenu(null);
            }}
          >
            <Copy size={13} />
            Copy
          </button>
          <button
            className="chat-context-item"
            onClick={() => {
              const message = messages[contextMenu.messageIndex];
              if (message) {
                void handleShare(message.content);
              }
              setContextMenu(null);
            }}
          >
            <Share2 size={13} />
            Share
          </button>
          {messages[contextMenu.messageIndex]?.role === 'assistant' && (
            <button
              className="chat-context-item"
              onClick={() => {
                void handleRegenerate(contextMenu.messageIndex);
                setContextMenu(null);
              }}
            >
              <RefreshCw size={13} />
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatAssistant;
