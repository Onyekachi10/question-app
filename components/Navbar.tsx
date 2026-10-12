'use client';

import React from 'react';
import { User } from '../types/qa';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Columns,
  PenLine,
  Eye,
  Volume2,
  VolumeX,
  ExternalLink,
  RotateCcw,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';

interface NavbarProps {
  currentView?: 'split' | 'asker' | 'viewer';
  onViewChange?: (view: 'split' | 'asker' | 'viewer') => void;
  activeQuestionExists?: boolean;
  onClear?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  user?: User | null;
  showViewSwitcher?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = 'split',
  onViewChange,
  activeQuestionExists = false,
  onClear = () => {},
  soundEnabled = true,
  onToggleSound = () => {},
  user,
  showViewSwitcher = true,
}) => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  const openNewTab = (view: 'asker' | 'viewer') => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.open(url.toString(), '_blank');
    }
  };

  return (
    <header className="w-full border-b border-[#4f3f35]/10 bg-[#fbf8f3]/80 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="w-8 h-8 rounded-full border border-[#4f3f35]/20 bg-[#4f3f35]/5 flex items-center justify-center text-[#4f3f35] group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-[#4f3f35]/15 stroke-[#4f3f35]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-xl sm:text-2xl font-normal tracking-wide text-[#382d26] group-hover:text-[#a45a3f] transition-colors">
                Questions &amp; Words
              </span>
            </div>
          </div>
        </button>

        {/* View Switcher Pills */}
        {showViewSwitcher && onViewChange && (
        <div className="flex items-center bg-[#4f3f35]/5 p-1 rounded-full border border-[#4f3f35]/10 shadow-xs">
          <button
            onClick={() => onViewChange('split')}
            className={`px-3.5 py-1.5 text-xs font-light tracking-[0.14em] uppercase rounded-full transition-all duration-300 flex items-center gap-1.5 ${
              currentView === 'split'
                ? 'bg-[#382d26] text-[#fbf8f3] shadow-sm'
                : 'text-[#6c5f57] hover:text-[#382d26] hover:bg-white/40'
            }`}
            title="Split view: See both sides side-by-side"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dual View</span>
            <span className="md:hidden">Dual</span>
          </button>

          <button
            onClick={() => onViewChange('asker')}
            className={`px-3.5 py-1.5 text-xs font-light tracking-[0.14em] uppercase rounded-full transition-all duration-300 flex items-center gap-1.5 ${
              currentView === 'asker'
                ? 'bg-[#382d26] text-[#fbf8f3] shadow-sm'
                : 'text-[#6c5f57] hover:text-[#382d26] hover:bg-white/40'
            }`}
            title="Upload/Ask view"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>

          <button
            onClick={() => onViewChange('viewer')}
            className={`px-3.5 py-1.5 text-xs font-light tracking-[0.14em] uppercase rounded-full transition-all duration-300 flex items-center gap-1.5 ${
              currentView === 'viewer'
                ? 'bg-[#382d26] text-[#fbf8f3] shadow-sm'
                : 'text-[#6c5f57] hover:text-[#382d26] hover:bg-white/40'
            }`}
            title="What the other party sees"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Observe</span>
          </button>
        </div>
        )}

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-full border transition-all duration-300 ${
              soundEnabled
                ? 'bg-white/60 border-[#4f3f35]/20 text-[#382d26] hover:bg-white'
                : 'border-transparent text-[#998d85] hover:text-[#6c5f57]'
            }`}
            title={soundEnabled ? 'Chimes active' : 'Chimes muted'}
            aria-label="Toggle chime"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-light tracking-[0.15em] uppercase rounded-full bg-white/50 hover:bg-white text-[#4f3f57] border border-[#4f3f35]/15 transition-all shadow-xs"
            title="View past conversations"
          >
            <LayoutDashboard className="w-3 h-3 text-[#6c5f57]" />
            <span>Dashboard</span>
          </button>

          {/* Open 2nd Tab button */}
          <button
            onClick={() => openNewTab('viewer')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-light tracking-[0.15em] uppercase rounded-full bg-white/50 hover:bg-white text-[#4f3f35] border border-[#4f3f35]/15 transition-all shadow-xs"
            title="Open Observer screen in a second window to test live connection"
          >
            <ExternalLink className="w-3 h-3 text-[#6c5f57]" />
            <span>2nd Tab</span>
          </button>

          {/* Clear Session */}
          {activeQuestionExists && (
            <button
              onClick={onClear}
              className="text-[11px] tracking-[0.12em] uppercase text-[#a45a3f] hover:text-[#874e38] hover:bg-[#a45a3f]/8 px-3 py-1.5 rounded-full border border-[#a45a3f]/25 transition-all flex items-center gap-1"
              title="Reset question and responses"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
          {/* User badge + Logout */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#4f3f35]/10">
              <span className="text-[11px] font-light text-[#6c5f57]">
                <span className="font-medium text-[#382d26]">{user.username}</span>
                {' · '}
                <span className="capitalize">{user.userRole}</span>
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-full text-[#998d85] hover:text-[#a45a3f] hover:bg-[#a45a3f]/8 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
