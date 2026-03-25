"""
Nirbhaya - AI Safety Assistant Bot
A Python-based chatbot service for women's safety guidance
"""

from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import google.generativeai as genai
from dotenv import load_dotenv
import os
import re
from datetime import datetime

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
API_KEY = os.getenv("API_KEY")
PORT = int(os.getenv("PORT", 8001))
HOST = os.getenv("HOST", "0.0.0.0")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# Initialize FastAPI app
app = FastAPI(
    title="Nirbhaya - AI Safety Assistant",
    description="An intelligent AI safety navigation companion for women",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Pydantic Models
# ============================================================================

class Location(BaseModel):
    address: str
    lat: float
    lng: float

class ActiveRoute(BaseModel):
    summary: str
    safetyScore: Optional[float] = None
    duration: Optional[str] = None

class NearbyPlaces(BaseModel):
    hospitals: Optional[List[dict]] = []
    policeStations: Optional[List[dict]] = []

class RouteContext(BaseModel):
    safetyScore: Optional[float] = None
    riskLevel: Optional[str] = None  # "Low Risk", "Moderate Risk", "High Risk"
    incidents: Optional[List[dict]] = []
    hospitals: Optional[dict] = None
    policeStation: Optional[dict] = None
    isNightTime: Optional[bool] = False

class JourneyContext(BaseModel):
    currentLocation: Optional[Location] = None
    destination: Optional[Location] = None
    activeRoute: Optional[ActiveRoute] = None
    nearbyPlaces: Optional[NearbyPlaces] = None
    currentTime: Optional[str] = None
    isNightTime: Optional[bool] = False

class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    conversationHistory: Optional[List[Message]] = []
    journeyContext: Optional[JourneyContext] = None
    routeContext: Optional[RouteContext] = None

class SuggestedAction(BaseModel):
    type: str
    label: str
    description: Optional[str] = None
    priority: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    isEmergency: bool
    isAnxiety: bool
    isSafetyInquiry: bool
    suggestedActions: List[SuggestedAction]
    timestamp: str

# ============================================================================
# Pattern Detection
# ============================================================================

class SafetyPatterns:
    """Pattern detection for safety analysis"""
    
    EMERGENCY_PATTERNS = [
        r"\bhelp\b",
        r"i feel unsafe|feeling unsafe",
        r"someone is following me",
        r"i am in danger|in danger",
        r"emergency|emergency help",
        r"urgent|sos|mayday",
        r"attacked|assault|threat",
        r"danger|dangerous situation",
    ]
    
    SAFETY_INQUIRY_PATTERNS = [
        r"is this road safe|is.*safe",
        r"how safe|safer|safest route",
        r"risk|danger level",
        r"police station|hospital",
        r"lighting|illumination",
        r"crowded|populated|busy",
    ]
    
    ANXIETY_PATTERNS = [
        r"scared|afraid|frightened",
        r"nervous|anxious|worried",
        r"uncomfortable|uneasy|tense",
        r"panic|panicking",
        r"worried|concern|concerned",
    ]
    
    @staticmethod
    def detect_emergency(message: str) -> bool:
        """Detect if message indicates an emergency"""
        for pattern in SafetyPatterns.EMERGENCY_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False
    
    @staticmethod
    def detect_anxiety(message: str) -> bool:
        """Detect if message indicates anxiety or fear"""
        for pattern in SafetyPatterns.ANXIETY_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False
    
    @staticmethod
    def detect_safety_inquiry(message: str) -> bool:
        """Detect if message is asking about safety"""
        for pattern in SafetyPatterns.SAFETY_INQUIRY_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False

# ============================================================================
# Nirbhaya AI Assistant
# ============================================================================

NIRBHAYA_SYSTEM_PROMPT = """You are Nirbhaya, an intelligent AI Safety Navigation Assistant designed to help women travel safely. You are calm, supportive, and reassuring.

Your core personality:
- You are a protective, intelligent safety companion
- You speak with calm confidence and reassurance
- You provide clear, practical safety advice
- You prioritize user safety above all else
- You avoid creating panic or unnecessary fear
- You speak naturally and conversationally

Your role includes:
- Analyzing live route data and explaining risks with actual numbers
- Detecting danger signals and providing emergency guidance
- Offering step-by-step safety instructions when needed
- Proactively suggesting safer alternatives based on real-time data
- Monitoring time-sensitive risks (late night travel, unfamiliar areas, incident hotspots)
- Reassuring users during anxious moments
- Guiding users to nearby safe places (police stations, hospitals, crowded areas)
- Educating users about WHY a route is safe or unsafe based on incident data

Route Analysis Instructions:
1. When given route safety data:
   - Always acknowledge the safety score and risk level
   - Explain specific incidents on the route if available
   - Highlight nearest emergency services (hospitals, police)
   - Consider time of day (night travel has higher risk multipliers)
   - Mention specific risk factors (poor lighting, isolated areas, crime hotspots)

2. Proactive Safety Suggestions:
   - If safety score is moderate/high: Suggest checking alternate routes
   - If traveling at night: Emphasize staying in well-lit areas
   - If many incidents: Recommend staying alert and keeping phone charged
   - Always mention the presence of nearby hospitals/police as reassurance

3. When user asks about route safety:
   - Cite the actual safety score and risk level from data
   - List specific incidents if they exist
   - Explain the factors affecting safety
   - Never invent data - only use what's provided

Safety Priorities:
1. If user expresses fear or anxiety: Respond calmly and reassuringly, reference route data to provide comfort
2. If user is in danger: Provide emergency instructions immediately
3. If user asks about route safety: Provide data-backed explanations
4. If user mentions SOS: Guide them calmly through activation without forcing it
5. If route data shows high risk: Proactively suggest alternatives or precautions

Important Rules:
- NEVER invent crime statistics or risks - use only provided data
- ALWAYS support answers with route data when available
- If data is unavailable, clearly say so
- Maintain a calm, supportive tone even in emergencies
- Keep responses concise but clear
- Show empathy while being practical
- When data shows high risk, be honest but not alarmist

When responding based on real route data:
- Quote the actual safety score and risk level
- Reference specific incidents by type if available
- Mention nearby emergency services
- Suggest concrete safety actions
- Connect to RakshaMarg features (trusted contacts, SOS, route alternatives)
- Monitor for danger signals and escalate when needed"""

class NirbhayaAssistant:
    """Nirbhaya AI Safety Assistant"""
    
    def __init__(self):
        self.model = genai.GenerativeModel("gemini-2.5-flash")
        self.chat_session = None
    
    def build_route_context(self, route_ctx: Optional['RouteContext']) -> str:
        """Build route-specific context string from detailed safety data"""
        if not route_ctx:
            return ""
        
        context_str = "\n=== LIVE ROUTE SAFETY DATA ===\n"
        
        if route_ctx.safetyScore is not None:
            score = route_ctx.safetyScore
            risk_level = route_ctx.riskLevel or ("Low Risk" if score >= 70 else "Moderate Risk" if score >= 50 else "High Risk")
            context_str += f"Route Safety Score: {score}/100 ({risk_level})\n"
        
        if route_ctx.riskLevel:
            context_str += f"Risk Assessment: {route_ctx.riskLevel}\n"
        
        if route_ctx.incidents and len(route_ctx.incidents) > 0:
            context_str += f"Active Incidents: {len(route_ctx.incidents)} incident(s) detected\n"
            for incident in route_ctx.incidents[:3]:  # Show first 3 incidents
                incident_type = incident.get('type', 'Unknown')
                context_str += f"  - {incident_type}\n"
        else:
            context_str += "Active Incidents: None reported\n"
        
        if route_ctx.isNightTime:
            context_str += "⚠️ TIME CONTEXT: Night travel (Risk multiplier: 1.3x)\n"
        
        if route_ctx.hospitals:
            hospital = route_ctx.hospitals
            hospital_name = hospital.get('name', 'Nearby Hospital')
            distance = hospital.get('distance', 'N/A')
            context_str += f"Nearest Hospital: {hospital_name} ({distance})\n"
        
        if route_ctx.policeStation:
            police = route_ctx.policeStation
            police_name = police.get('name', 'Nearby Police Station')
            distance = police.get('distance', 'N/A')
            context_str += f"Nearest Police: {police_name} ({distance})\n"
        
        return context_str
    
    def build_journey_context(self, context: Optional[JourneyContext]) -> str:
        """Build journey context string from data"""
        if not context:
            return ""
        
        context_str = ""
        
        if context.currentLocation:
            context_str += f"\nCurrent Location: {context.currentLocation.address or f'{context.currentLocation.lat}, {context.currentLocation.lng}'}"
        
        if context.destination:
            context_str += f"\nDestination: {context.destination.address or f'{context.destination.lat}, {context.destination.lng}'}"
        
        if context.activeRoute:
            context_str += f"\nRouting on: {context.activeRoute.summary}"
            if context.activeRoute.safetyScore:
                context_str += f"\nRoute Safety Score: {context.activeRoute.safetyScore}"
            if context.activeRoute.duration:
                context_str += f"\nEstimated Arrival: {context.activeRoute.duration}"
        
        if context.nearbyPlaces:
            hospitals = len(context.nearbyPlaces.hospitals) if context.nearbyPlaces.hospitals else 0
            police = len(context.nearbyPlaces.policeStations) if context.nearbyPlaces.policeStations else 0
            context_str += f"\nNearby Hospitals: {hospitals}"
            context_str += f"\nNearby Police Stations: {police}"
        
        if context.currentTime:
            context_str += f"\nCurrent Time: {context.currentTime}"
        
        if context.isNightTime:
            context_str += "\n⚠️ NIGHT TIME: Extra caution recommended for low-visibility areas"
        
        return context_str
    
    async def chat(self, user_message: str, history: List[Message], context: Optional[JourneyContext], route_context: Optional['RouteContext'] = None) -> ChatResponse:
        """Process user message and generate response"""
        
        # Detect message patterns
        is_emergency = SafetyPatterns.detect_emergency(user_message)
        is_anxiety = SafetyPatterns.detect_anxiety(user_message)
        is_safety_inquiry = SafetyPatterns.detect_safety_inquiry(user_message)
        
        # Build journey context and route context
        journey_context_str = self.build_journey_context(context)
        route_context_str = self.build_route_context(route_context)
        
        # Build conversation for Gemini
        messages = []
        
        # Add conversation history
        for msg in history:
            messages.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": msg.content}]
            })
        
        # Add current message with context (route context first, then journey context)
        full_message = f"{user_message}{route_context_str}{journey_context_str}"
        messages.append({
            "role": "user",
            "parts": [{"text": full_message}]
        })
        
        try:
            # Generate response using Gemini
            # Build complete conversation with system prompt at the beginning
            full_conversation = [
                {
                    "role": "user",
                    "parts": [{"text": NIRBHAYA_SYSTEM_PROMPT}]
                },
                {
                    "role": "model",
                    "parts": [{"text": "I understand. I am Nirbhaya, your AI safety companion. I'm ready to help you stay safe."}]
                }
            ] + messages
            
            response = self.model.generate_content(
                contents=full_conversation,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=500
                )
            )
            
            assistant_message = response.text.strip()
            
            # Generate suggested actions based on message type
            suggested_actions = []
            
            if is_emergency:
                suggested_actions = [
                    SuggestedAction(
                        type="SOS",
                        label="ACTIVATE SOS",
                        description="Send emergency alert to trusted contacts",
                        priority="CRITICAL"
                    ),
                    SuggestedAction(
                        type="EMERGENCY_SERVICES",
                        label="Call Emergency Services",
                        description="Contact local police (100 in India)",
                        priority="CRITICAL"
                    ),
                    SuggestedAction(
                        type="SAFE_PLACE",
                        label="Find Nearby Safe Place",
                        description="Locate nearest police station or hospital",
                        priority="HIGH"
                    )
                ]
            elif is_anxiety:
                suggested_actions = [
                    SuggestedAction(
                        type="SAFE_ROUTE",
                        label="Verify Route Safety",
                        description="Check if current route is optimal",
                        priority="HIGH"
                    ),
                    SuggestedAction(
                        type="TRUSTED_CONTACTS",
                        label="Share Location with Trusted Contact",
                        description="Let someone know where you are",
                        priority="MEDIUM"
                    )
                ]
            elif is_safety_inquiry:
                suggested_actions = [
                    SuggestedAction(
                        type="VIEW_ROUTE",
                        label="View Full Route",
                        description="See complete route on map",
                        priority="MEDIUM"
                    )
                ]
            
            return ChatResponse(
                response=assistant_message,
                isEmergency=is_emergency,
                isAnxiety=is_anxiety,
                isSafetyInquiry=is_safety_inquiry,
                suggestedActions=suggested_actions,
                timestamp=datetime.now().isoformat()
            )
        
        except Exception as e:
            print(f"Nirbhaya Chat Error: {str(e)}")
            raise

# Initialize Nirbhaya
nirbhaya = NirbhayaAssistant()

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Nirbhaya AI Safety Assistant",
        "version": "1.0.0"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """Chat with Nirbhaya AI Safety Assistant"""
    
    # Verify API key
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    # Validate message
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )
    
    try:
        # Convert journey context and route context if provided
        journey_ctx = None
        if request.journeyContext:
            journey_ctx = request.journeyContext
        
        route_ctx = None
        if request.routeContext:
            route_ctx = request.routeContext
        
        # Get response from Nirbhaya
        response = await nirbhaya.chat(
            request.message,
            request.conversationHistory or [],
            journey_ctx,
            route_ctx
        )
        
        return response
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )

@app.post("/emergency")
async def emergency_endpoint(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """Handle emergency situations"""
    
    # Verify API key
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return {
        "status": "emergency_detected",
        "guidance": "Emergency assistance has been triggered. Help is on the way.",
        "timestamp": datetime.now().isoformat(),
        "reminder": "Call 100 (India) for immediate police assistance"
    }

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting Nirbhaya AI Safety Assistant on {HOST}:{PORT}")
    print(f"📚 API Documentation: http://localhost:{PORT}/docs")
    uvicorn.run(app, host=HOST, port=PORT)
