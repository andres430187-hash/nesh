import React, { useState } from 'react';
import {
  Play,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { NeshUser } from '../types';
import { xtreamApi, XtreamApiException } from '../services/xtreamApi';

interface LoginScreenProps {
  onLoginSuccess: (user: NeshUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const u = username.trim();
    const p = password.trim();

    if (!u) {
      setErrorMessage('Por favor ingresa tu nombre de usuario');
      return;
    }
    if (!p) {
      setErrorMessage('Por favor ingresa tu contraseña');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Llama directamente al sistema seguro que valida con tus usuarios creados
      const user = await xtreamApi.login({
        username: u,
        password: p,
      });

      onLoginSuccess(user);
    } catch (err: any) {
      if (err instanceof XtreamApiException) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Usuario o contraseña incorrectos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00ff66]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo and App Title */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-4 sm:p-5 rounded-full bg-[#00ff66]/15 border-2 border-[#00ff66] shadow-[0_0_35px_rgba(0,255,102,0.35)] mb-4 group transition-transform hover:scale-105 duration-300">
            <Play className="w-10 sm:w-12 h-10 sm:h-12 text-[#00ff66] fill-[#00ff66] translate-x-0.5" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-[#00ff66] drop-shadow-[0_0_15px_rgba(0,255,102,0.4)]">
            NESH
          </h1>
          <p className="text-xs tracking-widest text-neutral-400 mt-2 font-medium">
            TU MUNDO DE ENTRETENIMIENTO EN STREAMING
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-[#121212] border border-neutral-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          <div className="mb-5 pb-4 border-b border-neutral-800">
            <span className="text-xs font-bold text-white block">Acceso de Clientes</span>
            <span className="text-[11px] text-neutral-400">Ingresa tu usuario y contraseña asignados</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00ff66]">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="w-full bg-[#1e1e1e] text-white pl-11 pr-4 py-3.5 rounded-xl border border-transparent focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66] outline-none text-sm transition-all placeholder:text-neutral-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00ff66]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="w-full bg-[#1e1e1e] text-white pl-11 pr-11 py-3.5 rounded-xl border border-transparent focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66] outline-none text-sm transition-all placeholder:text-neutral-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-[#00ff66] hover:bg-[#00cc52] active:scale-[0.99] text-black font-extrabold text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,255,102,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>INICIAR SESIÓN</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
