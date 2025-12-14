import React from 'react';

const AnimatedIndiaMap: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        viewBox="0 0 800 900"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] opacity-[0.08]"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Simplified India outline */}
        <path
          d="M350,50 
             C380,40 420,35 450,45
             L500,60 L540,80 L560,120
             L580,160 L590,200 L600,240
             L620,280 L640,320 L660,360
             L670,400 L675,440 L670,480
             L660,520 L640,560 L610,600
             L580,640 L540,680 L500,710
             L460,730 L420,740 L380,745
             L340,740 L300,730 L260,710
             L230,680 L210,640 L200,600
             L195,560 L200,520 L210,480
             L225,440 L245,400 L270,360
             L290,320 L305,280 L315,240
             L320,200 L330,160 L340,120
             L350,80 Z"
          fill="hsl(var(--teal))"
          className="animate-pulse-soft"
        />
        
        {/* Shield icon in center */}
        <g transform="translate(380, 350)" className="animate-glow">
          <path
            d="M40,0 L80,20 L80,50 C80,80 60,100 40,110 C20,100 0,80 0,50 L0,20 Z"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="3"
            opacity="0.6"
          />
          <path
            d="M40,25 L35,45 L45,45 L40,65"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
        </g>

        {/* Animated route paths */}
        <g className="animate-path-flow" style={{ strokeDasharray: 1000 }}>
          {/* Path 1: Delhi to Mumbai */}
          <path
            d="M400,180 C380,250 350,320 340,400 C330,480 360,550 400,620"
            fill="none"
            stroke="hsl(var(--teal))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            opacity="0.5"
          />
          
          {/* Path 2: Kolkata to Chennai */}
          <path
            d="M550,280 C520,340 480,400 450,480 C420,560 440,620 480,680"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            opacity="0.5"
          />
          
          {/* Path 3: Bangalore to Hyderabad */}
          <path
            d="M450,580 C420,520 400,480 420,420"
            fill="none"
            stroke="hsl(var(--teal-light))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 12"
            opacity="0.5"
          />
        </g>

        {/* City dots with pulse effect */}
        <g>
          {/* Delhi */}
          <circle cx="400" cy="180" r="6" fill="hsl(var(--secondary))" className="animate-pulse-soft" />
          <circle cx="400" cy="180" r="12" fill="hsl(var(--secondary))" opacity="0.3" className="animate-pulse-soft animation-delay-200" />
          
          {/* Mumbai */}
          <circle cx="340" cy="400" r="6" fill="hsl(var(--secondary))" className="animate-pulse-soft animation-delay-100" />
          <circle cx="340" cy="400" r="12" fill="hsl(var(--secondary))" opacity="0.3" className="animate-pulse-soft animation-delay-300" />
          
          {/* Kolkata */}
          <circle cx="550" cy="280" r="5" fill="hsl(var(--teal))" className="animate-pulse-soft animation-delay-200" />
          <circle cx="550" cy="280" r="10" fill="hsl(var(--teal))" opacity="0.3" className="animate-pulse-soft animation-delay-400" />
          
          {/* Chennai */}
          <circle cx="480" cy="580" r="5" fill="hsl(var(--teal))" className="animate-pulse-soft animation-delay-300" />
          <circle cx="480" cy="580" r="10" fill="hsl(var(--teal))" opacity="0.3" className="animate-pulse-soft animation-delay-500" />
          
          {/* Bangalore */}
          <circle cx="420" cy="560" r="5" fill="hsl(var(--teal-light))" className="animate-pulse-soft animation-delay-400" />
          <circle cx="420" cy="560" r="10" fill="hsl(var(--teal-light))" opacity="0.3" className="animate-pulse-soft animation-delay-600" />
          
          {/* Hyderabad */}
          <circle cx="420" cy="420" r="5" fill="hsl(var(--teal-light))" className="animate-pulse-soft animation-delay-500" />
          <circle cx="420" cy="420" r="10" fill="hsl(var(--teal-light))" opacity="0.3" className="animate-pulse-soft" />
        </g>

        {/* Connecting arcs with glow */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default AnimatedIndiaMap;