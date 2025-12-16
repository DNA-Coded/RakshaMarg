import React, { useRef, useState, useEffect } from 'react';
import { Shield, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
// Importing assets
import mapBg from '../assets/map.png';
import docImg from '../assets/doc.png';
import pilotImg from '../assets/pilot.png';
import soldierImg from '../assets/soldier.png';

const HeroSection = () => {
  const ref = useRef(null);
  
  // Floating Images Logic
  const images = [docImg, pilotImg, soldierImg];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Parallax hooks
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <section ref={ref} className="relative h-screen w-full overflow-hidden bg-brand-dark">
      
      {/* --- LAYER 1: CINEMATIC BACKGROUND --- */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0">
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-brand-dark/30 mix-blend-multiply z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent z-20" />
        
        {/* MAP IMAGE */}
        <img 
          src={mapBg} 
          alt="Safety Map Background" 
          className="w-full h-full object-cover opacity-60 grayscale-[100%] contrast-[1.25] brightness-75" 
        />
        
        {/* SCANNING RADAR EFFECT */}
        <motion.div 
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 w-full h-[2px] bg-brand-teal shadow-[0_0_20px_#2dd4bf] z-10 opacity-60"
        />
      </motion.div>

      {/* --- LAYER 2: GRID OVERLAY --- */}
      <div className="absolute inset-0 z-10 opacity-20 pointer-events-none">
        <div 
          className="w-full h-full" 
          style={{ 
            backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.2) 1px, transparent 1px)', 
            backgroundSize: '80px 80px' 
          }} 
        />
      </div>

      {/* --- LAYER 3: MAIN CONTENT (Bottom Left) --- */}
      <div className="absolute bottom-0 left-0 z-30 w-full p-6 md:p-20 pb-12 md:pb-24">
        {/* FIX APPLIED HERE: 
            Added lg:max-w-[55%] to ensure text stays on the left half 
            on laptop screens (lg/xl) where the box is visible.
        */}
        <div className="max-w-5xl lg:max-w-[55%] xl:max-w-[65%] 2xl:max-w-5xl transition-all duration-300">
          
          {/* Glowing Badge */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex items-center gap-3 mb-6 md:mb-8"
          >
            <div className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-2 bg-brand-purple/10 backdrop-blur-md border border-brand-purple/30 rounded-full text-brand-purple shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Activity className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
              <span className="text-[0.6rem] md:text-xs font-bold tracking-[0.2em] uppercase">System Online</span>
            </div>
          </motion.div>

          {/* Title - RESPONSIVE SIZES FIXED */}
          <div className="overflow-hidden mb-4 md:mb-6 pb-2 md:pb-4">
            {/* FIX EXPLANATION:
                md:text-[9rem] was too big for laptops when the box appeared.
                - lg:text-[6rem]: Shrinks text on 13" laptops (1024px-1280px)
                - xl:text-[7.5rem]: Slightly larger on 14"-15" laptops
                - 2xl:text-[9rem]: Back to massive size on Desktops
            */}
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl sm:text-7xl md:text-[9rem] lg:text-[6rem] xl:text-[7.5rem] 2xl:text-[9rem] font-bold text-white leading-[0.9] tracking-tighter transition-all duration-300"
            >
              Raksha<span className="text-brand-purple">Marg</span>
            </motion.h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="text-base md:text-xl text-white/70 max-w-lg font-light leading-relaxed border-l-2 border-brand-teal/50 pl-4 md:pl-6"
            >
               Navigate the night with intelligence. Real-time route analysis, 
               predictive safety scoring, and a community watching over you.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/check-route">
                <Button 
                  size="xl" 
                  className="h-14 md:h-20 px-6 md:px-10 rounded-full bg-brand-purple text-white hover:bg-brand-teal hover:text-brand-dark font-bold text-base md:text-lg shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-500 group"
                >
                  Analyze Route
                  <div className="ml-3 w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-brand-dark/20 transition-colors">
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* --- LAYER 4: FLOATING HUD & IMAGES (Right Side) --- */}
      {/* FIX APPLIED HERE:
          - lg:scale-75: Shrink box to 75% on 13" laptops
          - xl:scale-90: Shrink box to 90% on larger laptops
          - lg:origin-bottom-right: Ensures it shrinks away from the center text
      */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-24 right-8 md:right-20 lg:right-12 xl:right-20 z-30 hidden lg:flex flex-col gap-6 lg:scale-75 xl:scale-90 2xl:scale-100 lg:origin-bottom-right transition-transform duration-300"
      >
        {/* 1. Secured Personnel Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl w-72 backdrop-blur-2xl border-l-4 border-l-brand-purple">
          <div className="flex items-center gap-4 mb-4">
             <div className="relative w-12 h-12 flex items-center justify-center">
                <AnimatePresence mode='wait'>
                    <motion.img 
                        key={currentImageIndex}
                        src={images[currentImageIndex]}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className="w-12 h-12 object-contain absolute"
                        alt="Role Icon"
                    />
                </AnimatePresence>
             </div>
             <div>
                <div className="text-xl font-bold text-white">Secured</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Active Personnel</div>
             </div>
          </div>
          <div className="flex items-center gap-2 text-brand-purple text-xs font-mono">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-purple opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-purple"></span>
             </span>
             LIVE TRACKING
          </div>
        </div>

        {/* 2. Status Check Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl w-72 backdrop-blur-2xl border-l-4 border-l-brand-teal">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-teal/20 flex items-center justify-center text-brand-teal">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Safe</div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Zone Status</div>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: "94%" }}
               transition={{ delay: 2, duration: 1.5, ease: "circOut" }}
               className="h-full bg-brand-teal shadow-[0_0_10px_#2dd4bf]" 
             />
          </div>
        </div>

      </motion.div>

    </section>
  );
};

export default HeroSection;