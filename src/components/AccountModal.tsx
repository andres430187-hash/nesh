import React from 'react';
import {
  X,
  User,
  Server,
  Calendar,
  CheckCircle2,
  Clock,
  Radio,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { NeshUser } from '../types';

interface AccountModalProps {
  user: NeshUser;
  onClose: () => void;
  onLogout: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  user,
  onClose,
  onLogout,
}) => {
  const formatExpiry = (exp?: string) => {
    if (!exp) return 'Ilimitado / No disponible';
    // If Unix timestamp
    if (/^\d+$/.test(exp)) {
      const date = new Date(parseInt(exp) * 1000);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return exp;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#121212] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#00ff66]/15 border border-[#00ff66]/40 flex items-center justify-center text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)]">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{user.username}</span>
              {user.isDemo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  DEMO
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-[#00ff66] font-semibold mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Cuenta Activa</span>
            </div>
          </div>
        </div>

        {/* Details list */}
        <div className="space-y-3.5 bg-[#181818] p-4 rounded-2xl border border-neutral-800/80 mb-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-2 text-xs">
              <Server className="w-4 h-4 text-[#00ff66]" />
              <span>Servidor Xtream:</span>
            </span>
            <span className="text-white font-mono text-xs truncate max-w-[180px]">
              {user.serverUrl}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-[#00ff66]" />
              <span>Vencimiento:</span>
            </span>
            <span className="text-white text-xs font-semibold">
              {formatExpiry(user.expiryDate)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-2 text-xs">
              <Radio className="w-4 h-4 text-[#00ff66]" />
              <span>Conexiones activas:</span>
            </span>
            <span className="text-white text-xs font-semibold">
              {user.activeCons ?? 1} / {user.maxConnections ?? 1}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#00ff66]" />
              <span>Tipo de cuenta:</span>
            </span>
            <span className="text-white text-xs font-semibold">
              {user.isTrial ? 'Prueba (Trial)' : 'Premium / Ilimitado'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="flex-1 py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
