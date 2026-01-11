# RakshaMarg

### <a href="https://share.google/uKHBfuvlIZvK5mQ2v">Visit RakshaMarg</a>

> **Navigate the Night with Intelligence.**

<div align="center">
  <img src="frontend/public/logo.png" alt="RakshaMarg Logo" width="200" />
</div>

<br />

<div align="center">
  <img src="https://img.shields.io/badge/Safety-First-red?style=for-the-badge&logo=security" alt="Safety First" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=google-maps&logoColor=white" alt="Google Maps" />
</div>

<br />

## Inspiration

*   **The Problem**: Standard maps prioritize speed, often routing pedestrians through dark, unsafe alleys to save a minute.
*   **The Gap**: Lack of navigation tools that account for personal safety, lighting, and crime data.
*   **Our Solution**: RakshaMarg - "Navigation with a Conscience". We prioritize **Safety Corridors** (well-lit, populated) over pure distance.

## What it does

RakshaMarg is an intelligent safety-first navigation system.

*   **Safety Scores**: We analyze routes and assign a safety score (0-100) based on street lighting, crime data, and crowd density.
*   **Smart Routing**: Our algorithm prioritizes "Safety Corridors"—well-lit main roads and active areas—over shortcuts through unsafe zones.
*   **Live Tracking**: Share your real-time location with trusted contacts. They can watch over you virtually until you reach your destination.
*   **SOS Button**: A single tap instantly alerts your emergency contacts with your precise location.
*   **Safe Zones**: Automatically highlights nearby police stations, hospitals, and 24/7 open establishments along your route.

### User Safety Workflow

```mermaid
sequenceDiagram
    actor User
    participant App as RakshaMarg App
    participant System as Intelligent Backend
    
    User->>App: Enters Destination
    App->>System: Request Routes
    System->>System: Analyze Safety (lighting, crime, crowd)
    System-->>App: Returns 3 Route Options (Safest Highlighted)
    User->>App: Selects "Safety Corridor"
    App->>User: Starts Navigation + Live Tracking
    
    opt Emergency Suspicion
        User->>App: Hits SOS
        App->>User: Alerts Contacts + Police
    end
```

## Potential Impact

*   **Crime Prevention**: Proactively steering users away from high-risk zones reduces opportunity for incidents.
*   **Public Safety**: Aggregating lighting/crime data helps authorities identify and fix "dark spots".
*   **Peace of Mind**: Reducing anxiety for late-night commuters through trusted routing and SOS features.

## Google Tech Used

*   **Maps API**: Core interactive mapping interface.
*   **Directions API**: Precision routing engine.
*   **Gemini API**: AI-driven safety scoring & fallback logic.

## Technical Implementation

### System Architecture

```mermaid
graph TD
    User[User] -->|Interacts| Frontend[React + Vite Frontend]
    Frontend -->|API Calls| Backend[Node.js + Fastify Backend]
    
    subgraph Google Cloud Services
        Backend -->|Routing Data| Maps[Google Maps Platform]
        Backend -->|Risk Analysis| Gemini[Gemini AI]
    end
    
    subgraph External Data
        Backend -->|Incident Reports| SafeCity[Safecity API]
    end
    
    Gemini -->|Safety Scores| Backend
    Maps -->|Routes & traffic| Backend
    Backend -->|Optimized Safe Path| Frontend
```

**Frontend (Robust & Interactive)**
*   **React + TypeScript**: Type-safe, component-based UI.
*   **Three.js**: High-performance 3D map rendering.
*   **Vite**: Optimized build toolchain.

**Backend (Scalable & fast)**
*   **Node.js + Fastify**: Low-overhead, high-concurrency API handling.
*   **Scalable Architecture**: Modular design separating routing, safety analysis, and user services.

**Data & AI (The Intelligence)**
*   **Google Maps Platform**: Enterprise-grade location data foundation.
*   **Gemini AI**: Advanced reasoning for risk scoring (processing crime stats + environmental factors).

## Challenges we ran into

*   **Quantifying "Safety"**: Safety is subjective. Combining objective data (streetlights) with subjective feelings (isolation) into a single score was a complex algorithmic challenge.
*   **3D Map Performance**: Rendering 3D elements on a map without lagging the browser required heavy optimization of our Three.js components.

## Accomplishments that we're proud of

*   Successfully integrating **safety analysis** with standard routing.
*   Building a **beautiful, dark-mode first UI** that feels premium and trustworthy.
*   The **3D integration** on the landing page just looks cool!

## What's next for RakshaMarg

*   **Crowdsourced Safety**: allowing users to report broken streetlights or unsafe incidents in real-time.
*   **WearOS Support**: A companion watch app for discreet vibration-based navigation.
*   **Offline Mode**: Downloading safe routes for areas with poor connectivity.

## Quick Links

*   [**Frontend Documentation**](./frontend/README.md) - Setup, and directory structure.
*   [**Backend Documentation**](./src/README.md) - API endpoints and server setup.

---

<div align="center">
  <p>Made with ❤️ for a safer world.</p>
  <p>© 2025 RakshaMarg. All rights reserved.</p>
</div>
