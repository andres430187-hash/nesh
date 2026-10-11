import React from 'react';
import { Tv, Play, Heart } from 'lucide-react';

interface StreamGridProps {
  streams: any[];
  onSelectStream: (stream: any) => void;
  favorites: string[];
  onToggleFavorite: (id: string | number) => void;
}

export const StreamGrid: React.FC<StreamGridProps> = ({
  streams,
  onSelectStream,
  favorites,
  onToggleFavorite,
}) => {
  if (!streams || streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <Tv className="w-12 h-12 mb-3 opacity-40 text-[#00ff66]" />
        <p className="text-sm">No hay contenido disponible en esta categoría.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {streams.map((item, idx) => {
        const itemId = String(item.stream_id || idx);
        const isFav = favorites.includes(itemId);
        const poster = item.stream_icon || item.cover;

        return (
          <div
            key={itemId}
            onClick={() => onSelectStream(item)}
            className="group relative bg-[#121212] border border-neutral-800 rounded-2xl overflow-hidden hover:border-[#00ff66]/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,102,0.2)] cursor-pointer flex flex-col"
          >
            <div className="aspect-[3/4] w-full bg-neutral-900 relative overflow-hidden flex items-center justify-center">
              {poster ? (
                <img
                  src={poster}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <Tv className="w-10 h-10 text-neutral-600" />
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#00ff66] text-black flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 fill-black translate-x-0.5" />
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(itemId);
                }}
                className={`absolute top-2 right-2 p-2 rounded-xl backdrop-blur-md transition-colors ${
                  isFav
                    ? 'bg-rose-500/80 text-white'
                    : 'bg-black/60 text-neutral-300 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
              </button>
            </div>

            <div className="p-3 flex-1 flex flex-col justify-between">
              <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-[#00ff66] transition-colors">
                {item.name || 'Sin nombre'}
              </h3>
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Canal #{idx + 1}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
