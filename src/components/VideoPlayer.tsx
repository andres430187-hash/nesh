import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Tv,
  RotateCcw,
  SkipBack,
  SkipForward,
  Heart,
  Settings,
  Layers,
  Check,
  AlertTriangle,
  Radio,
  Clock,
} from 'lucide-react';
import { NeshActiveStream, NeshContentType } from '../types';

interface VideoPlayerProps {
  activeStream: NeshActiveStream;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  relatedStreams?: any[];
  onSelectRelated?: (item: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  activeStream,
  onClose,
  onNext,
  onPrev,
  isFavorite,
  onToggleFavorite,
  relatedStreams = [],
  onSelectRelated,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill' | 'original'>('contain');
  const [useProxy, setUseProxy] = useState(false);
  const [showQuickList, setShowQuickList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine current active URL
  const currentStreamUrl = useProxy && activeStream.proxyStreamUrl
    ? activeStream.proxyStreamUrl
    : activeStream.streamUrl;

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 4000);
  }, [isPlaying]);

  // Android Back button, Smart TV remote control, and Screen Wake Lock
  useEffect(() => {
    // 1. Android physical back button integration
    window.history.pushState({ playerOpen: true }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    // 2. D-pad TV Remote & Keyboard Controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          onClose();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current && activeStream.type !== 'live') {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          } else if (onPrev) {
            onPrev();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current && activeStream.type !== 'live') {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
          } else if (onNext) {
            onNext();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, (videoRef.current.volume || 0) + 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, (videoRef.current.volume || 0) - 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);

    // 3. Screen Wake Lock (prevents Android screen sleeping during video)
    let wakeLockSentinel: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock?.request('screen').then((lock: any) => {
        wakeLockSentinel = lock;
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [onClose, onNext, onPrev, activeStream.type]);

  // Load and play stream
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setError(null);

    // Destroy existing hls instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = currentStreamUrl;
    const isHls = url.includes('.m3u8') || url.includes('/live/') || activeStream.type === 'live';

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay blocked by browser policy, user needs to click play
          setIsPlaying(false);
        });
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('HLS Event Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy && activeStream.proxyStreamUrl) {
                console.log('Failing over to proxy stream...');
                setUseProxy(true);
                return;
              }
              setError('Error de conexión con el flujo de video. Es posible que el stream esté fuera de línea.');
              hls.destroy();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('No se pudo reproducir este formato de transmisión.');
              hls.destroy();
              break;
          }
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      // Native video element playback (Safari or MP4)
      video.src = url;
      video
        .play()
        .then(() => {
          setIsLoading(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsLoading(false);
        });
    } else {
      setError('Formato no soportado por este navegador.');
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentStreamUrl, activeStream, useProxy]);

  // Video event listeners
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 0.5;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const handleTogglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP not supported or failed', e);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLive = activeStream.type === 'live' || isNaN(duration) || duration === 0 || !isFinite(duration);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onClick={handlePlayPause}
        playsInline
        className={`w-full h-full cursor-pointer transition-all ${
          aspectRatio === 'cover'
            ? 'object-cover'
            : aspectRatio === 'fill'
            ? 'object-fill'
            : 'object-contain'
        }`}
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="w-14 h-14 border-4 border-neutral-800 border-t-[#00ff66] rounded-full animate-spin shadow-[0_0_25px_rgba(0,255,102,0.4)]" />
          <p className="mt-4 text-xs font-semibold tracking-wider text-[#00ff66] uppercase">
            Cargando transmisión...
          </p>
        </div>
      )}

      {/* Error View */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Error de reproducción</h3>
          <p className="text-sm text-neutral-400 max-w-md mb-6">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setUseProxy(!useProxy);
                setError(null);
                setIsLoading(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#00ff66] text-black font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:bg-[#00cc52] transition-colors cursor-pointer"
            >
              {useProxy ? 'Reintentar directo' : 'Intentar mediante proxy seguro'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Volver al catálogo
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Header Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-neutral-800 border border-neutral-700/80 text-white transition-all hover:scale-105 cursor-pointer shadow-lg"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-[#00ff66]/20 border border-[#00ff66]/40 text-[#00ff66]">
                  {activeStream.type === 'live' ? 'En Vivo' : activeStream.type === 'vod' ? 'Película' : 'Episodio'}
                </span>
                {activeStream.categoryName && (
                  <span className="text-xs text-neutral-400 font-medium">
                    {activeStream.categoryName}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white truncate drop-shadow mt-0.5">
                {activeStream.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Favorite button */}
            <button
              onClick={onToggleFavorite}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-black/60 border-neutral-700/80 text-neutral-300 hover:text-white'
              }`}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Quick Channel / Stream list drawer button */}
            {relatedStreams.length > 0 && (
              <button
                onClick={() => setShowQuickList(!showQuickList)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  showQuickList
                    ? 'bg-[#00ff66] text-black border-[#00ff66]'
                    : 'bg-black/60 border-neutral-700/80 text-neutral-300 hover:text-white'
                }`}
                title="Lista rápida de canales"
              >
                <Layers className="w-5 h-5" />
              </button>
            )}

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                showSettings
                  ? 'bg-[#00ff66] text-black border-[#00ff66]'
                  : 'bg-black/60 border-neutral-700/80 text-neutral-300 hover:text-white'
              }`}
              title="Ajustes de video"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Big Play Button (if paused) */}
        {!isPlaying && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={handlePlayPause}
              className="w-20 h-20 rounded-full bg-[#00ff66] text-black flex items-center justify-center shadow-[0_0_35px_rgba(0,255,102,0.6)] hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer"
            >
              <Play className="w-10 h-10 fill-black translate-x-1" />
            </button>
          </div>
        )}

        {/* Settings Flyout */}
        {showSettings && (
          <div className="absolute top-20 right-6 w-72 bg-[#121212]/95 border border-neutral-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md pointer-events-auto z-20">
            <h4 className="text-xs uppercase font-bold text-neutral-400 tracking-wider mb-3">
              Ajustes de reproducción
            </h4>
            
            {/* Aspect Ratio */}
            <div className="mb-4">
              <label className="text-xs text-neutral-300 block mb-2 font-medium">
                Relación de aspecto:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['contain', 'cover', 'fill'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAspectRatio(mode)}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer ${
                      aspectRatio === mode
                        ? 'bg-[#00ff66] text-black shadow-sm font-bold'
                        : 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {mode === 'contain' ? 'Auto' : mode === 'cover' ? 'Llenar' : 'Estirar'}
                  </button>
                ))}
              </div>
            </div>

            {/* Proxy Toggle */}
            <div className="pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Proxy Servidor</span>
                  <span className="text-[10px] text-neutral-400">Bypass CORS / SSL</span>
                </div>
                <button
                  onClick={() => setUseProxy(!useProxy)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    useProxy ? 'bg-[#00ff66]' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${
                      useProxy ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Controls Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-auto">
          {/* Progress bar (VOD / Movies / Episodes) */}
          {!isLive && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs font-mono text-neutral-300 min-w-[45px]">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 group py-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00ff66] hover:h-2 transition-all"
                  style={{
                    background: `linear-gradient(to right, #00ff66 ${(currentTime / (duration || 1)) * 100}%, #262626 ${(currentTime / (duration || 1)) * 100}%)`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-neutral-400 min-w-[45px]">
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Controls buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Play / Pause */}
              <button
                onClick={handlePlayPause}
                className="p-2.5 rounded-xl bg-[#00ff66] text-black hover:bg-[#00cc52] transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.4)] cursor-pointer"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black translate-x-0.5" />}
              </button>

              {/* Prev Stream (Channel flip) */}
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title="Canal anterior"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
              )}

              {/* Next Stream (Channel flip) */}
              {onNext && (
                <button
                  onClick={onNext}
                  className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title="Canal siguiente"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              )}

              {/* Live indicator if live stream */}
              {isLive && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/30 border border-red-500/50 text-red-400 text-xs font-bold tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>TRANSMISIÓN EN VIVO</span>
                </div>
              )}

              {/* Volume & Mute */}
              <div className="flex items-center gap-2 group">
                <button
                  onClick={handleToggleMute}
                  className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Activar sonido' : 'Silenciar'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-24 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00ff66]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Picture in Picture */}
              <button
                onClick={handleTogglePip}
                className="p-2.5 text-neutral-300 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Picture-in-Picture"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={handleToggleFullscreen}
                className="p-2.5 text-neutral-300 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stream Drawer (Channel zapping guide) */}
      {showQuickList && relatedStreams.length > 0 && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-black/95 border-l border-neutral-800 z-30 flex flex-col p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-[#00ff66]" />
              <span>Guía rápida</span>
            </h3>
            <button
              onClick={() => setShowQuickList(false)}
              className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded bg-neutral-800"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {relatedStreams.map((item, idx) => {
              const itemId = String(item.stream_id || item.series_id || idx);
              const isActive = String(activeStream.id) === itemId;

              return (
                <div
                  key={itemId}
                  onClick={() => {
                    if (onSelectRelated) onSelectRelated(item);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#00ff66]/15 border-[#00ff66] text-white shadow-[0_0_12px_rgba(0,255,102,0.2)]'
                      : 'bg-[#121212] border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
                    {item.stream_icon || item.cover ? (
                      <img
                        src={item.stream_icon || item.cover}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Tv className={`w-4 h-4 ${isActive ? 'text-[#00ff66]' : 'text-neutral-500'}`} />
                    )}
                  </div>
                  <div className="truncate flex-1">
                    <div className="text-xs font-semibold truncate">{item.name}</div>
                    <div className="text-[10px] text-neutral-500">#{item.stream_id || idx + 1}</div>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
