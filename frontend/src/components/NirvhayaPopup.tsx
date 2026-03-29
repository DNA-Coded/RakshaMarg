import React, { useEffect, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import ChatAssistant from '@/components/ChatAssistant';
import nirbhayaLogo from '@/assets/nirbhaya_bot_img.png';
import './NirvhayaPopup.css';

interface NirvhayaPopupProps {
  journeyContext?: any;
  onEmergencyDetected?: (guidance: any) => void;
  onSOSRequested?: () => void;
}

/**
 * Nirvhaya - Floating Chatbot Popup Component
 * A minimalist popup chatbot that appears as a small icon in the corner
 * and expands to full chat interface when clicked
 */
export const NirvhayaPopup: React.FC<NirvhayaPopupProps> = ({
  journeyContext,
  onEmergencyDetected,
  onSOSRequested
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isOpen) setIsMaximized(false);
  };

  const toggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
  };

  return (
    <>
      {/* Floating Button - Nirvhaya Icon */}
      <button
        onClick={toggleChat}
        className={`nirvhaya-button fixed bottom-6 right-6 z-40 transition-all duration-300 ease-out transform ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        aria-label="Open Nirvhaya Safety Assistant"
        title="Nirvhaya Safety Assistant"
      >
        <div className="relative">
          {/* Animated background pulse */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse opacity-50"></div>

          {/* Main button with logo */}
          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-2 shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-110 cursor-pointer flex items-center justify-center overflow-hidden">
            <img 
              src={nirbhayaLogo} 
              alt="Nirbhaya" 
              className="w-10 h-10 object-contain rounded-full"
            />
          </div>

          {/* Notification badge (optional) */}
          <div className="nirvhaya-badge absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            1
          </div>
        </div>
      </button>

      {/* Chat Popup Container */}
      <div
        className={`nirvhaya-popup z-50 transition-all duration-300 ease-out ${
          isMaximized
            ? 'fixed inset-0'
            : `fixed bottom-0 right-0 transform ${
                isOpen
                  ? 'scale-100 opacity-100 translate-y-0 translate-x-0'
                  : 'scale-95 opacity-0 translate-y-4 translate-x-4 pointer-events-none'
              }`
        } ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onWheelCapture={(e) => e.stopPropagation()}
        onTouchMoveCapture={(e) => e.stopPropagation()}
        style={{
          transformOrigin: isMaximized ? 'center center' : 'bottom right'
        }}
      >
        {/* Popup Container */}
        <div className={`nirvhaya-transition flex flex-col border border-white/10 bg-slate-950/80 shadow-2xl overflow-hidden transition-all duration-300 ${
          isMaximized
            ? 'w-screen h-screen fixed inset-0 rounded-none'
            : 'h-screen w-screen rounded-none md:mb-3 md:mr-3 md:h-[78vh] md:max-h-[640px] md:w-[430px] md:max-w-[calc(100vw-1rem)] md:rounded-2xl'
        }`}>
          {/* Header */}
          <div className="nirvhaya-header text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 w-12 h-12 flex items-center justify-center">
                <img 
                  src={nirbhayaLogo} 
                  alt="Nirbhaya" 
                  className="w-8 h-8 object-contain rounded-full"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">Nirbhaya</h3>
                <p className="text-xs text-white/80">Your Safety Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMaximize}
                className="nirvhaya-close-btn text-white hover:bg-white/20 rounded-full p-2 transition-colors hidden md:block"
                aria-label={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button
                onClick={toggleChat}
                className="nirvhaya-close-btn text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close Nirvhaya"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            <ChatAssistant
              journeyContext={journeyContext}
              onEmergencyDetected={onEmergencyDetected}
              onSOSRequested={onSOSRequested}
              isMinimized={false}
              isInPopup={true}
            />
          </div>
        </div>
      </div>

      {/* Overlay backdrop (optional, for mobile) */}
      {isOpen && (
        <div
          className="nirvhaya-overlay open fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={toggleChat}
          aria-label="Close chat"
        />
      )}
    </>
  );
};
