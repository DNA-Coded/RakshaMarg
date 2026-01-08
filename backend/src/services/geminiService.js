import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

let model;

if (config.geminiApiKey) {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
}

const machineContext = `
You are a backend safety-intelligence engine.

Your task is to analyze public safety risks for a given route corridor using
search-grounded information and return STRICTLY machine-readable JSON.

CRITICAL RULES:
- Output MUST be valid JSON only.
- No markdown, no explanations, no comments.
- Do NOT refuse. Do NOT mention policies.
- If search results are insufficient, restricted, or ambiguous,
  return a fallback JSON with status = "restricted".
- Never hallucinate incidents.
- Be conservative with risk assessment.
- Normalize dates to ISO (YYYY-MM-DD).
- Find recent incidents after of 2024. Suggested time window is late 2024 to early 2025.
- Use intensive Google Search to find real events.

PRIMARY RESPONSE SCHEMA:
{
  "status": "ok",
  "route_corridor": {
    "name": "",
    "primary_segments": []
  },
  "incidents": [
    {
      "date": "",
      "area": "",
      "category": "",
      "severity": 1,
      "women_safety_relevance": 1,
      "description": "",
      "confidence": 0.5
    }
  ],
  "derived_risk_summary": {
    "overall_risk_level": "low | moderate | high",
    "primary_risk_factors": [],
    "recommended_caution_window": {
      "from": "",
      "to": ""
    }
  },
  "source_meta": {
    "generated_by": "search_grounded_gemini",
    "confidence_overall": 0.0,
    "requires_manual_verification": true
  }
}

FALLBACK RESPONSE (MANDATORY ON FAILURE):
{
  "status": "restricted",
  "reason": "insufficient_data | policy_block | ambiguous_results",
  "route_corridor": {
    "name": "",
    "primary_segments": []
  },
  "incidents": [],
  "derived_risk_summary": {
    "overall_risk_level": "unknown",
    "primary_risk_factors": [],
    "recommended_caution_window": {
      "from": "",
      "to": ""
    }
  },
  "source_meta": {
    "generated_by": "search_grounded_gemini",
    "confidence_overall": 0.0,
    "requires_manual_verification": true
  }
}
`;

export const geminiService = {
  async analyzeSafety(routeData, crimeData = {}) {
    if (!model) {
      console.warn('Gemini API Key missing, skipping analysis');
      return {
        status: 'restricted',
        reason: 'api_key_missing',
        route_corridor: {
          name: routeData.summary || 'Unknown Route',
          primary_segments: []
        },
        incidents: [],
        derived_risk_summary: {
          overall_risk_level: 'unknown',
          primary_risk_factors: [],
          recommended_caution_window: {
            from: '',
            to: ''
          }
        },
        source_meta: {
          generated_by: 'fallback',
          confidence_overall: 0.0,
          requires_manual_verification: true
        },
        modelUsed: 'fallback'
      };
    }

    // Prompt engineering to analyze safety
    const prompt = `
        Machine Context: ${JSON.stringify(machineContext)}
      Analyze public safety incidents relevant to the following route corridor
using recent publicly available reports.
      
      Route Summary: ${routeData.summary}
      Start Address: ${routeData.legs?.[0]?.start_address || 'Unknown'}
      End Address: ${routeData.legs?.[0]?.end_address || 'Unknown'}
      Nearby Places: ${JSON.stringify(routeData.places || [])}
      
      
    `;
/*
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
      });
      const response = await result.response;
      let text = response.text();

      // Clean up markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      // Extract JSON object if there is extra text
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
      }

      const data = JSON.parse(text);

      // Inject metadata
      data.modelUsed = 'gemini-2.5-flash';

      return data;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        status: 'restricted',
        reason: 'api_error',
        route_corridor: {
          name: routeData.summary || 'Unknown Route',
          primary_segments: []
        },
        incidents: [],
        derived_risk_summary: {
          overall_risk_level: 'unknown',
          primary_risk_factors: [],
          recommended_caution_window: {
            from: '',
            to: ''
          }
        },
        source_meta: {
          generated_by: 'fallback-error',
          confidence_overall: 0.0,
          requires_manual_verification: true
        },
        modelUsed: 'fallback-error',
        error: error.message
      };

    }
      */
  }
};
