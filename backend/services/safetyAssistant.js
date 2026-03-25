import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

let model;

if (config.geminiApiKey) {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// Emergency keywords/patterns detection
const EMERGENCY_PATTERNS = [
  /help/i,
  /i feel unsafe|feeling unsafe/i,
  /someone is following me/i,
  /i am in danger|in danger/i,
  /emergency|emergency help/i,
  /urgent|sos|mayday/i,
  /attacked|assault|threat/i,
  /danger|dangerous situation/i
];

// Safety inquiry patterns
const SAFETY_INQUIRY_PATTERNS = [
  /is this road safe|is.*safe/i,
  /how safe|safer|safest route/i,
  /risk|danger level/i,
  /police station|hospital/i,
  /lighting|illumination/i,
  /crowded|populated|busy/i
];

// Anxiety/Fear patterns
const ANXIETY_PATTERNS = [
  /scared|afraid|frightened/i,
  /nervous|anxious|worried/i,
  /uncomfortable|uneasy|tense/i,
  /panic|panicking/i,
  /worried|concern|concerned/i
];

function detectEmergency(userMessage) {
  return EMERGENCY_PATTERNS.some(pattern => pattern.test(userMessage));
}

function detectAnxiety(userMessage) {
  return ANXIETY_PATTERNS.some(pattern => pattern.test(userMessage));
}

function detectSafetyInquiry(userMessage) {
  return SAFETY_INQUIRY_PATTERNS.some(pattern => pattern.test(userMessage));
}

// System prompt for Nirbhaya
const NIRBHAYA_SYSTEM_PROMPT = `You are Nirbhaya, an intelligent AI Safety Navigation Assistant designed to help women travel safely. You are calm, supportive, and reassuring.

Your core personality:
- You are a protective, intelligent safety companion
- You speak with calm confidence and reassurance
- You provide clear, practical safety advice
- You prioritize user safety above all else
- You avoid creating panic or unnecessary fear
- You speak naturally and conversationally

Your role includes:
- Monitoring journey safety and explaining route risks
- Detecting danger signals and providing emergency guidance
- Offering step-by-step safety instructions when needed
- Explaining safety features like trusted contacts and SOS
- Predicting time-sensitive risks (late night travel, unfamiliar areas)
- Reassuring users during anxious moments
- Providing nearby safe places (police stations, hospitals, crowded areas)

Safety Priorities:
1. If user expresses fear or anxiety: Respond calmly and reassuringly
2. If user is in danger: Provide emergency instructions immediately
3. If user asks about route safety: Provide clear explanations based on available data
4. If user mentions SOS: Guide them calmly through activation without forcing it
5. Always explain WHY a route is safe or unsafe (use data, not assumptions)

Important Rules:
- NEVER invent crime statistics or risks
- ALWAYS support your answers with data when available
- If data is unavailable, clearly say so
- Maintain a calm, supportive tone even in emergencies
- Keep responses concise but clear
- Ask clarifying questions if you need more context

When responding:
- Listen empathetically to fear or concerns
- Provide actionable advice
- Encourage responsibility (stay on safe routes, keep phone charged, etc.)
- Connect to RakshaMarg features (trusted contacts, SOS, route suggestions)
- Monitor for danger signals and escalate when needed`;

export const safetyAssistant = {
  /**
   * Analyze user message and provide safety guidance
   * Returns: { response, isEmergency, isAnxiety, isSafetyInquiry, suggestedActions }
   */
  async chat(userMessage, conversationHistory = [], journeyContext = {}) {
    if (!model) {
      console.warn('Gemini API Key missing, unable to initialize Nirbhaya');
      return {
        response: "I apologize, but I'm unable to respond at the moment. Please use the safety features available on the interface.",
        isEmergency: false,
        isAnxiety: false,
        isSafetyInquiry: false,
        suggestedActions: [],
        error: 'API_KEY_MISSING'
      };
    }

    const isEmergency = detectEmergency(userMessage);
    const isAnxiety = detectAnxiety(userMessage);
    const isSafetyInquiry = detectSafetyInquiry(userMessage);

    // Prepare context about their journey
    let journeyContextStr = '';
    if (journeyContext.currentLocation) {
      journeyContextStr += `\nCurrent Location: ${journeyContext.currentLocation.address || `${journeyContext.currentLocation.lat}, ${journeyContext.currentLocation.lng}`}`;
    }
    if (journeyContext.destination) {
      journeyContextStr += `\nDestination: ${journeyContext.destination.address || `${journeyContext.destination.lat}, ${journeyContext.destination.lng}`}`;
    }
    if (journeyContext.activeRoute) {
      journeyContextStr += `\nRouting on: ${journeyContext.activeRoute.summary || 'Selected Route'}`;
      journeyContextStr += `\nRoute Safety Score: ${journeyContext.activeRoute.safetyScore || 'N/A'}`;
      journeyContextStr += `\nEstimated Arrival: ${journeyContext.activeRoute.duration || 'N/A'}`;
    }
    if (journeyContext.nearbyPlaces) {
      journeyContextStr += `\nNearby Hospitals: ${journeyContext.nearbyPlaces.hospitals?.length || 0}`;
      journeyContextStr += `\nNearby Police Stations: ${journeyContext.nearbyPlaces.policeStations?.length || 0}`;
    }
    if (journeyContext.currentTime) {
      journeyContextStr += `\nCurrent Time: ${journeyContext.currentTime}`;
    }
    if (journeyContext.isNightTime) {
      journeyContextStr += `\n⚠️ NIGHT TIME: Extra caution recommended for low-visibility areas`;
    }

    // Build messages for conversational context
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      {
        role: 'user',
        parts: [{
          text: `${userMessage}${journeyContextStr}`
        }]
      }
    ];

    try {
      const result = await model.generateContent({
        contents: messages,
        systemInstruction: NIRBHAYA_SYSTEM_PROMPT
      });

      const response = await result.response;
      let assistantMessage = response.text().trim();

      // Determine suggested actions based on message type
      let suggestedActions = [];

      if (isEmergency) {
        suggestedActions = [
          {
            type: 'SOS',
            label: 'ACTIVATE SOS',
            description: 'Send emergency alert to trusted contacts',
            priority: 'CRITICAL'
          },
          {
            type: 'EMERGENCY_SERVICES',
            label: 'Call Emergency Services',
            description: 'Contact local police (100 in India)',
            priority: 'CRITICAL'
          },
          {
            type: 'SAFE_PLACE',
            label: 'Find Nearby Safe Place',
            description: 'Locate nearest police station or hospital',
            priority: 'HIGH'
          }
        ];
      } else if (isAnxiety) {
        suggestedActions = [
          {
            type: 'SAFE_ROUTE',
            label: 'Verify Route Safety',
            description: 'Check if current route is optimal',
            priority: 'HIGH'
          },
          {
            type: 'TRUSTED_CONTACTS',
            label: 'Share Location with Trusted Contact',
            description: 'Let someone know where you are',
            priority: 'MEDIUM'
          },
          {
            type: 'SAFE_PLACES',
            label: 'Find Nearby Safe Places',
            description: 'Police stations, hospitals, crowded areas',
            priority: 'MEDIUM'
          }
        ];
      } else if (isSafetyInquiry) {
        suggestedActions = [
          {
            type: 'ANALYZE_ROUTE',
            label: 'Analyze Full Route Safety',
            description: 'Get detailed safety analysis for your route',
            priority: 'MEDIUM'
          },
          {
            type: 'ALTERNATIVE_ROUTES',
            label: 'View Alternative Routes',
            description: 'Compare safety scores of different routes',
            priority: 'MEDIUM'
          }
        ];
      }

      return {
        response: assistantMessage,
        isEmergency,
        isAnxiety,
        isSafetyInquiry,
        suggestedActions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Nirbhaya Chat Error:', error);
      return {
        response: "I'm experiencing a temporary issue. For immediate safety concerns, please call emergency services or activate SOS.",
        isEmergency,
        isAnxiety,
        isSafetyInquiry,
        suggestedActions: isEmergency ? [
          {
            type: 'SOS',
            label: 'ACTIVATE SOS',
            priority: 'CRITICAL'
          }
        ] : [],
        error: 'CHAT_ERROR',
        errorDetails: error.message
      };
    }
  },

  /**
   * Analyze journey for proactive safety monitoring (Smart Safety Mode)
   */
  async analyzeJourneyRisks(journeyData) {
    if (!model) {
      return {
        hasRisks: false,
        riskLevel: 'unknown',
        warnings: [],
        recommendations: []
      };
    }

    const prompt = `
You are analyzing a journey for safety risks. Provide a brief, actionable safety assessment.

Journey Details:
- Route: ${journeyData.route?.summary || 'Unknown'}
- Time of Day: ${journeyData.currentTime}
- User Location: ${journeyData.userLocation}
- Destination: ${journeyData.destination}
- Areas with concerns: ${journeyData.areasOfConcern?.join(', ') || 'None specified'}

Based on this information, respond with:
1. A risk assessment (low/moderate/high)
2. 1-3 specific safety warnings if any
3. 1-2 actionable recommendations

Keep response brief and practical.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      // Parse the response
      const lines = analysisText.split('\n').filter(l => l.trim());
      
      return {
        analysis: analysisText,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Journey Risk Analysis Error:', error);
      return {
        hasRisks: false,
        analysis: 'Unable to analyze risks at the moment',
        error: true
      };
    }
  },

  /**
   * Generate time-based risk warnings
   */
  getTimBasedRiskWarning(location, currentTime, routeData) {
    const hour = new Date(currentTime).getHours();
    const isNightTime = hour < 5 || hour > 21; // Before 5 AM or after 9 PM

    if (isNightTime) {
      return {
        hasWarning: true,
        severity: 'HIGH',
        message: `This area's activity level decreases significantly after 9 PM. Please ensure you're on well-lit routes and stay alert.`,
        suggestion: 'Consider an alternate daytime route if possible, or activate trusted contacts sharing.'
      };
    }

    const isMorningRush = hour >= 7 && hour <= 9;
    const isEveningRush = hour >= 17 && hour <= 19;
    
    if (isMorningRush || isEveningRush) {
      return {
        hasWarning: false,
        message: `This is a peak traffic time. Heavy vehicles and congestion present - stay alert to traffic.`,
        severity: 'LOW'
      };
    }

    return {
      hasWarning: false,
      message: null
    };
  },

  /**
   * Detect and respond to emergency keywords
   */
  handleEmergency(userMessage, journeyContext) {
    return {
      isEmergency: detectEmergency(userMessage),
      emergencyGuidance: [
        {
          step: 1,
          action: 'Stay Calm',
          description: 'Take deep breaths. You are not alone.'
        },
        {
          step: 2,
          action: 'Move to Safety',
          description: 'Go to a crowded, well-lit public area if possible.'
        },
        {
          step: 3,
          action: 'Call for Help',
          description: 'Activate SOS to alert trusted contacts, or call emergency services (100 in India).'
        },
        {
          step: 4,
          action: 'Share Location',
          description: 'Ensure trusted contacts have your real-time location.'
        },
        {
          step: 5,
          action: 'Stay in Touch',
          description: 'Keep communication open with trusted contacts until safe.'
        }
      ],
      nearbyResources: journeyContext.nearbyPlaces || {}
    };
  }
};
