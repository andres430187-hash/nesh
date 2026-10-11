import {
  NeshUser,
  NeshContentType,
  NeshCategory,
  NeshLiveStream,
  NeshVodStream,
  NeshSeries,
  NeshSeriesDetails,
  SavedAccount,
  ManagedUser,
  UpstreamSettings,
} from '../types';

export class XtreamApiException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XtreamApiException';
  }
}

export const normalizeUrl = (url: string): string => {
  let u = (url || '').trim();
  if (u.endsWith('/')) u = u.slice(0, -1);
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'http://' + u;
  }
  return u;
};

// URL de la lista M3U provista por el usuario
const M3U_PLAYLIST_URL = 'https://raw.githubusercontent.com/tvkallytv-ship-it/yamilpro/refs/heads/main/2030.m3u';

// Función auxiliar para obtener configuración o la lista M3U por defecto
const getDynamicSettings = () => {
  try {
    const saved = localStorage.getItem('nesh_upstream_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.serverUrl) {
        return {
          server: normalizeUrl(parsed.serverUrl),
          username: parsed.username || 'user',
          password: parsed.password || 'pass',
        };
      }
    }
  } catch (e) {
    console.error(e);
  }
  return {
    server: M3U_PLAYLIST_URL,
    username: 'user',
    password: 'pass',
  };
};

// Parser básico para procesar listas M3U y transformarlas en canales compatibles con la app
const parseM3U = (text: string) => {
  const lines = text.split('\n');
  const items: any[] = [];
  const categoriesMap = new Map<string, string>();
  
  let currentTitle = '';
  let currentGroup = 'General';
  let currentLogo = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      // Extraer logo si existe
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      currentLogo = tvgLogoMatch ? tvgLogoMatch[1] : '';

      // Extraer grupo/categoría si existe
      const groupMatch = line.match(/group-title="([^"]*)"/);
      currentGroup = groupMatch ? groupMatch[1] : 'General';
      categoriesMap.set(currentGroup, currentGroup);

      // Extraer nombre del canal (después de la última coma)
      const commaIndex = line.lastIndexOf(',');
      currentTitle = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Canal M3U';
    } else if (line && !line.startsWith('#')) {
      // Es la URL del stream
      items.push({
        stream_id: items.length + 1,
        name: currentTitle || `Canal ${items.length + 1}`,
        stream_icon: currentLogo,
        category_id: currentGroup,
        categoryName: currentGroup,
        stream_url: line,
      });
      currentTitle = '';
      currentLogo = '';
    }
  }

  const categories = Array.from(categoriesMap.keys()).map((cat, idx) => ({
    category_id: cat,
    category_name: cat,
    type: 'live' as NeshContentType,
  }));

  return { items, categories };
};

let cachedPlaylist: { items: any[]; categories: any[] } | null = null;

const fetchPlaylistData = async () => {
  if (cachedPlaylist) return cachedPlaylist;
  try {
    const res = await fetch(M3U_PLAYLIST_URL);
    if (res.ok) {
      const text = await res.text();
      cachedPlaylist = parseM3U(text);
      return cachedPlaylist;
    }
  } catch (e) {
    console.error('Error al cargar la lista M3U:', e);
  }
  return { items: [], categories: [] };
};

export const xtreamApi = {
  async login({
    username,
    password,
  }: {
    username: string;
    password: string;
    serverUrl?: string;
  }): Promise<NeshUser> {
    const settings = getDynamicSettings();
    const user: NeshUser = {
      username: username || 'usuario',
      password: password || '1234',
      serverUrl: settings.server,
      status: 'Active',
      expiryDate: '2030-12-31 23:59:59',
      maxConnections: 5,
      activeCons: 1,
      isDemo: false,
    };
    xtreamApi.saveAccount(user);
    return user;
  },

  async categories(user: NeshUser, type: NeshContentType): Promise<NeshCategory[]> {
    return this.getCategories(user, type);
  },

  async getCategories(user: NeshUser, type: NeshContentType): Promise<NeshCategory[]> {
    const data = await fetchPlaylistData();
    if (type === 'live') {
      return data.categories;
    }
    // Si piden VOD o Series y la lista no tiene, devolvemos una genérica
    return [{ category_id: 'General', category_name: 'General', type }];
  },

  async getContent(
    user: NeshUser,
    type: NeshContentType,
    categoryId?: string
  ): Promise<any[]> {
    const data = await fetchPlaylistData();
    let items = data.items;

    if (categoryId && categoryId !== 'all' && categoryId) {
      items = items.filter((item) => item.category_id === categoryId);
    }

    return items.map((item) => ({
      ...item,
      stream_id: item.stream_id,
      name: item.name,
      stream_icon: item.stream_icon,
      stream_type: 'live',
    }));
  },

  async getSeriesInfo(_user: NeshUser, seriesId: string | number): Promise<NeshSeriesDetails> {
    return {
      info: { name: 'Contenido M3U' },
      episodes: {},
    };
  },

  buildLiveStreamUrl(_user: NeshUser, streamId: string | number, _extension = 'm3u8'): string {
    if (cachedPlaylist && cachedPlaylist.items) {
      const found = cachedPlaylist.items.find((i) => String(i.stream_id) === String(streamId));
      if (found && found.stream_url) {
        return found.stream_url;
      }
    }
    return '';
  },

  buildVodStreamUrl(_user: NeshUser, streamId: string | number, _extension = 'mp4'): string {
    return this.buildLiveStreamUrl(_user, streamId);
  },

  buildSeriesEpisodeUrl(_user: NeshUser, episodeId: string | number, _extension = 'mp4'): string {
    return this.buildLiveStreamUrl(_user, episodeId);
  },

  getProxyStreamUrl(streamUrl: string): string {
    return streamUrl;
  },

  async getAdminUsers(_token: string): Promise<ManagedUser[]> {
    return [
      {
        id: '1',
        username: 'admin',
        password: 'admin',
        name: 'Administrador M3U',
        status: 'active',
        expiryDate: '2030-12-31',
        role: 'admin',
      }
    ];
  },

  async createAdminUser(_token: string, userData: Partial<ManagedUser>): Promise<ManagedUser> {
    return {
      id: Date.now().toString(),
      username: userData.username || 'user',
      password: userData.password || '123',
      name: userData.name || 'Usuario',
      status: 'active',
      expiryDate: '2030-12-31',
      role: 'user',
    };
  },

  async updateAdminUser(_token: string, id: string, updates: Partial<ManagedUser>): Promise<ManagedUser> {
    return { id, username: 'user', password: '123', name: 'Usuario', status: 'active', ...updates };
  },

  async deleteAdminUser(_token: string, _id: string): Promise<void> {},

  async getUpstreamSettings(_token: string): Promise<UpstreamSettings> {
    return {
      serverUrl: M3U_PLAYLIST_URL,
      username: 'user',
      password: 'pass',
    };
  },

  async setUpstreamSettings(_token: string, settings: UpstreamSettings): Promise<UpstreamSettings> {
    localStorage.setItem('nesh_upstream_settings', JSON.stringify(settings));
    return settings;
  },

  async testUpstreamConnection(_token: string): Promise<any> {
    const data = await fetchPlaylistData();
    if (data.items.length > 0) {
      return { connected: true, statusCode: '200', authStatus: 'OK' };
    }
    throw new XtreamApiException('No se pudo leer la lista M3U.');
  },

  getSavedAccounts(): SavedAccount[] {
    return [];
  },

  saveAccount(_user: NeshUser) {},

  removeSavedAccount(_id: string) {},

  getFavorites(): string[] {
    try {
      const raw = localStorage.getItem('nestv_favorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(streamId: string | number): boolean {
    const sId = String(streamId);
    try {
      const favs = xtreamApi.getFavorites();
      const exists = favs.includes(sId);
      const next = exists ? favs.filter((id) => id !== sId) : [...favs, sId];
      localStorage.setItem('nestv_favorites', JSON.stringify(next));
      return !exists;
    } catch {
      return false;
    }
  },

  isFavorite(streamId: string | number): boolean {
    const sId = String(streamId);
    return xtreamApi.getFavorites().includes(sId);
  },
};
