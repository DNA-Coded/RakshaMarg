import React from 'react';
import { Shield } from 'lucide-react';

const Footer = () => {
  return (
    // Fourth Color (Navy) Background, First Color (Light) Text
    <footer className="bg-brand-navy text-brand-light py-16">
      <div className="container px-4">
        <div className="max-w-6xl mx-auto">
          {/* Main footer content */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-brand-light/10 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-brand-teal" />
                </div>
                <span className="font-display text-2xl font-bold text-brand-light">RakshaMarg</span>
              </div>
              <p className="text-brand-light/70 mb-6 max-w-md">
                Empowering women to travel safely with route awareness and informed decision-making. 
                Know your route. Travel with confidence.
              </p>
            </div>
          </div>

          {/* Divider using Third Color (Slate) for subtlety */}
          <div className="border-t border-brand-slate pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-brand-light/60">
                © {new Date().getFullYear()} RakshaMarg. || Team DNA Coded || All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;