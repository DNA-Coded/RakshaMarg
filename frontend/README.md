# RakshaMarg Frontend

> **Navigate the Night with Intelligence.**

<p align="center">
  <img src="public/logo.png" alt="RakshaMarg Logo" width="200" />
</p>

## Overview

RakshaMarg is a safety-focused navigation application that prioritizes user safety over speed. By analyzing street lighting, crowd density, and historical safety data, RakshaMarg provides the safest possible routes for pedestrians, especially at night.

## Key Features

*   **Safety Scores**: Route safety quantification (0-100).
*   **Smart Routing**: Algorithms that favor well-lit and populated areas.
*   **Live Tracking**: Real-time location sharing with trusted contacts.
*   **SOS Button**: Immediate alert system.
*   **Safe Zones**: Identification of safe havens (police stations, hospitals).
*   **3D Experience**: Immersive 3D map elements and interactions.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: v18.0.0 or higher
*   **npm** or **bun** (preferred package manager)

## Installation

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone https://github.com/DeepSaha25/RakshaMarg.git
    cd RakshaMarg/frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the `frontend` directory based on your configuration requirements (e.g., Google Maps API key).
    ```env
    VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
    ```

4.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:8080` (or the port shown in your terminal).

## Available Scripts

*   `npm run dev`: Starts the development server with Vite.
*   `npm run build`: Builds the application for production.
*   `npm run preview`: Locally previews the production build.
*   `npm run lint`: Runs ESLint to check for code quality issues.

## Technology Stack

RakshaMarg utilizes a modern stack to ensure performance, type safety, and a premium user experience.

### Core
*   **React**: UI Library
*   **TypeScript**: Static Typing
*   **Vite**: Build Tool & Dev Server

### Styling & UI
*   **Tailwind CSS**: Utility-first CSS framework
*   **Shadcn UI**: Reusable components built on **Radix UI** primitives
*   **Framer Motion**: Powerful animation library
*   **GSAP**: High-performance animations

### Maps & 3D
*   **@react-google-maps/api**: Google Maps integration
*   **React Three Fiber (@react-three/fiber)**: 3D rendering with Three.js
*   **@react-three/drei**: Useful helpers for R3F

### State & Data
*   **@tanstack/react-query**: Server state management
*   **React Hook Form**: Form handling
*   **Zod**: Schema validation
*   **Recharts**: Data visualization charts

## Directory Structure

```
frontend/src/
├── 3d/                 # 3D models and components (Three.js/R3F)
├── assets/             # Static assets (images, fonts, global styles)
├── components/         # Reusable UI components
│   └── ui/             # Shadcn UI base components
├── data/               # Static data and constants
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and library configurations
├── pages/              # Route components (Page views)
│   ├── Index.tsx       # Landing page
│   ├── CheckRoute.tsx  # Main map/route checking interface
│   └── Inspiration.tsx # Project inspiration page
├── services/           # API services and business logic (e.g., navigation)
├── App.tsx             # Main application component & Routing
└── main.tsx            # Application entry point
```

## Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

<div align="center">
  <p>© 2025 RakshaMarg. All rights reserved.</p>
</div>
