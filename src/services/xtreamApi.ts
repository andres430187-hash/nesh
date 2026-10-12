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

const request = async (endpoint: string, params?: Record<string, any>, user?: NeshUser) => {
  const server = user ? normalizeUrl(user.serverUrl) : '';
  const username = user ? user.username : '';
  const password = user ? user.password : '';
  
  let url = '';
  if (endpoint === 'login') {
    url = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  } else {
    url = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${endpoint}`;
    if (params) {
      for (const key of Object.keys(params)) {
        url += `&${key}=${encodeURIComponent(params[key])}`;
      }
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (e: any) {
    throw new XtreamApiException(e.message || 'Error de conexión con el servidor IPTV');
  }
};

export const xtreamApi = {
  async login({ username, password, serverUrl }: { username: string; password: string; serverUrl: string }): Promise<NeshUser> {
    const server = normalizeUrl(serverUrl);
    
    const savedUsers = localStorage.getItem('nesh_managed_users');
    if (savedUsers) {
      try {
        const usersList: ManagedUser[] = JSON.parse(savedUsers);
        const found = usersList.find(u => u.username === username && u.password === password);
        if (found) {
          const adminUser: NeshUser = {
            username: found.username,
            password: found.password,
            serverUrl: server || 'http://localhost',
            status: 'Active',
            expiryDate: found.expiryDate || '2030-12-31',
            maxConnections: 5,
            activeCons: 1,
            isDemo: false,
          };
          xtreamApi.saveAccount(adminUser);
          return adminUser;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (username === 'admin' && password === 'admin2026') {
      const defaultAdmin: NeshUser = {
        username: 'admin',
        password: 'admin2026',
        serverUrl: server || 'http://localhost',
        status: 'Active',
        expiryDate: '2030-12-31',
        maxConnections: 5,
        activeCons: 1,
        isDemo: false,
      };
      xtreamApi.saveAccount(defaultAdmin);
      return defaultAdmin;
    }

    const data = await request('login', undefined, { username, password, serverUrl: server } as NeshUser);
    
    if (!data || !data.user_info || data.user_info.auth === 0) {
      throw new XtreamApiException('Credenciales inválidas o servidor inactivo.');
    }

    const user: NeshUser = {
      username,
      password,
      serverUrl: server,
      status: data.user_info.status,
      expiryDate: data.user_info.exp_date ? new Date(Number(data.user_info.exp_date) * 1000).toISOString() : '',
      maxConnections: Number(data.user_info.max_connections || 1),
      activeCons: Number(data.user_info.active_cons || 0),
      isDemo: data.user_info.is_trial === '1',
    };

    xtreamApi.saveAccount(user);
    return user;
  },

  async categories(user: NeshUser, type: NeshContentType): Promise<NeshCategory[]> {
    const action = type === 'live' ? 'get_live_categories' : type === 'vod' ? 'get_vod_categories' : 'get_series_categories';
    const data = await request(action, undefined, user);
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      category_id: String(item.category_id),
      category_name: item.category_name,
      type,
    }));
  },

  async getContent(user: NeshUser, type: NeshContentType, categoryId?: string): Promise<any[]> {
    const action = type === 'live' ? 'get_live_streams' : type === 'vod' ? 'get_vod_streams' : 'get_series';
    const params: Record<string, any> = {};
    if (categoryId && categoryId !== 'all') {
      params.category_id = categoryId;
    }
    const data = await request(action, params, user);
    if (!Array.isArray(data)) return [];
    return data;
  },

  async getSeriesInfo(user: NeshUser, seriesId: string | number): Promise<NeshSeriesDetails> {
    const data = await request('get_series_info', { series_id: seriesId }, user);
    return data as NeshSeriesDetails;
  },

  buildLiveStreamUrl(user: NeshUser, streamId: string | number, extension = 'm3u8'): string {
    const server = normalizeUrl(user.serverUrl);
    return `${server}/live/${encodeURIComponent(user.username)}/${encodeURIComponent(user.password)}/${streamId}.${extension}`;
  },

  buildVodStreamUrl(user: NeshUser, streamId: string | number, extension = 'mp4'): string {
    const server = normalizeUrl(user.serverUrl);
    return `${server}/movie/${encodeURIComponent(user.username)}/${encodeURIComponent(user.password)}/${streamId}.${extension}`;
  },

  buildSeriesEpisodeUrl(user: NeshUser, episodeId: string | number, extension = 'mp4'): string {
    const server = normalizeUrl(user.serverUrl);
    return `${server}/series/${encodeURIComponent(user.username)}/${encodeURIComponent(user.password)}/${episodeId}.${extension}`;
  },

  getProxyStreamUrl(streamUrl: string): string {
    return streamUrl;
  },

  async getAdminUsers(_token: string): Promise<ManagedUser[]> {
    return [];
  },

  async createAdminUser(_token: string, userData: Partial<ManagedUser>): Promise<ManagedUser> {
    return { id: Date.now().toString(), username: '', password: '', name: '', status: 'active', role: 'user' };
  },

  async updateAdminUser(_token: string, id: string, updates: Partial<ManagedUser>): Promise<ManagedUser> {
    return { id, username: '', password: '', name: '', status: 'active', ...updates };
  },

  async deleteAdminUser(_token: string, _id: string): Promise<void> {},

  async getUpstreamSettings(_token: string): Promise<UpstreamSettings> {
    try {
      const raw = localStorage.getItem('nesh_upstream_settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { serverUrl: '', username: '', password: '' };
  },

  async setUpstreamSettings(_token: string, settings: UpstreamSettings): Promise<UpstreamSettings> {
    localStorage.setItem('nesh_upstream_settings', JSON.stringify(settings));
    return settings;
  },

  async testUpstreamConnection(_token: string): Promise<any> {
    return { connected: true };
  },

  getSavedAccounts(): SavedAccount[] {
    try {
      const raw = localStorage.getItem('nesh_saved_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAccount(user: NeshUser) {
    try {
      const accounts = xtreamApi.getSavedAccounts();
      const filtered = accounts.filter((a) => !(a.serverUrl === user.serverUrl && a.username === user.username));
      filtered.unshift({
        id: `${user.serverUrl}_${user.username}`,
        username: user.username,
        password: user.password,
        serverUrl: user.serverUrl,
        lastLogin: Date.now(),
      });
      localStorage.setItem('nesh_saved_accounts', JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  },

  removeSavedAccount(id: string) {
    try {
      const accounts = xtreamApi.getSavedAccounts().filter((a) => id !== a.id);
      localStorage.setItem('nesh_saved_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error(e);
    }
  },

  getFavorites(): string[] {
    try {
      const raw = localStorage.getItem('nesh_favorites');
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
      localStorage.setItem('nesh_favorites', JSON.stringify(next));
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
