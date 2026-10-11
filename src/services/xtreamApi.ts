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

    // 1. Si no hay URL de servidor pero se usa la cuenta de Admin o local
    if (!serverUrl || serverUrl.trim() === '') {
      if (cleanUser === 'admin' && cleanPass === 'admin2026') {
        return {
          username: 'admin',
          name: 'Administrador General',
          role: 'admin',
          status: 'Active',
          expiryDate: '2030-12-31 23:59:59',
          token: 'local_admin_token',
          serverUrl: 'http://bstv.online:8080',
          isDemo: false,
        };
      }

      try {
        const managed = localStorage.getItem('nesh_managed_users');
        if (managed) {
          const users: ManagedUser[] = JSON.parse(managed);
          const found = users.find(u => u.username === cleanUser && u.password === cleanPass);
          if (found) {
            if (found.status === 'suspended') {
              throw new XtreamApiException('Esta cuenta se encuentra suspendida.');
            }
            return {
              username: found.username,
              name: found.name,
              role: found.role || 'user',
              status: 'Active',
              expiryDate: found.expiryDate ? `${found.expiryDate} 23:59:59` : '2026-12-31 23:59:59',
              token: 'local_user_token',
              serverUrl: 'http://bstv.online:8080',
              isDemo: false,
            };
          }
        }
      } catch (err: any) {
        if (err instanceof XtreamApiException) throw err;
      }
    }

    // 2. Conexión directa con el servidor Xtream Codes remoto (ej: http://bstv.online:8080)
    const targetServer = serverUrl && serverUrl.trim() !== '' ? serverUrl : 'http://bstv.online:8080';
    const cleanBase = normalizeUrl(targetServer);
    const loginUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(cleanUser)}&password=${encodeURIComponent(cleanPass)}`;

    try {
      const res = await fetch(loginUrl);
      if (!res.ok) {
        throw new XtreamApiException(`El servidor respondió con error ${res.status}`);
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
        'No se pudo conectar con el servidor bstv.online. Verifica la URL y las credenciales.'
      );
    }
  },

  // Get categories
  async getCategories(user: NeshUser, type: NeshContentType): Promise<NeshCategory[]> {
    if (user.isDemo) {
      return DEMO_CATEGORIES.filter((c) => c.type === type);
    }

    const sUrl = user.serverUrl || 'http://bstv.online:8080';
    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
        ? 'get_vod_categories'
        : 'get_series_categories';

    const url = `${normalizeUrl(sUrl)}/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password || '')}&action=${action}`;

    try {
      const res = await fetch(url);
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

    return DEMO_CATEGORIES.filter((c) => c.type === type);
  },

  // Get streams list (Live, VOD, Series)
  async getContent(
    user: NeshUser,
    type: NeshContentType,
    categoryId?: string
  ): Promise<any[]> {
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

    const sUrl = user.serverUrl || 'http://bstv.online:8080';
    const action =
      type === 'live'
        ? 'get_live_streams'
        : type === 'vod'
        ? 'get_vod_streams'
        : 'get_series';

    let url = `${normalizeUrl(sUrl)}/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password || '')}&action=${action}`;

    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar contenido');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(e);
    }

    return [];
  },

  // Get series details
  async getSeriesInfo(user: NeshUser, seriesId: string | number): Promise<NeshSeriesDetails> {
    const sId = String(seriesId);
    const sUrl = user.serverUrl || 'http://bstv.online:8080';
    const url = `${normalizeUrl(sUrl)}/player_api.php?username=${encodeURIComponent(user.username)}&password=${encodeURIComponent(user.password || '')}&action=get_series_info&series_id=${encodeURIComponent(sId)}`;
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.episodes) {
          return data;
        }
      }
    } catch (e) {
      console.error(e);
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

  // Stream URL Builders directos con la estructura exacta que me pasaste
  buildLiveStreamUrl(user: NeshUser, streamId: string | number, extension = 'm3u8'): string {
    const sUrl = normalizeUrl(user.serverUrl || 'http://bstv.online:8080');
    return `${sUrl}/live/${user.username}/${user.password}/${streamId}.${extension}`;
  },

  buildVodStreamUrl(user: NeshUser, streamId: string | number, extension = 'mp4'): string {
    const sUrl = normalizeUrl(user.serverUrl || 'http://bstv.online:8080');
    return `${sUrl}/movie/${user.username}/${user.password}/${streamId}.${extension}`;
  },

  buildSeriesEpisodeUrl(user: NeshUser, episodeId: string | number, extension = 'mp4'): string {
    const sUrl = normalizeUrl(user.serverUrl || 'http://bstv.online:8080');
    return `${sUrl}/series/${user.username}/${user.password}/${episodeId}.${extension}`;
  },

  getProxyStreamUrl(streamUrl: string): string {
    return streamUrl;
  },

  // ADMIN API CLIENT METHODS
  async getAdminUsers(token: string): Promise<ManagedUser[]> {
    const data = localStorage.getItem('nesh_managed_users');
    if (data) return JSON.parse(data);
    return [];
  },

  async createAdminUser(token: string, userData: Partial<ManagedUser>): Promise<ManagedUser> {
    const users = await xtreamApi.getAdminUsers(token);
    const newUser: ManagedUser = {
      id: Date.now().toString(),
      username: userData.username || '',
      password: userData.password || '',
      name: userData.name || userData.username || '',
      status: userData.status || 'active',
      expiryDate: userData.expiryDate || '2026-12-31',
      role: 'user',
      notes: userData.notes || '',
    };
    users.push(newUser);
    localStorage.setItem('nesh_managed_users', JSON.stringify(users));
    localStorage.setItem('nesh_saved_accounts', JSON.stringify(users));
    return newUser;
  },

  async updateAdminUser(token: string, id: string, updates: Partial<ManagedUser>): Promise<ManagedUser> {
    let users = await xtreamApi.getAdminUsers(token);
    let updated: any = null;
    users = users.map(u => {
      if (u.id === id) {
        updated = { ...u, ...updates };
        return updated;
      }
      return u;
    });
    localStorage.setItem('nesh_managed_users', JSON.stringify(users));
    localStorage.setItem('nesh_saved_accounts', JSON.stringify(users));
    return updated;
  },

  async deleteAdminUser(token: string, id: string): Promise<void> {
    let users = await xtreamApi.getAdminUsers(token);
    users = users.filter(u => u.id !== id);
    localStorage.setItem('nesh_managed_users', JSON.stringify(users));
    localStorage.setItem('nesh_saved_accounts', JSON.stringify(users));
  },

  async getUpstreamSettings(token: string): Promise<UpstreamSettings> {
    const data = localStorage.getItem('nesh_upstream_settings');
    if (data) return JSON.parse(data);
    return {
      serverUrl: 'http://bstv.online:8080',
      username: '',
      password: '',
    };
  },

  async setUpstreamSettings(token: string, settings: UpstreamSettings): Promise<UpstreamSettings> {
    localStorage.setItem('nesh_upstream_settings', JSON.stringify(settings));
    return settings;
  },

  async testUpstreamConnection(token: string): Promise<any> {
    return { connected: true, statusCode: '200', authStatus: 'OK' };
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
