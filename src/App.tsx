/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  NeshUser,
  NeshContentType,
  NeshCategory,
  NeshLiveStream,
  NeshVodStream,
  NeshSeries,
  NeshEpisode,
  NeshActiveStream,
} from './types';
import { xtreamApi } from './services/xtreamApi';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { CategoryList } from './components/CategoryList';
import { StreamGrid } from './components/StreamGrid';
import { VideoPlayer } from './components/VideoPlayer';
import { VodModal } from './components/VodModal';
import { SeriesModal } from './components/SeriesModal';
import { AccountModal } from './components/AccountModal';
import { AdminPanel } from './components/AdminPanel';
import { InstallModal } from './components/InstallModal';

export default function App() {
  // Authentication state
  const [user, setUser] = useState<NeshUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('nestv_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Navigation and content state
  const [currentTab, setCurrentTab] = useState<NeshContentType>('live');
  const [categories, setCategories] = useState<NeshCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => xtreamApi.getFavorites());

  // Loading states
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Modals & Player state
  const [activeStream, setActiveStream] = useState<NeshActiveStream | null>(null);
  const [selectedVod, setSelectedVod] = useState<NeshVodStream | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<NeshSeries | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Handle Login
  const handleLoginSuccess = (newUser: NeshUser) => {
    setUser(newUser);
    try {
      sessionStorage.setItem('nestv_current_user', JSON.stringify(newUser));
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setActiveStream(null);
    setSelectedVod(null);
    setSelectedSeries(null);
    setShowAccountModal(false);
    sessionStorage.removeItem('nestv_current_user');
  };

  // Load categories when user or tab changes
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const cats = await xtreamApi.getCategories(user, currentTab);
        if (!isCancelled) {
          setCategories(cats);
          setActiveCategoryId('all');
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        if (!isCancelled) setIsLoadingCategories(false);
      }
    };

    loadCategories();
    return () => {
      isCancelled = true;
    };
  }, [user, currentTab]);

  // Load content items when user, tab, or category changes
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const loadContent = async () => {
      setIsLoadingContent(true);
      try {
        const data = await xtreamApi.getContent(user, currentTab, activeCategoryId);
        if (!isCancelled) {
          setAllItems(data);
        }
      } catch (err) {
        console.error('Failed to load content', err);
      } finally {
        if (!isCancelled) setIsLoadingContent(false);
      }
    };

    loadContent();
    return () => {
      isCancelled = true;
    };
  }, [user, currentTab, activeCategoryId]);

  // Filter items by search query and favorites
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const id = String(
        currentTab === 'series'
          ? item.series_id
          : item.stream_id || item.num || item.name
      );

      // Filter by favorites
      if (showFavoritesOnly && !favorites.includes(id)) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (item.name || item.title || '').toLowerCase();
        if (!name.includes(q)) return false;
      }

      return true;
    });
  }, [allItems, searchQuery, showFavoritesOnly, favorites, currentTab]);

  // Favorite toggle handler
  const handleToggleFavorite = (id: string | number) => {
    const sId = String(id);
    xtreamApi.toggleFavorite(sId);
    setFavorites(xtreamApi.getFavorites());
  };

  // Play Live Stream
  const handlePlayLive = (stream: NeshLiveStream) => {
    if (!user) return;
    const directUrl =
      (stream as any).stream_url ||
      stream.direct_source ||
      xtreamApi.buildLiveStreamUrl(user, stream.stream_id, 'm3u8');
    const proxyUrl = xtreamApi.getProxyStreamUrl(directUrl);

    setActiveStream({
      id: stream.stream_id,
      type: 'live',
      title: stream.name,
      subTitle: `Canal #${stream.stream_id}`,
      streamUrl: directUrl,
      proxyStreamUrl: proxyUrl,
      icon: stream.stream_icon,
      extension: 'm3u8',
      rawItem: stream,
    });
  };

  // Play VOD Movie
  const handlePlayVod = (movie: NeshVodStream) => {
    if (!user) return;
    const ext = movie.container_extension || 'mp4';
    const directUrl =
      (movie as any).stream_url ||
      movie.direct_source ||
      xtreamApi.buildVodStreamUrl(user, movie.stream_id, ext);
    const proxyUrl = xtreamApi.getProxyStreamUrl(directUrl);

    setSelectedVod(null);
    setActiveStream({
      id: movie.stream_id,
      type: 'vod',
      title: movie.name,
      subTitle: movie.genre || 'Película VOD',
      streamUrl: directUrl,
      proxyStreamUrl: proxyUrl,
      icon: movie.stream_icon,
      extension: ext,
      rawItem: movie,
    });
  };

  // Play Series Episode
  const handlePlayEpisode = (series: NeshSeries, ep: NeshEpisode) => {
    if (!user) return;
    const ext = ep.container_extension || 'mp4';
    const directUrl =
      (ep as any).stream_url ||
      (ep as any).direct_source ||
      xtreamApi.buildSeriesEpisodeUrl(user, ep.id, ext);
    const proxyUrl = xtreamApi.getProxyStreamUrl(directUrl);

    setSelectedSeries(null);
    setActiveStream({
      id: ep.id,
      type: 'series',
      title: `${series.name} - Ep. ${ep.episode_num}`,
      subTitle: ep.title,
      streamUrl: directUrl,
      proxyStreamUrl: proxyUrl,
      icon: ep.info?.movie_image || series.cover,
      extension: ext,
      rawItem: ep,
    });
  };

  // Channel flipping (Next / Previous stream)
  const currentStreamIndex = useMemo(() => {
    if (!activeStream) return -1;
    return filteredItems.findIndex(
      (item) =>
        String(item.stream_id || item.series_id || item.num) ===
        String(activeStream.id)
    );
  }, [activeStream, filteredItems]);

  const handleNextStream = useCallback(() => {
    if (filteredItems.length === 0 || currentStreamIndex === -1) return;
    const nextIdx = (currentStreamIndex + 1) % filteredItems.length;
    const nextItem = filteredItems[nextIdx];
    if (currentTab === 'live') handlePlayLive(nextItem);
    else if (currentTab === 'vod') handlePlayVod(nextItem);
  }, [filteredItems, currentStreamIndex, currentTab]);

  const handlePrevStream = useCallback(() => {
    if (filteredItems.length === 0 || currentStreamIndex === -1) return;
    const prevIdx =
      (currentStreamIndex - 1 + filteredItems.length) % filteredItems.length;
    const prevItem = filteredItems[prevIdx];
    if (currentTab === 'live') handlePlayLive(prevItem);
    else if (currentTab === 'vod') handlePlayVod(prevItem);
  }, [filteredItems, currentStreamIndex, currentTab]);

  // If user is not logged in, show Login Screen
  if (!user) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onOpenInstall={() => setShowInstallModal(true)}
        />
        {showInstallModal && (
          <InstallModal onClose={() => setShowInstallModal(false)} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setSearchQuery('');
          setShowFavoritesOnly(false);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
        favoritesCount={favorites.length}
        user={user}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onOpenInstall={() => setShowInstallModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Categories selector */}
        <CategoryList
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          type={currentTab}
          totalItemsCount={allItems.length}
        />

        {/* Content Stream Grid */}
        <StreamGrid
          type={currentTab}
          items={filteredItems}
          onPlayLive={handlePlayLive}
          onOpenVod={(vod) => setSelectedVod(vod)}
          onOpenSeries={(series) => setSelectedSeries(series)}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          isLoading={isLoadingContent}
        />
      </main>

      {/* Video Player Overlay */}
      {activeStream && (
        <VideoPlayer
          activeStream={activeStream}
          onClose={() => setActiveStream(null)}
          onNext={filteredItems.length > 1 ? handleNextStream : undefined}
          onPrev={filteredItems.length > 1 ? handlePrevStream : undefined}
          isFavorite={favorites.includes(String(activeStream.id))}
          onToggleFavorite={() => handleToggleFavorite(activeStream.id)}
          relatedStreams={filteredItems}
          onSelectRelated={(item) => {
            if (currentTab === 'live') handlePlayLive(item);
            else if (currentTab === 'vod') handlePlayVod(item);
          }}
        />
      )}

      {/* VOD Movie Details Modal */}
      {selectedVod && (
        <VodModal
          movie={selectedVod}
          onClose={() => setSelectedVod(null)}
          onPlay={handlePlayVod}
        />
      )}

      {/* Series Episodes & Seasons Modal */}
      {selectedSeries && (
        <SeriesModal
          series={selectedSeries}
          user={user}
          onClose={() => setSelectedSeries(null)}
          onPlayEpisode={handlePlayEpisode}
        />
      )}

      {/* Account Info Modal */}
      {showAccountModal && (
        <AccountModal
          user={user}
          onClose={() => setShowAccountModal(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Admin Users & IPTV Protection Panel */}
      {showAdminPanel && user.role === 'admin' && (
        <AdminPanel
          currentUser={user}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* Install / Download APK Modal */}
      {showInstallModal && (
        <InstallModal onClose={() => setShowInstallModal(false)} />
      )}
    </div>
  );
}
