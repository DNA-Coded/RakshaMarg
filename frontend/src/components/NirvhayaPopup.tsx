import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatAssistant } from './ChatAssistant';
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

  const toggleChat = () => {
    setIsOpen(!isOpen);
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

          {/* Main button */}
          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-110 cursor-pointer">
            <MessageCircle size={28} strokeWidth={2} />
          </div>

          {/* Notification badge (optional) */}
          <div className="nirvhaya-badge absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
            1
          </div>
        </div>
      </button>

      {/* Chat Popup Container */}
      <div
        className={`nirvhaya-popup fixed bottom-0 right-0 z-50 transition-all duration-300 ease-out transform ${
          isOpen
            ? 'scale-100 opacity-100 translate-y-0 translate-x-0'
            : 'scale-95 opacity-0 translate-y-4 translate-x-4 pointer-events-none'
        }`}
        style={{
          transformOrigin: 'bottom right'
        }}
      >
        {/* Popup Container */}
        <div className="nirvhaya-transition flex flex-col h-screen md:h-[600px] md:w-[450px] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="nirvhaya-header text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-full p-2">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Nirbhaya</h3>
                <p className="text-xs text-white/80">Your Safety Assistant</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="nirvhaya-close-btn text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Close Nirvhaya"
            >
              <X size={24} />
            </button>
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
