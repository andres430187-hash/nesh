import React from 'react';
import {
  Play,
  Tv,
  Film,
  Clapperboard,
  Search,
  Heart,
  User,
  LogOut,
  X,
  Radio,
  Shield,
  Download,
} from 'lucide-react';
import { NeshContentType, NeshUser } from '../types';

interface NavbarProps {
  currentTab: NeshContentType;
  onTabChange: (tab: NeshContentType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  favoritesCount: number;
  user: NeshUser;
  onOpenAccount: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onOpenInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  showFavoritesOnly,
  onToggleFavorites,
  favoritesCount,
  user,
  onOpenAccount,
  onLogout,
  onOpenAdmin,
  onOpenInstall,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#00ff66]/15 border border-[#00ff66] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <Play className="w-5 h-5 text-[#00ff66] fill-[#00ff66] translate-x-0.5" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-widest text-[#00ff66] drop-shadow-[0_0_10px_rgba(0,255,102,0.4)]">
                NESH
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                IPTV TV
              </span>
            </div>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#121212] p-1.5 rounded-2xl border border-neutral-800">
            <button
              onClick={() => onTabChange('live')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'live'
                  ? 'bg-[#00ff66] text-black shadow-[0_0_15px_rgba(0,255,102,0.35)] font-bold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>En Vivo</span>
            </button>

            <button
              onClick={() => onTabChange('vod')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'vod'
                  ? 'bg-[#00ff66] text-black shadow-[0_0_15px_rgba(0,255,102,0.35)] font-bold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Películas</span>
            </button>

            <button
              onClick={() => onTabChange('series')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'series'
                  ? 'bg-[#00ff66] text-black shadow-[0_0_15px_rgba(0,255,102,0.35)] font-bold'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Clapperboard className="w-4 h-4" />
              <span>Series</span>
            </button>
          </nav>

          {/* Search bar & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-md">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar canal, película..."
                className="w-full bg-[#1e1e1e] text-white pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm border border-transparent focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66] outline-none transition-all placeholder:text-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Favorites filter toggle */}
            <button
              onClick={onToggleFavorites}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                showFavoritesOnly
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-[#1e1e1e] border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
              title="Filtrar Favoritos"
            >
              <Heart
                className={`w-4 h-4 ${
                  showFavoritesOnly ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              {favoritesCount > 0 && (
                <span className="hidden sm:inline-block">{favoritesCount}</span>
              )}
            </button>

            {/* Install App button */}
            {onOpenInstall && (
              <button
                onClick={onOpenInstall}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-[#00ff66] text-white hover:text-[#00ff66] font-semibold text-xs tracking-wide transition-all cursor-pointer"
                title="Instalar NesTV en Android o TV"
              >
                <Download className="w-4 h-4 text-[#00ff66]" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            {/* Admin Panel button (Only for Admin users) */}
            {user.role === 'admin' && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/60 text-[#00ff66] font-bold text-xs tracking-wide shadow-[0_0_15px_rgba(0,255,102,0.25)] transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Abrir Panel de Administración de Usuarios"
              >
                <Shield className="w-4 h-4 fill-[#00ff66]/20" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Account Profile button */}
            <button
              onClick={onOpenAccount}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 hover:border-[#00ff66]/40 cursor-pointer transition-all text-xs"
              title="Información de la cuenta"
            >
              <div className="w-6 h-6 rounded-lg bg-[#00ff66]/20 border border-[#00ff66]/40 flex items-center justify-center text-[#00ff66] font-bold text-xs shrink-0">
                <User className="w-3.5 h-3.5 text-[#00ff66]" />
              </div>
              <div className="text-left hidden lg:block">
                <div className="font-semibold text-white truncate max-w-[100px]">
                  {user.username}
                </div>
                <div className="text-[10px] text-[#00ff66]">
                  {user.isDemo ? 'Demo Activo' : 'Activo'}
                </div>
              </div>
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-[#1e1e1e] hover:bg-red-950/40 border border-neutral-800 hover:border-red-500/50 text-neutral-400 hover:text-red-400 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-neutral-900 bg-black">
          <button
            onClick={() => onTabChange('live')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg text-xs font-semibold ${
              currentTab === 'live' ? 'text-[#00ff66]' : 'text-neutral-400'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>En Vivo</span>
          </button>
          <button
            onClick={() => onTabChange('vod')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg text-xs font-semibold ${
              currentTab === 'vod' ? 'text-[#00ff66]' : 'text-neutral-400'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Películas</span>
          </button>
          <button
            onClick={() => onTabChange('series')}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg text-xs font-semibold ${
              currentTab === 'series' ? 'text-[#00ff66]' : 'text-neutral-400'
            }`}
          >
            <Clapperboard className="w-4 h-4" />
            <span>Series</span>
          </button>
        </div>
      </div>
    </header>
  );
};
