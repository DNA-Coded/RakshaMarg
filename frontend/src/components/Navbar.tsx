import React, { useState, useEffect } from 'react';
import { Shield, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = location.pathname === '/';

  // Define dynamic classes based on state
  // Using brand-navy (#142d4c) for background and brand-light (#ececec) for text
  const navBackgroundClass = isScrolled || !isHome 
    ? 'bg-brand-navy/95 backdrop-blur-md shadow-md' 
    : 'bg-transparent';
    
  const textColorClass = isScrolled || !isHome || isMobileMenuOpen
    ? 'text-brand-light' 
    : 'text-brand-navy'; // Dark text on transparent hero bg, Light text on Navy navbar

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBackgroundClass}`}>
      <div className="container px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className={`p-1.5 rounded-lg transition-colors bg-brand-light/10`}>
              <Shield className={`w-6 h-6 ${textColorClass}`} />
            </div>
            <span className={`font-display text-xl font-bold transition-colors ${textColorClass}`}>
              RakshaMarg
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-medium transition-colors hover:text-brand-teal ${textColorClass}`}>
              Home
            </Link>
            <Link to="/check-route" className={`text-sm font-medium transition-colors hover:text-brand-teal ${textColorClass}`}>
              Check Route
            </Link>
            <a href="#how-it-works" className={`text-sm font-medium transition-colors hover:text-brand-teal ${textColorClass}`}>
              How It Works
            </a>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link to="/check-route">
              {/* Using Second Color (Teal) for the button for contrast */}
              <Button className="bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className={`w-6 h-6 ${textColorClass}`} />
            ) : (
              <Menu className={`w-6 h-6 ${textColorClass}`} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-brand-navy border-t border-brand-slate py-4 animate-fade-in absolute left-0 right-0 top-16 shadow-xl">
            <div className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-brand-light font-medium px-4 py-2 hover:bg-brand-slate/50 rounded-lg mx-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/check-route" 
                className="text-brand-light font-medium px-4 py-2 hover:bg-brand-slate/50 rounded-lg mx-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Check Route
              </Link>
              <a 
                href="#how-it-works" 
                className="text-brand-light font-medium px-4 py-2 hover:bg-brand-slate/50 rounded-lg mx-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <div className="px-4 pt-2">
                <Link to="/check-route" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-brand-teal text-brand-navy hover:bg-brand-teal/90">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;