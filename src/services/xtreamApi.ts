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

// Función auxiliar para obtener la configuración dinámica guardada en la app
const getDynamicSettings = () => {
  try {
    const saved = localStorage.getItem('nesh_upstream_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.serverUrl && parsed.username && parsed.password) {
        return {
          server: normalizeUrl(parsed.serverUrl),
          username: parsed.username.trim(),
          password: parsed.password.trim(),
        };
      }
    }
  } catch (e) {
    console.error(e);
  }
  // Valores por defecto iniciales
  return {
    server: 'http://bstv.online:8080',
    username: '68moct01',
    password: '9846871h',
  };
};

// Función segura de fetch con Proxy automático para evitar bloqueos HTTP en entornos HTTPS (Render/Web)
const safeFetch = async (targetUrl: string) => {
  try {
    // Intento 1: Conexión directa pura
    const res = await fetch(targetUrl);
    if (res.ok) return res;
  } catch (err) {
    console.warn('Conexión directa bloqueada, usando puente proxy seguro...');
  }

  // Intento 2: Usando un proxy público de respaldo para saltar restricciones CORS y Mixed Content
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  return await fetch(proxyUrl);
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
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      throw new XtreamApiException('Por favor ingresa usuario y contraseña');
    }

    const settings = getDynamicSettings();

    // 1. Verificar administrador maestro
    if (cleanUser === 'admin' && cleanPass === 'admin2026') {
      const adminUser: NeshUser = {
        username: 'admin',
        password: cleanPass,
        serverUrl: settings.server,
        status: 'Active',
        expiryDate: '2030-12-31 23:59:59',
        maxConnections: 10,
        activeCons: 1,
        isDemo: false,
        role: 'admin',
      };
      xtreamApi.saveAccount(adminUser);
      return adminUser;
    }

    // 2. Buscar en usuarios administrados
    let managedUsers: ManagedUser[] = [];
    try {
      const data = localStorage.getItem('nesh_managed_users');
      if (data) {
        managedUsers = JSON.parse(data);
      }
    } catch (e) {
      console.error(e);
    }

    if (managedUsers.length === 0) {
      managedUsers = [
        {
          id: '1',
          username: settings.username,
          password: settings.password,
          name: 'Cuenta Principal',
          status: 'active',
          expiryDate: '2026-12-31',
          role: 'user',
        }
      ];
    }

    const foundUser = managedUsers.find(
      (u) => u.username === cleanUser && u.password === cleanPass
    );

    if (!foundUser) {
      throw new XtreamApiException('Usuario o contraseña no registrados o incorrectos.');
    }

    if (foundUser.status !== 'active') {
      throw new XtreamApiException('Esta cuenta se encuentra suspendida o inactiva.');
    }

    const user: NeshUser = {
      username: foundUser.username,
      password: foundUser.password,
      serverUrl: settings.server,
      status: foundUser.status,
      expiryDate: foundUser.expiryDate || '2026-12-31 23:59:59',
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
    const settings = getDynamicSettings();
    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
        ? 'get_vod_categories'
        : 'get_series_categories';

    const url = `${settings.server}/player_api.php?username=${encodeURIComponent(settings.username)}&password=${encodeURIComponent(settings.password)}&action=${action}`;

    try {
      const res = await safeFetch(url);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            category_id: String(item.category_id || ''),
            category_name: String(item.category_name || 'Sin nombre'),
            parent_id: item.parent_id,
            type,
          }));
        }
      }
    } catch (e) {
      console.error('Error cargando categorías con proxy:', e);
    }

    return [];
  },

  async getContent(
    user: NeshUser,
    type: NeshContentType,
    categoryId?: string
  ): Promise<any[]> {
    const settings = getDynamicSettings();
    const action =
      type === 'live'
        ? 'get_live_streams'
        : type === 'vod'
        ? 'get_vod_streams'
        : 'get_series';

    let url = `${settings.server}/player_api.php?username=${encodeURIComponent(settings.username)}&password=${encodeURIComponent(settings.password)}&action=${action}`;

    if (categoryId && categoryId !== 'all' && categoryId) {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }

    try {
      const res = await safeFetch(url);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            ...item,
            stream_id: item.stream_id || item.id || item.vod_id || item.series_id,
            name: item.name || item.title || item.stream_display_name || 'Contenido',
            category_id: String(item.category_id || categoryId || '1'),
            stream_icon: item.stream_icon || item.cover || '',
          }));
        }
      }
    } catch (e) {
      console.error('Error cargando contenido con proxy:', e);
    }

    return [];
  },

  async getSeriesInfo(user: NeshUser, seriesId: string | number): Promise<NeshSeriesDetails> {
    const settings = getDynamicSettings();
    const sId = String(seriesId);
    const url = `${settings.server}/player_api.php?username=${encodeURIComponent(settings.username)}&password=${encodeURIComponent(settings.password)}&action=get_series_info&series_id=${encodeURIComponent(sId)}`;
    
    try {
      const res = await safeFetch(url);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.episodes) {
          return data;
        }
      }
    } catch (e) {
      console.error(e);
    }

    return {
      info: { name: 'Serie' },
      episodes: {},
    };
  },

  buildLiveStreamUrl(_user: NeshUser, streamId: string | number, extension = 'm3u8'): string {
    const settings = getDynamicSettings();
    const rawUrl = `${settings.server}/live/${settings.username}/${settings.password}/${streamId}.${extension}`;
    // Proxy web seguro forzado para el streaming
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
  },

  buildVodStreamUrl(_user: NeshUser, streamId: string | number, extension = 'mp4'): string {
    const settings = getDynamicSettings();
    const rawUrl = `${settings.server}/movie/${settings.username}/${settings.password}/${streamId}.${extension}`;
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
  },

  buildSeriesEpisodeUrl(_user: NeshUser, episodeId: string | number, extension = 'mp4'): string {
    const settings = getDynamicSettings();
    const rawUrl = `${settings.server}/series/${settings.username}/${settings.password}/${episodeId}.${extension}`;
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`;
  },

  getProxyStreamUrl(streamUrl: string): string {
    return streamUrl;
  },

  async getAdminUsers(_token: string): Promise<ManagedUser[]> {
    try {
      const data = localStorage.getItem('nesh_managed_users');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
    const settings = getDynamicSettings();
    return [
      {
        id: '1',
        username: settings.username,
        password: settings.password,
        name: 'Administrador General',
        status: 'active',
        expiryDate: '2030-12-31',
        role: 'admin',
        notes: 'Cuenta principal'
      }
    ];
  },

  async createAdminUser(_token: string, userData: Partial<ManagedUser>): Promise<ManagedUser> {
    const users = await xtreamApi.getAdminUsers(_token);
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

  async updateAdminUser(_token: string, id: string, updates: Partial<ManagedUser>): Promise<ManagedUser> {
    let users = await xtreamApi.getAdminUsers(_token);
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

  async deleteAdminUser(_token: string, id: string): Promise<void> {
    let users = await xtreamApi.getAdminUsers(_token);
    users = users.filter(u => u.id !== id);
    localStorage.setItem('nesh_managed_users', JSON.stringify(users));
    localStorage.setItem('nesh_saved_accounts', JSON.stringify(users));
  },

  async getUpstreamSettings(_token: string): Promise<UpstreamSettings> {
    const settings = getDynamicSettings();
    return {
      serverUrl: settings.server,
      username: settings.username,
      password: settings.password,
    };
  },

  async setUpstreamSettings(_token: string, settings: UpstreamSettings): Promise<UpstreamSettings> {
    localStorage.setItem('nesh_upstream_settings', JSON.stringify(settings));
    return settings;
  },

  async testUpstreamConnection(_token: string): Promise<any> {
    const settings = getDynamicSettings();
    const url = `${settings.server}/player_api.php?username=${encodeURIComponent(settings.username)}&password=${encodeURIComponent(settings.password)}`;
    try {
      const res = await safeFetch(url);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.user_info) {
          return { connected: true, statusCode: '200', authStatus: 'OK' };
        }
      }
    } catch (e) {
      console.error(e);
    }
    throw new XtreamApiException('No se pudo conectar con el servidor o los datos son incorrectos.');
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
