import React from 'react';
import {
  Play,
  Tv,
  Film,
  Clapperboard,
  Heart,
  Star,
  Info,
  Calendar,
  Clock,
} from 'lucide-react';
import {
  NeshContentType,
  NeshLiveStream,
  NeshVodStream,
  NeshSeries,
} from '../types';

interface StreamGridProps {
  type: NeshContentType;
  items: any[];
  onPlayLive: (item: NeshLiveStream) => void;
  onOpenVod: (item: NeshVodStream) => void;
  onOpenSeries: (item: NeshSeries) => void;
  favorites: string[];
  onToggleFavorite: (id: string | number) => void;
  isLoading: boolean;
}

export const StreamGrid: React.FC<StreamGridProps> = ({
  type,
  items,
  onPlayLive,
  onOpenVod,
  onOpenSeries,
  favorites,
  onToggleFavorite,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-[#121212] border border-neutral-900 rounded-2xl aspect-[3/4] animate-pulse flex flex-col justify-end p-4"
          >
            <div className="h-4 bg-neutral-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-neutral-850 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center bg-[#121212]/50 border border-neutral-800/80 rounded-3xl p-8">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-600 mb-4 border border-neutral-800">
          {type === 'live' ? (
            <Tv className="w-8 h-8" />
          ) : type === 'vod' ? (
            <Film className="w-8 h-8" />
          ) : (
            <Clapperboard className="w-8 h-8" />
          )}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No se encontraron resultados</h3>
        <p className="text-sm text-neutral-400 max-w-sm">
          Prueba cambiando la categoría seleccionada o ingresando un término de búsqueda diferente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map((item) => {
        const id =
          type === 'series'
            ? item.series_id
            : item.stream_id || item.num || item.name;
        const sId = String(id);
        const isFav = favorites.includes(sId);

        // LIVE STREAM CARD
        if (type === 'live') {
          const liveItem = item as NeshLiveStream;
          return (
            <div
              key={sId}
              onClick={() => onPlayLive(liveItem)}
              className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-neutral-800/80 hover:border-[#00ff66]/60 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,102,0.15)] cursor-pointer"
            >
              {/* Channel Logo / Icon Container */}
              <div className="relative w-full aspect-video rounded-xl bg-black/60 flex items-center justify-center overflow-hidden mb-3 border border-neutral-900 group-hover:border-neutral-700 transition-colors">
                {liveItem.stream_icon ? (
                  <img
                    src={liveItem.stream_icon}
                    alt={liveItem.name}
                    className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Tv className="w-8 h-8 text-neutral-600 group-hover:text-[#00ff66] transition-colors" />
                )}

                {/* Live Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/90 text-[10px] font-bold text-white tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>VIVO</span>
                </div>

                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-11 h-11 rounded-full bg-[#00ff66] text-black flex items-center justify-center shadow-[0_0_15px_rgba(0,255,102,0.5)] transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-black translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Actions */}
              <div className="flex items-start justify-between gap-2 mt-auto">
                <div className="truncate flex-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#00ff66] transition-colors" title={liveItem.name}>
                    {liveItem.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                    Canal IPTV #{liveItem.stream_id}
                  </p>
                </div>

                {/* Favorite Heart Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(sId);
                  }}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    isFav
                      ? 'text-rose-500 bg-rose-500/10'
                      : 'text-neutral-500 hover:text-white bg-neutral-900/60'
                  }`}
                  title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                </button>
              </div>
            </div>
          );
        }

        // VOD MOVIE CARD
        if (type === 'vod') {
          const vodItem = item as NeshVodStream;
          return (
            <div
              key={sId}
              onClick={() => onOpenVod(vodItem)}
              className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-neutral-800/80 hover:border-[#00ff66]/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,102,0.2)] cursor-pointer flex flex-col"
            >
              {/* Poster Container */}
              <div className="relative aspect-[2/3] w-full bg-neutral-950 overflow-hidden">
                {vodItem.stream_icon ? (
                  <img
                    src={vodItem.stream_icon}
                    alt={vodItem.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-neutral-600">
                    <Film className="w-10 h-10 mb-2 group-hover:text-[#00ff66] transition-colors" />
                    <span className="text-xs">{vodItem.name}</span>
                  </div>
                )}

                {/* Rating Badge */}
                {vodItem.rating && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-neutral-700 text-[11px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{typeof vodItem.rating === 'number' ? vodItem.rating.toFixed(1) : vodItem.rating}</span>
                  </div>
                )}

                {/* Favorite Heart Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(sId);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                    isFav
                      ? 'text-rose-500 bg-black/80'
                      : 'text-neutral-300 hover:text-white bg-black/50'
                  }`}
                  title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                </button>

                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-12 h-12 rounded-full bg-[#00ff66] text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,255,102,0.6)] transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-6 h-6 fill-black translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Info */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#00ff66] transition-colors" title={vodItem.name}>
                    {vodItem.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                    {vodItem.release_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {vodItem.release_date.slice(0, 4)}
                      </span>
                    )}
                    {vodItem.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {vodItem.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // SERIES CARD
        if (type === 'series') {
          const seriesItem = item as NeshSeries;
          return (
            <div
              key={sId}
              onClick={() => onOpenSeries(seriesItem)}
              className="group relative bg-[#121212] hover:bg-[#1a1a1a] border border-neutral-800/80 hover:border-[#00ff66]/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,102,0.2)] cursor-pointer flex flex-col"
            >
              {/* Cover Container */}
              <div className="relative aspect-[2/3] w-full bg-neutral-950 overflow-hidden">
                {seriesItem.cover ? (
                  <img
                    src={seriesItem.cover}
                    alt={seriesItem.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-neutral-600">
                    <Clapperboard className="w-10 h-10 mb-2 group-hover:text-[#00ff66] transition-colors" />
                    <span className="text-xs">{seriesItem.name}</span>
                  </div>
                )}

                {/* Rating Badge */}
                {seriesItem.rating && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-neutral-700 text-[11px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{typeof seriesItem.rating === 'number' ? seriesItem.rating.toFixed(1) : seriesItem.rating}</span>
                  </div>
                )}

                {/* Favorite Heart Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(sId);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                    isFav
                      ? 'text-rose-500 bg-black/80'
                      : 'text-neutral-300 hover:text-white bg-black/50'
                  }`}
                  title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                </button>

                {/* Hover Details Button */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="px-4 py-2 rounded-xl bg-[#00ff66] text-black font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.5)] transform scale-90 group-hover:scale-100 transition-transform">
                    <Info className="w-4 h-4" />
                    <span>VER EPISODIOS</span>
                  </div>
                </div>
              </div>

              {/* Title & Genre */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#00ff66] transition-colors" title={seriesItem.name}>
                    {seriesItem.name}
                  </h4>
                  {seriesItem.genre && (
                    <p className="text-[11px] text-neutral-400 truncate mt-1">
                      {seriesItem.genre}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
