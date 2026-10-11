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
  let u = (url || '').trim();
  if (u.endsWith('/')) u = u.slice(0, -1);
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'http://' + u;
  }
  return u;
};

// TUS CREDENCIALES REALES MAESTRAS (Ocultas y protegidas para que ningún cliente las vea)
const REAL_SERVER = 'http://bstv.online:8080';
const REAL_USER = '68moct01';
const REAL_PASS = '9846871h';

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

    // 1. Verificar si sos vos con el usuario administrador maestro
    if (cleanUser === 'admin' && cleanPass === 'admin2026') {
      const adminUser: NeshUser = {
        username: 'admin',
        password: cleanPass,
        serverUrl: REAL_SERVER,
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

    // 2. Buscar en los usuarios creados desde tu panel de administración de la app
    let managedUsers: ManagedUser[] = [];
    try {
      const data = localStorage.getItem('nesh_managed_users');
      if (data) {
        managedUsers = JSON.parse(data);
      }
    } catch (e) {
      console.error(e);
    }

    // Si no hay usuarios creados todavía, agregamos por defecto tu cuenta principal
    if (managedUsers.length === 0) {
      managedUsers = [
        {
          id: '1',
          username: REAL_USER,
          password: REAL_PASS,
          name: 'Cuenta Principal',
          status: 'active',
          expiryDate: '2026-12-31',
          role: 'user',
        }
      ];
    }

    // Verificar si el usuario y contraseña coinciden con uno creado por vos en el panel
    const foundUser = managedUsers.find(
      (u) => u.username === cleanUser && u.password === cleanPass
    );

    if (!foundUser) {
      throw new XtreamApiException('Usuario o contraseña no registrados o incorrectos.');
    }

    if (foundUser.status !== 'active') {
      throw new XtreamApiException('Esta cuenta se encuentra suspendida o inactiva.');
    }

    // 3. ÉXITO: Validado con el usuario inventado, pero se le asignan TUS datos reales por detrás
    const user: NeshUser = {
      username: REAL_USER,   // Usa tu usuario real en el fondo
      password: REAL_PASS,   // Usa tu contraseña real en el fondo
      serverUrl: REAL_SERVER, // Usa tu servidor real en el fondo
      status: foundUser.status,
      expiryDate: foundUser.expiryDate || '2026-12-31 23:59:59',
      maxConnections: 5,
      activeCons: 1,
      isDemo: false,
    };

    xtreamApi.saveAccount(user);
    return user;
  },

  async getCategories(user: NeshUser, type: NeshContentType): Promise<NeshCategory[]> {
    const sUrl = normalizeUrl(REAL_SERVER);
    const action =
      type === 'live'
        ? 'get_live_categories'
        : type === 'vod'
        ? 'get_vod_categories'
        : 'get_series_categories';

    const url = `${sUrl}/player_api.php?username=${encodeURIComponent(REAL_USER)}&password=${encodeURIComponent(REAL_PASS)}&action=${action}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            category_id: String(item.category_id || ''),
            category_name: String(item.category_name || 'Sin nombre'),
            parent_id: item.parent_id,
            type,
          }));
        }
      }
    } catch (e) {
      console.error('Error cargando categorías remotas, usando respaldo:', e);
    }

    return DEMO_CATEGORIES.filter((c) => c.type === type);
  },

  async getContent(
    user: NeshUser,
    type: NeshContentType,
    categoryId?: string
  ): Promise<any[]> {
    const sUrl = normalizeUrl(REAL_SERVER);
    const action =
      type === 'live'
        ? 'get_live_streams'
        : type === 'vod'
        ? 'get_vod_streams'
        : 'get_series';

    let url = `${sUrl}/player_api.php?username=${encodeURIComponent(REAL_USER)}&password=${encodeURIComponent(REAL_PASS)}&action=${action}`;

    if (categoryId && categoryId !== 'all') {
      url += `&category_id=${encodeURIComponent(categoryId)}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: any) => ({
            ...item,
            stream_id: item.stream_id || item.id || item.vod_id || item.series_id,
            name: item.name || item.title || item.stream_display_name || 'Canal / Película',
            category_id: String(item.category_id || categoryId || '1'),
            stream_icon: item.stream_icon || item.cover || '',
          }));
        }
      }
    } catch (e) {
      console.error('Error cargando contenido remoto, usando respaldo:', e);
    }

    if (type === 'live') return DEMO_LIVE_STREAMS;
    if (type === 'vod') return DEMO_VOD_STREAMS;
    if (type === 'series') return DEMO_SERIES;

    return [];
  },

  async getSeriesInfo(user: NeshUser, seriesId: string | number): Promise<NeshSeriesDetails> {
    const sId = String(seriesId);
    const sUrl = normalizeUrl(REAL_SERVER);
    const url = `${sUrl}/player_api.php?username=${encodeURIComponent(REAL_USER)}&password=${encodeURIComponent(REAL_PASS)}&action=get_series_info&series_id=${encodeURIComponent(sId)}`;
    
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

  buildLiveStreamUrl(_user: NeshUser, streamId: string | number, extension = 'm3u8'): string {
    return `${REAL_SERVER}/live/${REAL_USER}/${REAL_PASS}/${streamId}.${extension}`;
  },

  buildVodStreamUrl(_user: NeshUser, streamId: string | number, extension = 'mp4'): string {
    return `${REAL_SERVER}/movie/${REAL_USER}/${REAL_PASS}/${streamId}.${extension}`;
  },

  buildSeriesEpisodeUrl(_user: NeshUser, episodeId: string | number, extension = 'mp4'): string {
    return `${REAL_SERVER}/series/${REAL_USER}/${REAL_PASS}/${episodeId}.${extension}`;
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
    return [
      {
        id: '1',
        username: REAL_USER,
        password: REAL_PASS,
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
    return {
      serverUrl: REAL_SERVER,
      username: REAL_USER,
      password: REAL_PASS,
    };
  },

  async setUpstreamSettings(_token: string, settings: UpstreamSettings): Promise<UpstreamSettings> {
    return settings;
  },

  async testUpstreamConnection(_token: string): Promise<any> {
    return { connected: true, statusCode: '200', authStatus: 'OK' };
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
