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
import {
  DEMO_USER,
  DEMO_CATEGORIES,
  DEMO_LIVE_STREAMS,
  DEMO_VOD_STREAMS,
  DEMO_SERIES,
  DEMO_SERIES_DETAILS,
} from '../data/demoData';

export class XtreamApiException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XtreamApiException';
  }
}

export const normalizeUrl = (url: string): string => {
  let u = url.trim();
  if (u.endsWith('/')) u = u.slice(0, -1);
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'http://' + u;
  }
  return u;
};

export const xtreamApi = {
  // Login to protected portal or custom Xtream server
  async login({
    username,
    password,
    serverUrl,
  }: {
    username: string;
    password: string;
    serverUrl?: string;
  }): Promise<NeshUser> {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // 1. Default Protected Gateway Login (No server URL needed for clients)
    if (!serverUrl || serverUrl.trim() === '') {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new XtreamApiException(data.error || 'Usuario o contraseña incorrectos');
        }

        const user: NeshUser = {
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
          status: data.user.status,
          expiryDate: data.user.expiryDate,
          token: data.token,
          serverUrl: 'NesTV Secure Cloud Gateway',
          isDemo: data.user.username === 'demo',
        };

        // Save session token
        localStorage.setItem('nestv_token', data.token);

        return user;
      } catch (err: any) {
        if (err instanceof XtreamApiException) throw err;
        throw new XtreamApiException(
          err?.message || 'Error al conectar con el servidor de autenticación'
        );
      }
    }

    // 2. Custom Remote Xtream Server Mode (If client provides their own private IPTV URL)
    const cleanBase = normalizeUrl(serverUrl);
    try {
      const query = new URLSearchParams({
        serverUrl: cleanBase,
        username: cleanUser,
        password: cleanPass,
      });

      const res = await fetch(`/api/xtream/proxy?${query.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new XtreamApiException(
          errorData.error || `El servidor respondió con error ${res.status}`
        );
      }

      const data = await res.json();
      if (!data || typeof data !== 'object' || !data.user_info) {
        throw new XtreamApiException('Respuesta inválida del servidor Xtream Codes');
      }

      const userInfo = data.user_info;
      const serverInfo = data.server_info || {};
      const status = String(userInfo.status || 'Active');
      const isAuthValid =
        userInfo.auth === 1 ||
        String(userInfo.auth) === '1' ||
        userInfo.auth === true ||
        status.toLowerCase() === 'active' ||
        status === '1';

      if (!isAuthValid && (userInfo.auth === 0 || status.toLowerCase() === 'banned' || status.toLowerCase() === 'disabled')) {
        throw new XtreamApiException(`Cuenta no activa o credenciales no autorizadas (Estado: ${status})`);
      }

      const user: NeshUser = {
        username: cleanUser,
        password: cleanPass,
        serverUrl: cleanBase,
        status: 'Active',
        expiryDate: userInfo.exp_date ? String(userInfo.exp_date) : undefined,
        isTrial: String(userInfo.is_trial) === '1' || userInfo.is_trial === 1,
        maxConnections: userInfo.max_connections,
        activeCons: userInfo.active_cons,
        createdAt: userInfo.created_at ? String(userInfo.created_at) : undefined,
        serverTime: serverInfo.time ? String(serverInfo.time) : undefined,
        timezone: serverInfo.timezone ? String(serverInfo.timezone) : undefined,
        isDemo: false,
      };

      xtreamApi.saveAccount(user);
      return user;
    } catch (err: any) {
      if (err instanceof XtreamApiException) throw err;
      throw new XtreamApiException(
        'No se pudo conectar con el servidor. Verifica la URL y las credenciales.'
      );
    }
  },

  // Get categories
  async getCategories(user: NeshUser, type: NeshContentType): Promise<NeshCategory[]> {
    // If using protected server session token
    if (user.token) {
      try {
        const res = await fetch(`/api/client/categories?type=${type}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            return list.map((item) => ({
              category_id: String(item.category_id || ''),
              category_name: String(item.category_name || 'Sin nombre'),
              parent_id: item.parent_id,
              type,
            }));
          }
        }
      } catch (err) {
        console.error('getCategories token error:', err);
      }
    }

    if (user.isDemo) {
      return DEMO_CATEGORIES.filter((c) => c.type === type);
    }

    // Direct proxy fallback
    if (user.serverUrl && user.password) {
      const action =
        type === 'live'
          ? 'get_live_categories'
          : type === 'vod'
          ? 'get_vod_categories'
          : 'get_series_categories';

      const query = new URLSearchParams({
        serverUrl: user.serverUrl,
        username: user.username,
        password: user.password,
        action,
      });

      try {
        const res = await fetch(`/api/xtream/proxy?${query.toString()}`);
        if (!res.ok) throw new Error('Error al cargar categorías');
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            category_id: String(item.category_id || ''),
            category_name: String(item.category_name || 'Sin nombre'),
            parent_id: item.parent_id,
            type,
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }

    return DEMO_CATEGORIES.filter((c) => c.type === type);
  },

  // Get streams list
  async getContent(
    user: NeshUser,
    type: NeshContentType,
    categoryId?: string
  ): Promise<any[]> {
    // If using protected server session token
    if (user.token) {
      try {
        const url = `/api/client/streams?type=${type}${categoryId ? `&category_id=${encodeURIComponent(categoryId)}` : ''}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data;
          }
        }
      } catch (err) {
        console.error('getContent token error:', err);
      }
    }

    if (user.isDemo) {
      if (type === 'live') {
        return categoryId && categoryId !== 'all'
          ? DEMO_LIVE_STREAMS.filter((s) => s.category_id === categoryId)
          : DEMO_LIVE_STREAMS;
      }
      if (type === 'vod') {
        return categoryId && categoryId !== 'all'
          ? DEMO_VOD_STREAMS.filter((s) => s.category_id === categoryId)
          : DEMO_VOD_STREAMS;
      }
      if (type === 'series') {
        return categoryId && categoryId !== 'all'
          ? DEMO_SERIES.filter((s) => s.category_id === categoryId)
          : DEMO_SERIES;
      }
      return [];
    }

    if (user.serverUrl && user.password) {
      const action =
        type === 'live'
          ? 'get_live_streams'
          : type === 'vod'
          ? 'get_vod_streams'
          : 'get_series';

      const query = new URLSearchParams({
        serverUrl: user.serverUrl,
        username: user.username,
        password: user.password,
        action,
      });

      if (categoryId && categoryId !== 'all') {
        query.set('category_id', categoryId);
      }

      try {
        const res = await fetch(`/api/xtream/proxy?${query.toString()}`);
        if (!res.ok) throw new Error('Error al cargar contenido');
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error(e);
      }
    }

    return [];
  },

  // Get series details
  async getSeriesInfo(user: NeshUser, seriesId: string | number): Promise<NeshSeriesDetails> {
    const sId = String(seriesId);

    if (user.token) {
      try {
        const res = await fetch(`/api/client/series-info?series_id=${encodeURIComponent(sId)}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.episodes) {
            return data;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    return DEMO_SERIES_DETAILS[sId] || {
      info: { name: 'Serie' },
      episodes: {
        '1': [
          {
            id: 'ep_1',
            episode_num: 1,
            title: 'Episodio 1',
            container_extension: 'mp4',
          },
        ],
      },
    };
  },

  // Stream URL Builders
  buildLiveStreamUrl(user: NeshUser, streamId: string | number, extension = 'm3u8'): string {
    if (user.token) {
      return `/api/iptv/stream/live/${streamId}.${extension}?token=${user.token}`;
    }
    return `${user.serverUrl}/live/${user.username}/${user.password}/${streamId}.${extension}`;
  },

  buildVodStreamUrl(user: NeshUser, streamId: string | number, extension = 'mp4'): string {
    if (user.token) {
      return `/api/iptv/stream/vod/${streamId}.${extension}?token=${user.token}`;
    }
    return `${user.serverUrl}/movie/${user.username}/${user.password}/${streamId}.${extension}`;
  },

  buildSeriesEpisodeUrl(user: NeshUser, episodeId: string | number, extension = 'mp4'): string {
    if (user.token) {
      return `/api/iptv/stream/series/${episodeId}.${extension}?token=${user.token}`;
    }
    return `${user.serverUrl}/series/${user.username}/${user.password}/${episodeId}.${extension}`;
  },

  getProxyStreamUrl(streamUrl: string): string {
    if (streamUrl.startsWith('/api/')) return streamUrl;
    return `/api/xtream/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
  },

  // -------------------------------------------------------------
  // ADMIN API CLIENT METHODS (Manage Users & Master IPTV Server)
  // -------------------------------------------------------------
  async getAdminUsers(token: string): Promise<ManagedUser[]> {
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar la lista de usuarios');
    const data = await res.json();
    return data.users || [];
  },

  async createAdminUser(token: string, userData: Partial<ManagedUser>): Promise<ManagedUser> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
    return data.user;
  },

  async updateAdminUser(
    token: string,
    id: string,
    updates: Partial<ManagedUser>
  ): Promise<ManagedUser> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar usuario');
    return data.user;
  },

  async deleteAdminUser(token: string, id: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar usuario');
    }
  },

  async getUpstreamSettings(token: string): Promise<UpstreamSettings> {
    const res = await fetch('/api/admin/upstream', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al obtener ajustes del servidor IPTV');
    const data = await res.json();
    return data.upstream;
  },

  async setUpstreamSettings(token: string, settings: UpstreamSettings): Promise<UpstreamSettings> {
    const res = await fetch('/api/admin/upstream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar servidor IPTV');
    return data.upstream;
  },

  async testUpstreamConnection(token: string): Promise<any> {
    const res = await fetch('/api/admin/upstream/test', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  // Storage for saved accounts
  getSavedAccounts(): SavedAccount[] {
    try {
      const raw = localStorage.getItem('nestv_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAccount(user: NeshUser) {
    if (user.isDemo || !user.serverUrl) return;
    try {
      const accounts = xtreamApi.getSavedAccounts();
      const existingIdx = accounts.findIndex(
        (a) => a.serverUrl === user.serverUrl && a.username === user.username
      );
      const newEntry: SavedAccount = {
        id: `${user.serverUrl}_${user.username}`,
        serverUrl: user.serverUrl,
        username: user.username,
        label: `${user.username} (${user.serverUrl.replace(/https?:\/\//, '')})`,
        lastUsed: Date.now(),
      };
      if (existingIdx >= 0) {
        accounts[existingIdx] = newEntry;
      } else {
        accounts.unshift(newEntry);
      }
      localStorage.setItem('nestv_accounts', JSON.stringify(accounts.slice(0, 10)));
    } catch (e) {
      console.error(e);
    }
  },

  removeSavedAccount(id: string) {
    try {
      const accounts = xtreamApi.getSavedAccounts().filter((a) => a.id !== id);
      localStorage.setItem('nestv_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  },

  // Favorites
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
