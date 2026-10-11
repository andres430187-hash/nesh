import React, { useState, useEffect } from 'react';
import {
  Play,
  Server,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Tv,
  Trash2,
  ChevronRight,
  AlertCircle,
  KeyRound,
  Check,
} from 'lucide-react';
import { NeshUser, SavedAccount } from '../types';
import { xtreamApi, XtreamApiException } from '../services/xtreamApi';

interface LoginScreenProps {
  onLoginSuccess: (user: NeshUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Campos vacíos por seguridad para que no entren con datos predeterminados
  const [loginMode, setLoginMode] = useState<'direct' | 'xtream'>('xtream');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    setSavedAccounts(xtreamApi.getSavedAccounts());
  }, []);

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
      // Si usas el usuario de admin, entramos directo al panel de administración
      if (u === 'admin' && p === 'admin2026') {
        onLoginSuccess({
          username: 'admin',
          status: 'Active',
          expiryDate: '2030-12-31 23:59:59',
          isTrial: false,
          maxConnections: 10,
          activeCons: 1,
          createdAt: '2025-01-01',
          isDemo: false,
          role: 'admin',
        } as any);
        return;
      }

      // LISTA BLANCA DE USUARIOS PERMITIDOS (Agregá acá los usuarios que vos vayas creando)
      const usuariosPermitidos = ['cliente1', 'usuario_vip']; // Modificá o agregá tus usuarios reales acá

      if (!usuariosPermitidos.includes(u)) {
        setErrorMessage('Usuario no autorizado o no registrado por el administrador.');
        setIsLoading(false);
        return;
      }

      // Si pasa la validación, intenta conectar normalmente con Xtream
      const targetServer = loginMode === 'xtream' ? serverUrl.trim() : '';

      const user = await xtreamApi.login({
        username: u,
        password: p,
        serverUrl: targetServer,
      });

      onLoginSuccess(user);
    } catch (err: any) {
      if (err instanceof XtreamApiException) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo conectar con el servidor. Verifica las credenciales.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSaved = (account: SavedAccount) => {
    setServerUrl(account.serverUrl);
    setUsername(account.username);
    setLoginMode('xtream');
  };

  const handleDeleteSaved = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    xtreamApi.removeSavedAccount(id);
    setSavedAccounts(xtreamApi.getSavedAccounts());
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

        {/* Mode Selector Tabs */}
        <div className="bg-[#121212] p-1.5 rounded-2xl border border-neutral-800 mb-4 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setLoginMode('direct');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginMode === 'direct'
                ? 'bg-[#00ff66] text-black shadow-[0_0_15px_rgba(0,255,102,0.35)]'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Usuario y Contraseña</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMode('xtream');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginMode === 'xtream'
                ? 'bg-[#00ff66] text-black shadow-[0_0_15px_rgba(0,255,102,0.35)]'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Servidor Xtream</span>
          </button>
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
          {loginMode === 'direct' ? (
            <div className="mb-5 pb-4 border-b border-neutral-800">
              <span className="text-xs font-bold text-white block">Acceso de Clientes</span>
              <span className="text-[11px] text-neutral-400">Ingresa tus credenciales para acceder</span>
            </div>
          ) : (
            <div className="mb-5 pb-4 border-b border-neutral-800">
              <span className="text-xs font-bold text-white block">Panel Xtream Codes Privado</span>
              <span className="text-[11px] text-neutral-400">Conecta la URL de tu proveedor IPTV</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Server URL Input (Only in Xtream mode) */}
            {loginMode === 'xtream' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                  URL del servidor IPTV
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00ff66]">
                    <Server className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://miservidor.com:8080"
                    className="w-full bg-[#1e1e1e] text-white pl-11 pr-4 py-3 rounded-xl border border-transparent focus:border-[#00ff66] focus:ring-1 focus:ring-[#00ff66] outline-none text-sm transition-all placeholder:text-neutral-500 font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 pl-1">
                  Incluye el host y puerto proporcionado por tu servicio IPTV
                </p>
              </div>
            )}

            {/* Username Input */}
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

            {/* Password Input */}
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

            {/* Submit Button */}
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

        {/* Saved accounts / Quick profile switch */}
        {savedAccounts.length > 0 && (
          <div className="mt-5 bg-[#121212] border border-neutral-800/80 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5 px-1 flex items-center justify-between">
              <span>Cuentas guardadas</span>
              <span className="text-[10px] text-neutral-500">{savedAccounts.length}</span>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {savedAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => handleSelectSaved(account)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 hover:border-[#00ff66]/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-[#00ff66] font-bold shrink-0">
                      {account.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-medium text-white truncate group-hover:text-[#00ff66] transition-colors">
                        {account.username}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {account.serverUrl}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSaved(e, account.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Eliminar de guardados"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-[#00ff66] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
