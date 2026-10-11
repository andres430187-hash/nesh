import React, { useState } from 'react';
import {
  Smartphone,
  Tv,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
  Download,
  Package,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'direct' | 'tv' | 'apk'>('direct');
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pwaBuilderUrl = `https://www.pwabuilder.com/?url=${encodeURIComponent(currentUrl)}`;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  const handleCopyAppUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00ff66]/15 border border-[#00ff66] flex items-center justify-center text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Instalar NesTV</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#00ff66] text-black">
                  App Nativa
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Usa NesTV como aplicación instalada en tu Android o Smart TV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-neutral-800 flex gap-2 bg-[#161616]">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'direct'
                ? 'border-[#00ff66] text-[#00ff66]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Instalar en Android</span>
          </button>

          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tv'
                ? 'border-[#00ff66] text-[#00ff66]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Smart TV & TV Box</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'apk'
                ? 'border-[#00ff66] text-[#00ff66]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Descargar Archivo APK</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: INSTALAR DIRECTO EN ANDROID */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#00ff66]/10 border border-[#00ff66]/30 text-xs sm:text-sm leading-relaxed text-neutral-200">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <Sparkles className="w-4 h-4 text-[#00ff66]" />
                  <span>Experiencia idéntica a una APK nativa</span>
                </div>
                <p>
                  NesTV se instala como aplicación independiente con su icono oficial en tu pantalla de inicio, inicio rápido y pantalla completa sin barras de navegación.
                </p>
              </div>

              {isInstalled ? (
                <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#00ff66]/20 text-[#00ff66] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">¡NesTV ya está instalada en tu dispositivo!</h4>
                  <p className="text-xs text-neutral-400">
                    Puedes abrirla directamente desde el icono en tu pantalla de inicio o cajón de aplicaciones.
                  </p>
                </div>
              ) : isInstallable ? (
                <div className="p-6 rounded-2xl bg-[#181818] border border-neutral-800 text-center space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-white">Tu dispositivo está listo para instalar</h4>
                    <p className="text-xs text-neutral-400 mt-1">
                      Presiona el botón a continuación para añadir NesTV a tus aplicaciones de Android
                    </p>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-4 px-6 rounded-2xl bg-[#00ff66] text-black font-extrabold text-base tracking-wider uppercase shadow-[0_0_25px_rgba(0,255,102,0.4)] hover:bg-[#00cc52] transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="w-5 h-5 fill-black" />
                    <span>INSTALAR APLICACIÓN AHORA</span>
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#181818] border border-neutral-800 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#00ff66]" />
                    <span>Instalación rápida en tu teléfono:</span>
                  </h4>
                  <div className="space-y-2.5 text-xs text-neutral-300">
                    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900/80">
                      <span className="w-5 h-5 rounded-full bg-[#00ff66] text-black font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        1
                      </span>
                      <span>En <strong>Google Chrome</strong> en tu celular, pulsa en el menú de los <strong>tres puntos (⋮)</strong> arriba a la derecha.</span>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900/80">
                      <span className="w-5 h-5 rounded-full bg-[#00ff66] text-black font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        2
                      </span>
                      <span>Toca en <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</span>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-900/80">
                      <span className="w-5 h-5 rounded-full bg-[#00ff66] text-black font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </span>
                      <span>¡Listo! NesTV se instalará automáticamente con su icono verde en tu menú de aplicaciones.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Share link to client */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs">
                <span className="text-neutral-400 truncate max-w-xs">
                  Enlace de tu aplicación: <strong className="text-white">{currentUrl}</strong>
                </span>
                <button
                  onClick={handleCopyAppUrl}
                  className="px-3 py-1.5 rounded-xl bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/40 text-[#00ff66] font-semibold text-xs cursor-pointer transition-colors shrink-0"
                >
                  {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SMART TV */}
          {activeTab === 'tv' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Tv className="w-4 h-4 text-[#00ff66]" />
                  <span>Cómo usar NesTV en Smart TV, Android TV o TV Box</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  NesTV incluye soporte para <strong>control remoto</strong> (flechas arriba/abajo/izquierda/derecha para navegar y OK para reproducir a pantalla completa).
                </p>

                <div className="space-y-2.5 text-xs text-neutral-300">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="font-bold text-white block mb-1">Método 1: Navegador de la TV (Chrome / Silk / TV Bro)</span>
                    <p className="text-neutral-400">
                      Abre el navegador en tu Smart TV o TV Box, entra a este enlace ({currentUrl}) y pulsa en "Guardar en favoritos" o "Añadir a la pantalla de inicio".
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
                    <span className="font-bold text-white block mb-1">Método 2: App "Downloader"</span>
                    <p className="text-neutral-400">
                      En Firestick o Android TV, abre la app gratuita <strong>Downloader</strong> desde la tienda, escribe tu enlace y abre la aplicación en modo completo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DESCARGAR ARCHIVO APK */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Package className="w-4 h-4 text-[#00ff66]" />
                  <span>Generar e instalar archivo .APK</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Si requieres un archivo <strong>.APK instalador</strong> físico para pasarlo por cable o compartir el instalador directo, puedes generarlo con 1 clic mediante la herramienta oficial de Google/Microsoft <strong>PWABuilder</strong>:
                </p>

                <div className="p-3 rounded-xl bg-black/60 border border-neutral-800 font-mono text-xs text-neutral-300 break-all">
                  {currentUrl}
                </div>

                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#00ff66] text-black font-extrabold text-sm tracking-wide uppercase shadow-[0_0_20px_rgba(0,255,102,0.3)] hover:bg-[#00cc52] transition-all flex items-center justify-center gap-2 cursor-pointer no-underline block text-center"
                >
                  <span>GENERAR APK EN PWABUILDER (1 CLIC)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/60 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
