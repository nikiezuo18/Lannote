
import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { PenTool, Library, BookOpen, Settings } from 'lucide-react';
import { TargetLanguage } from '../types';

interface LayoutProps {
    targetLanguage: TargetLanguage;
    onSwitchLanguage: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ targetLanguage, onSwitchLanguage }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path 
      ? "text-ink-600 bg-ink-100" 
      : "text-ink-400 hover:text-ink-600 hover:bg-paper-200";
  };

  const flag = targetLanguage === 'Korean' ? '🇰🇷' : '🇯🇵';

  return (
    <div className="flex flex-col h-full bg-paper-50 max-w-md mx-auto shadow-2xl overflow-hidden border-x border-paper-200 relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ink-500 via-ink-400 to-sticker-500 z-50"></div>

      {/* Header */}
      <header className="px-6 py-5 bg-paper-50/90 backdrop-blur-sm border-b border-paper-200 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-2 group cursor-default">
            <div className="w-10 h-10 bg-ink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-ink-500/20 transform group-hover:rotate-12 transition-transform">
                <span className="mb-1">L</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-ink-900 font-sans">Lanote</h1>
            </div>
        </div>

        {/* Language Switcher */}
        <button 
            onClick={onSwitchLanguage}
            className="w-10 h-10 rounded-full bg-white border-2 border-paper-200 flex items-center justify-center text-xl shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:scale-110 active:scale-95 transition-all relative overflow-hidden group"
            title="Switch Language"
        >
            <span className="relative z-10">{flag}</span>
            <div className="absolute inset-0 bg-ink-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-paper-50">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-paper-200 px-6 py-3 pb-6 sticky bottom-0 z-10 rounded-t-3xl shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
        <ul className="flex justify-between items-center">
          <li>
            <Link to="/parser" className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive('/parser')}`}>
              <PenTool size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">Notes</span>
            </Link>
          </li>
          <li>
            <Link to="/library" className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive('/library')}`}>
              <Library size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">Library</span>
            </Link>
          </li>
          <li>
            <Link to="/study" className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive('/study')}`}>
              <BookOpen size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">Study</span>
            </Link>
          </li>
          <li>
            <Link to="/settings" className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${isActive('/settings')}`}>
              <Settings size={22} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">Config</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};
