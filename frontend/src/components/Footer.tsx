import React from 'react';

const Footer = () => {
  return (

    <footer className="bg-brand-navy text-brand-light py-6 border-t border-white/10">
      <div className="container px-4">
        <div className="flex flex-col items-center text-center gap-2">
          <p className="text-base text-brand-light/60">
            © {new Date().getFullYear()} RakshaMarg. All rights reserved.
          </p>
          <p className="text-sm tracking-widest uppercase opacity-80 text-brand-purple font-medium">
            Team DNA Coded
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;