import React, { useEffect, useState } from 'react';
import {
  X,
  Play,
  Star,
  Calendar,
  Clock,
  Layers,
  Clapperboard,
  Film,
  AlertCircle,
} from 'lucide-react';
import { NeshSeries, NeshSeriesDetails, NeshEpisode, NeshUser } from '../types';
import { xtreamApi } from '../services/xtreamApi';

interface SeriesModalProps {
  series: NeshSeries;
  user: NeshUser;
  onClose: () => void;
  onPlayEpisode: (series: NeshSeries, episode: NeshEpisode) => void;
}

export const SeriesModal: React.FC<SeriesModalProps> = ({
  series,
  user,
  onClose,
  onPlayEpisode,
}) => {
  const [details, setDetails] = useState<NeshSeriesDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('1');

  useEffect(() => {
    let mounted = true;
    const fetchInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await xtreamApi.getSeriesInfo(user, series.series_id);
        if (mounted) {
          setDetails(data);
          const seasonKeys = Object.keys(data.episodes || {});
          if (seasonKeys.length > 0) {
            setSelectedSeason(seasonKeys[0]);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Error al cargar los episodios de la serie');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchInfo();
    return () => {
      mounted = false;
    };
  }, [series, user]);

  const episodes = details?.episodes?.[selectedSeason] || [];
  const seasonKeys = details?.episodes ? Object.keys(details.episodes) : [];
  const info = details?.info || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 hover:bg-neutral-800 border border-neutral-700 text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header with Backdrop */}
        <div className="relative min-h-[220px] sm:min-h-[280px] bg-neutral-900 overflow-hidden flex items-end p-6">
          {/* Backdrop Image */}
          {(info.backdrop_path?.[0] || series.backdrop_path?.[0] || series.cover) && (
            <img
              src={info.backdrop_path?.[0] || series.backdrop_path?.[0] || series.cover}
              alt={series.name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />

          {/* Header Info */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-5 w-full">
            {/* Poster */}
            <div className="w-24 sm:w-32 aspect-[2/3] rounded-xl bg-neutral-800 overflow-hidden shrink-0 border border-neutral-700 shadow-xl hidden sm:block">
              {series.cover ? (
                <img
                  src={series.cover}
                  alt={series.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600">
                  <Clapperboard className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00ff66]/20 border border-[#00ff66]/40 text-[#00ff66]">
                  Serie
                </span>
                {series.rating && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{typeof series.rating === 'number' ? series.rating.toFixed(1) : series.rating}</span>
                  </div>
                )}
                {series.releaseDate && (
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {series.releaseDate}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {series.name}
              </h2>

              {info.genre && (
                <p className="text-xs text-neutral-400 mt-1 font-medium">
                  {info.genre}
                </p>
              )}

              {info.plot || series.plot ? (
                <p className="text-xs sm:text-sm text-neutral-300 mt-2 line-clamp-2 max-w-2xl leading-relaxed">
                  {info.plot || series.plot}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Content Section: Season selector & Episode list */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-3 border-neutral-800 border-t-[#00ff66] rounded-full animate-spin" />
              <p className="mt-3 text-xs text-neutral-400 font-semibold tracking-wider uppercase">
                Cargando temporadas...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div>
              {/* Season Tabs */}
              {seasonKeys.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-neutral-800">
                  {seasonKeys.map((sNum) => (
                    <button
                      key={sNum}
                      onClick={() => setSelectedSeason(sNum)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        selectedSeason === sNum
                          ? 'bg-[#00ff66] text-black font-bold shadow-[0_0_12px_rgba(0,255,102,0.3)]'
                          : 'bg-[#1e1e1e] text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      Temporada {sNum}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode List */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {episodes.length === 0 ? (
                  <p className="text-neutral-500 text-sm py-8 text-center">
                    No hay episodios registrados en esta temporada.
                  </p>
                ) : (
                  episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-[#1a1a1a] hover:bg-[#222222] border border-neutral-800 hover:border-[#00ff66]/40 transition-all gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Episode Thumbnail or Index */}
                        <div className="w-16 sm:w-20 aspect-video rounded-lg bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center relative border border-neutral-800">
                          {ep.info?.movie_image ? (
                            <img
                              src={ep.info.movie_image}
                              alt={ep.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-neutral-500 group-hover:text-[#00ff66]">
                              #{ep.episode_num}
                            </span>
                          )}
                        </div>

                        {/* Title and duration */}
                        <div className="truncate">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#00ff66] transition-colors">
                            {ep.episode_num}. {ep.title}
                          </h4>
                          <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                            {ep.info?.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {ep.info.duration}
                              </span>
                            )}
                            {ep.info?.plot && (
                              <span className="truncate max-w-xs hidden sm:inline">
                                {ep.info.plot}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Play Button */}
                      <button
                        onClick={() => onPlayEpisode(series, ep)}
                        className="px-3 sm:px-4 py-2 rounded-xl bg-[#00ff66] text-black font-bold text-xs tracking-wide hover:bg-[#00cc52] transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0 shadow-[0_0_10px_rgba(0,255,102,0.3)] cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-black translate-x-0.5" />
                        <span className="hidden sm:inline">Reproducir</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
