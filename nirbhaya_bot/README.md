# Nirbhaya - AI Safety Assistant Bot (Python)

A standalone Python FastAPI service for the Nirbhaya AI safety chatbot companion.

## Features

- 🤖 AI-powered safety guidance using Google Gemini API
- 🚨 Emergency detection and response
- 😟 Anxiety/fear pattern recognition
- 📍 Journey context awareness
- 🔐 API key authentication
- 📚 Auto-generated API documentation

## Requirements

- Python 3.8+
- pip or conda

## Installation

### 1. Install Dependencies

```bash
cd nirbhaya_bot
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Create a `.env` file in the `nirbhaya_bot` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
API_KEY=rakshamarg-dwklhfdewhff-efjjefwoihjfohgn
PORT=8001
HOST=0.0.0.0
```

## Running the Service

```bash
python main.py
```

The service will start on `http://localhost:8001`

## Deploying to Render

1. Create a new Web Service in Render from this repository.
2. Set Root Directory to `nirbhaya_bot`.
3. Configure build/start commands:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port $PORT
```

4. Add environment variables:

```env
API_KEY=must_match_backend_APP_API_KEY
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=optional_if_using_openai
LLM_PROVIDER=gemini
```

5. Verify deployment with:

```bash
curl https://your-chatbot-service.onrender.com/health
```

## API Endpoints

### Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Nirbhaya AI Safety Assistant",
  "version": "1.0.0"
}
```

### Chat with Nirbhaya
```
POST /chat
Headers: x-api-key: your_api_key
```

**Request Body:**
```json
{
  "message": "Is this route safe at night?",
  "conversationHistory": [],
  "journeyContext": {
    "currentLocation": {
      "address": "Park Avenue",
      "lat": 28.7041,
      "lng": 77.1025
    },
    "isNightTime": true
  }
}
```

**Response:**
```json
{
  "response": "Based on the area, here are safety recommendations...",
  "isEmergency": false,
  "isAnxiety": false,
  "isSafetyInquiry": true,
  "suggestedActions": [
    {
      "type": "VIEW_ROUTE",
      "label": "View Full Route",
      "description": "See complete route on map",
      "priority": "MEDIUM"
    }
  ],
  "timestamp": "2025-03-24T12:00:00"
}
```

### Emergency Handler
```
POST /emergency
Headers: x-api-key: your_api_key
```

## Integration with Frontend

Update your frontend API calls to point to the Python service:

```typescript
const API_BASE_URL = 'http://localhost:8001';

const response = await fetch(`${API_BASE_URL}/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  },
  body: JSON.stringify({
    message: userMessage,
    conversationHistory: messages,
    journeyContext: journeyData
  })
});
```

## Project Structure

```
nirbhaya_bot/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── .env                 # Environment configuration
└── README.md           # This file
```

## Safety Patterns

The bot detects:

- **Emergency patterns**: danger, help, attacked, SOS, etc.
- **Anxiety patterns**: scared, nervous, worried, panic, etc.
- **Safety inquiries**: safe route, risk level, police station, etc.

## Troubleshooting

### Port Already in Use
```bash
# On Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# On macOS/Linux
lsof -i :8001
kill -9 <PID>
```

### API Key Issues
Ensure `GEMINI_API_KEY` and `API_KEY` are correctly set in `.env`

### Connection Issues
Verify the service is running:
```bash
curl http://localhost:8001/health
```

## API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## License

ISC
