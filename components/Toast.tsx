'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-gentle-enter">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#fbf8f3]/95 border border-[#4f3f35]/20 text-[#382d26] shadow-xl backdrop-blur-md">
        <div className="w-6 h-6 rounded-full bg-[#4f3f35]/8 text-[#a45a3f] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs font-light tracking-wide text-[#382d26]">{message}</p>
        <button
          onClick={onClose}
          className="text-[#998d85] hover:text-[#382d26] p-1 rounded-full transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
