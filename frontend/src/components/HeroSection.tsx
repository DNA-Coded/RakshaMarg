import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import docImg from '../assets/doc.png';
import pilotImg from '../assets/pilot.png';
import soldierImg from '../assets/soldier.png';
// Importing the map image from assets
import mapBg from '../assets/map.png';

const HeroSection = () => {
  const images = [docImg, pilotImg, soldierImg];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    // The main section uses the First Color (#ececec) as the base background
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-light">
      
      {/* Map Background Layer */}
      <div className="absolute inset-0 z-0">
        <img 
          src={mapBg} 
          alt="Map Background" 
          className="w-full h-full object-cover opacity-20 mix-blend-multiply" 
        />
        {/* Gradient Overlay: Fades from transparent to the First color at the bottom 
            to blend smoothly with the next section */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-light/30 to-brand-light" />
      </div>

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Image Carousel */}
          <div className="mb-8 inline-flex items-center justify-center animate-scale-in">
            <div className="relative">
              {/* Using Second Color for the glow effect */}
              <div className="absolute inset-0 bg-brand-teal/30 rounded-full blur-2xl animate-shield" />
              <div className="relative bg-gradient-to-br from-brand-slate to-brand-navy p-6 rounded-2xl shadow-elevated">
                <img 
                  key={currentImageIndex}
                  src={images[currentImageIndex]} 
                  alt="Role Icon" 
                  className="w-23 h-20 object-contain animate-fade-in"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 
            className="font-display text-5xl md:text-7xl font-bold mb-6 animate-fade-in text-brand-navy"
            style={{ animationDelay: '0.2s' }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-slate to-brand-navy">Raksha</span>
            <span className="text-brand-slate">Marg</span>
          </h1>

          {/* Subtitle */}
          <p 
            className="text-xl md:text-2xl font-display font-medium text-brand-slate/80 mb-4 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            Know Your Route. Travel with Confidence.
          </p>

          {/* Description */}
          <p 
            className="text-lg text-brand-slate/70 max-w-2xl mx-auto mb-10 animate-fade-in"
            style={{ animationDelay: '0.6s' }}
          >
            RakshaMarg helps women evaluate the safety of routes before traveling — day or night. 
            Make informed decisions and travel with awareness.
          </p>

          {/* CTA Button */}
          <div 
            className="animate-fade-in"
            style={{ animationDelay: '0.8s' }}
          >
            <Link to="/check-route">
              {/* Button uses Fourth color (Navy) text on Second color (Teal) background */}
              <Button className="bg-brand-navy text-white hover:bg-brand-slate px-8 py-6 text-lg rounded-full group">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Trust indicator */}
          <div 
            className="mt-12 flex items-center justify-center gap-2 text-sm text-brand-slate/60 animate-fade-in"
            style={{ animationDelay: '1s' }}
          >
            <Shield className="w-4 h-4 text-brand-teal" />
            <span>Empowering safe travels across India</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;