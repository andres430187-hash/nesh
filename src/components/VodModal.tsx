import React from 'react';
import {
  X,
  Play,
  Star,
  Calendar,
  Clock,
  Film,
  User,
} from 'lucide-react';
import { NeshVodStream } from '../types';

interface VodModalProps {
  movie: NeshVodStream;
  onClose: () => void;
  onPlay: (movie: NeshVodStream) => void;
}

export const VodModal: React.FC<VodModalProps> = ({ movie, onClose, onPlay }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 hover:bg-neutral-800 border border-neutral-700 text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header with Backdrop */}
        <div className="relative min-h-[240px] sm:min-h-[300px] bg-neutral-900 overflow-hidden flex items-end p-6">
          {(movie.backdrop_path?.[0] || movie.stream_icon) && (
            <img
              src={movie.backdrop_path?.[0] || movie.stream_icon}
              alt={movie.name}
              className="absolute inset-0 w-full h-full object-cover opacity-35"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/70 to-transparent" />

          {/* Header Info */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-5 w-full">
            {/* Poster */}
            <div className="w-28 sm:w-36 aspect-[2/3] rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700 shadow-xl hidden sm:block">
              {movie.stream_icon ? (
                <img
                  src={movie.stream_icon}
                  alt={movie.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Film className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00ff66]/20 border border-[#00ff66]/40 text-[#00ff66]">
                  Película VOD
                </span>
                {movie.rating && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}</span>
                  </div>
                )}
                {movie.release_date && (
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {movie.release_date}
                  </span>
                )}
                {movie.duration && (
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {movie.duration}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {movie.name}
              </h2>

              {movie.genre && (
                <p className="text-xs text-neutral-400 mt-1 font-medium">
                  {movie.genre}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Details & Actions */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Plot Synopsis */}
          {movie.plot ? (
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-2">
                Sinopsis
              </h4>
              <p className="text-sm text-neutral-200 leading-relaxed">
                {movie.plot}
              </p>
            </div>
          ) : null}

          {/* Cast & Director */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-850">
            {movie.director && (
              <div>
                <span className="text-xs text-neutral-400 block font-semibold">Dirección:</span>
                <span className="text-sm text-white">{movie.director}</span>
              </div>
            )}
            {movie.cast && (
              <div>
                <span className="text-xs text-neutral-400 block font-semibold">Reparto:</span>
                <span className="text-sm text-white">{movie.cast}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={() => onPlay(movie)}
              className="px-6 py-3 rounded-xl bg-[#00ff66] text-black font-extrabold text-sm tracking-wide shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:bg-[#00cc52] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-black translate-x-0.5" />
              <span>REPRODUCIR AHORA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
