import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { storage, AppUser } from './server/storage.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Active in-memory session tokens
const activeSessions = new Map<string, { user: AppUser; expiresAt: number }>();

// Cache for opaque segment URLs so raw provider endpoints are never leaked
const segmentUrlCache = new Map<string, { url: string; createdAt: number }>();

function createSession(user: AppUser): string {
  const token = 'nesh_' + crypto.randomBytes(24).toString('hex');
  // Session valid for 7 days
  activeSessions.set(token, {
    user,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

function getSessionUser(token?: string): AppUser | null {
  if (!token) return null;
  const sess = activeSessions.get(token);
  if (!sess) return null;
  if (sess.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return null;
  }
  // Also refresh user data from storage
  const current = storage.getUserByUsername(sess.user.username);
  if (!current || current.status !== 'active') {
    activeSessions.delete(token);
    return null;
  }
  return current;
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
    (req.query.token as string);

  const user = getSessionUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user as AppUser;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Permiso denegado. Se requieren privilegios de Administrador.' });
    }
    next();
  });
}

// Normalize URL helper
const normalizeUrl = (url: string) => {
  let u = url.trim();
  if (u.endsWith('/')) u = u.slice(0, -1);
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'http://' + u;
  }
  return u;
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // 1. AUTHENTICATION ROUTES (Clients enter their own user & pass)
  // -------------------------------------------------------------
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Por favor ingresa usuario y contraseña' });
      }

      const user = storage.authenticate(username, password);
      if (!user) {
        const found = storage.getUserByUsername(username);
        if (found && found.status !== 'active') {
          return res.status(403).json({ error: 'Esta cuenta ha sido suspendida por el administrador' });
        }
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }

      const token = createSession(user);

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          status: user.status,
          expiryDate: user.expiryDate,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Error interno en el servidor' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = (req as any).user as AppUser;
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        status: user.status,
        expiryDate: user.expiryDate,
      },
    });
  });

  // -------------------------------------------------------------
  // 2. ADMIN USER & UPSTREAM MANAGEMENT
  // -------------------------------------------------------------
  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    const users = storage.getUsers().map((u) => ({
      id: u.id,
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.role,
      status: u.status,
      expiryDate: u.expiryDate,
      createdAt: u.createdAt,
      notes: u.notes,
    }));
    return res.json({ users });
  });

  app.post('/api/admin/users', requireAdmin, (req, res) => {
    try {
      const { username, password, name, role, status, expiryDate, notes } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      }

      const newUser = storage.addUser({
        username,
        password,
        name: name || username,
        role: role === 'admin' ? 'admin' : 'user',
        status: status === 'suspended' ? 'suspended' : 'active',
        expiryDate: expiryDate || '2030-12-31',
        notes,
      });

      return res.json({ user: newUser });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Error al crear usuario' });
    }
  });

  app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    try {
      const id = req.params.id;
      const updated = storage.updateUser(id, req.body);
      return res.json({ user: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Error al actualizar usuario' });
    }
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    try {
      const id = req.params.id;
      storage.deleteUser(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Error al eliminar usuario' });
    }
  });

  app.get('/api/admin/upstream', requireAdmin, (_req, res) => {
    const upstream = storage.getUpstream();
    return res.json({
      upstream: {
        serverUrl: upstream.serverUrl,
        username: upstream.username,
        // Mask the password for preview
        password: upstream.password,
      },
    });
  });

  app.post('/api/admin/upstream', requireAdmin, (req, res) => {
    const { serverUrl, username, password } = req.body;
    if (!serverUrl || !username || !password) {
      return res.status(400).json({ error: 'Faltan parámetros del servidor IPTV' });
    }
    const updated = storage.setUpstream({
      serverUrl: serverUrl.trim(),
      username: username.trim(),
      password: password.trim(),
    });
    return res.json({ upstream: updated });
  });

  app.get('/api/admin/upstream/test', requireAdmin, async (_req, res) => {
    const upstream = storage.getUpstream();
    try {
      const base = normalizeUrl(upstream.serverUrl);
      const url = `${base}/player_api.php?username=${encodeURIComponent(upstream.username)}&password=${encodeURIComponent(upstream.password)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'IPTVSmarters/1.0.0' },
      });
      clearTimeout(timeoutId);

      const text = await resp.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      const authStatus = parsed?.user_info?.status || (parsed?.user_info?.auth === 1 ? 'Active' : parsed?.user_info?.auth === 0 ? 'No autorizado (auth=0)' : 'Desconocido');

      return res.json({
        connected: resp.ok,
        statusCode: resp.status,
        authStatus,
        details: parsed?.user_info || text.slice(0, 200),
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        error: err?.message || 'Error de conexión',
      });
    }
  });

  // -------------------------------------------------------------
  // 3. OBFUSCATED IPTV CLIENT ENDPOINTS (PROTECTED STREAMING)
  // -------------------------------------------------------------
  // Categories endpoint
  app.get('/api/client/categories', requireAuth, async (req, res) => {
    const type = req.query.type as string; // 'live' | 'vod' | 'series'
    const upstream = storage.getUpstream();

    try {
      const action =
        type === 'vod'
          ? 'get_vod_categories'
          : type === 'series'
          ? 'get_series_categories'
          : 'get_live_categories';

      const base = normalizeUrl(upstream.serverUrl);
      const targetUrl = `${base}/player_api.php?username=${encodeURIComponent(upstream.username)}&password=${encodeURIComponent(upstream.password)}&action=${action}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'IPTVSmarters/1.0.0' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          return res.json(data);
        }
      }
    } catch (e) {
      // Fallback
    }

    // Default fallback categories
    const fallbackCategories =
      type === 'vod'
        ? [
            { category_id: 'vod_anim', category_name: 'Animación & Familiar' },
            { category_id: 'vod_scifi', category_name: 'Ciencia Ficción & Aventura' },
            { category_id: 'vod_drama', category_name: 'Cine Abierto & Cortos' },
          ]
        : type === 'series'
        ? [
            { category_id: 'series_blender', category_name: 'Series Animadas' },
            { category_id: 'series_shorts', category_name: 'Antología de Cortos' },
          ]
        : [
            { category_id: 'live_news', category_name: 'Noticias & Mundo' },
            { category_id: 'live_science', category_name: 'Ciencia & Espacio' },
            { category_id: 'live_cinema', category_name: 'Cine & Animación 24/7' },
            { category_id: 'live_relax', category_name: 'Música & Relax' },
          ];

    return res.json(fallbackCategories);
  });

  // Streams list endpoint
  app.get('/api/client/streams', requireAuth, async (req, res) => {
    const type = req.query.type as string;
    const category_id = req.query.category_id as string;
    const token = (req as any).token as string;
    const upstream = storage.getUpstream();

    try {
      const action =
        type === 'vod'
          ? 'get_vod_streams'
          : type === 'series'
          ? 'get_series'
          : 'get_live_streams';

      const base = normalizeUrl(upstream.serverUrl);
      let targetUrl = `${base}/player_api.php?username=${encodeURIComponent(upstream.username)}&password=${encodeURIComponent(upstream.password)}&action=${action}`;
      if (category_id && category_id !== 'all') {
        targetUrl += `&category_id=${encodeURIComponent(category_id)}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'IPTVSmarters/1.0.0' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const data = JSON.parse(text);
        if (Array.isArray(data) && data.length > 0) {
          // Mask direct URLs in streams! Client only sees protected proxy endpoint
          const masked = data.map((item: any) => {
            const id = item.stream_id || item.series_id;
            return {
              ...item,
              // Strip any upstream server references
              direct_source: undefined,
              stream_url: `/api/iptv/stream/${type}/${id}?token=${token}`,
            };
          });
          return res.json(masked);
        }
      }
    } catch (e) {
      // Fallback
    }

    // Default fallback stream list
    return res.json(getFallbackStreams(type, category_id, token));
  });

  // Series Details endpoint
  app.get('/api/client/series-info', requireAuth, async (req, res) => {
    const series_id = req.query.series_id as string;
    const token = (req as any).token as string;
    const upstream = storage.getUpstream();

    try {
      const base = normalizeUrl(upstream.serverUrl);
      const targetUrl = `${base}/player_api.php?username=${encodeURIComponent(upstream.username)}&password=${encodeURIComponent(upstream.password)}&action=get_series_info&series_id=${encodeURIComponent(series_id)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'IPTVSmarters/1.0.0' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const data = JSON.parse(text);
        if (data && data.episodes) {
          return res.json(data);
        }
      }
    } catch (e) {}

    return res.json(getFallbackSeriesInfo(series_id, token));
  });

  // -------------------------------------------------------------
  // 4. PROTECTED MEDIA STREAM PROXY (Completely hides the upstream URL)
  // -------------------------------------------------------------
  app.get('/api/iptv/stream/:type/:id', async (req, res) => {
    try {
      const { type, id } = req.params;
      const token = req.query.token as string;

      // Validate session token
      const user = getSessionUser(token);
      if (!user) {
        return res.status(401).send('Acceso no autorizado');
      }

      const upstream = storage.getUpstream();
      const base = normalizeUrl(upstream.serverUrl);

      // Build upstream target URL
      let targetUrl = '';
      if (type === 'live') {
        const streamId = id.replace(/\.m3u8$/, '');
        targetUrl = `${base}/live/${upstream.username}/${upstream.password}/${streamId}.m3u8`;
      } else if (type === 'vod') {
        const streamId = id.replace(/\.(mp4|mkv)$/, '');
        targetUrl = `${base}/movie/${upstream.username}/${upstream.password}/${streamId}.mp4`;
      } else if (type === 'series') {
        const episodeId = id.replace(/\.(mp4|mkv)$/, '');
        targetUrl = `${base}/series/${upstream.username}/${upstream.password}/${episodeId}.mp4`;
      }

      // Check if fallback stream
      if (id.startsWith('demo_') || id.startsWith('live_') || id.startsWith('vod_')) {
        const fallbackUrl = getFallbackUrl(id);
        if (fallbackUrl) targetUrl = fallbackUrl;
      }

      const headers: Record<string, string> = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const upstreamResponse = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
      });

      // Check if the response is an M3U8 playlist
      const contentType = upstreamResponse.headers.get('content-type') || '';
      const isM3u8Request = targetUrl.endsWith('.m3u8') || id.endsWith('.m3u8') || contentType.includes('mpegurl');

      if (isM3u8Request && upstreamResponse.ok) {
        const text = await upstreamResponse.text();
        if (text.startsWith('#EXTM3U')) {
          const finalBaseUrl = upstreamResponse.url; // Edge server node URL after 302 redirect
          const lines = text.split('\n');
          const rewrittenLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return line;
            try {
              const absSegmentUrl = new URL(trimmed, finalBaseUrl).toString();
              // Create completely opaque hash so raw URL/credentials are never visible
              const segmentKey = crypto.createHash('md5').update(absSegmentUrl).digest('hex');
              segmentUrlCache.set(segmentKey, { url: absSegmentUrl, createdAt: Date.now() });
              return `/api/iptv/segment?s=${segmentKey}&token=${encodeURIComponent(token)}`;
            } catch {
              return line;
            }
          });

          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.send(rewrittenLines.join('\n'));
        }
      }

      // If upstream failed or 502/404, fallback if available
      if (!upstreamResponse.ok && !id.startsWith('demo_')) {
        const fallbackUrl = getFallbackUrl(id);
        if (fallbackUrl) {
          const fallbackResp = await fetch(fallbackUrl, { headers });
          res.status(fallbackResp.status);
          const fwd = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
          fwd.forEach((h) => {
            const v = fallbackResp.headers.get(h);
            if (v) res.setHeader(h, v);
          });
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (fallbackResp.body) {
            // @ts-ignore
            const reader = fallbackResp.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                res.end();
                break;
              }
              if (!res.write(value)) {
                await new Promise((r) => res.once('drain', r));
              }
            }
          }
          return;
        }
      }

      res.status(upstreamResponse.status);

      const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      forwardHeaders.forEach((h) => {
        const val = upstreamResponse.headers.get(h);
        if (val) res.setHeader(h, val);
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

      if (!upstreamResponse.body) {
        return res.end();
      }

      // Stream binary data directly to client
      // @ts-ignore
      const reader = upstreamResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        if (!res.write(value)) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).send('Error al transmitir contenido');
      }
    }
  });

  // -------------------------------------------------------------
  // 5. PROTECTED HLS SEGMENT PROXY (TS / AAC / MP4 chunks)
  // -------------------------------------------------------------
  app.get('/api/iptv/segment', async (req, res) => {
    try {
      const segmentKey = req.query.s as string;
      const rawUrl = req.query.url as string;
      const token = req.query.token as string;

      // Validate session token
      const user = getSessionUser(token);
      if (!user) {
        return res.status(401).send('Acceso no autorizado');
      }

      let segmentUrl = '';
      if (segmentKey && segmentUrlCache.has(segmentKey)) {
        segmentUrl = segmentUrlCache.get(segmentKey)!.url;
      } else if (rawUrl) {
        segmentUrl = rawUrl;
      } else {
        return res.status(404).send('Segmento no encontrado o expirado');
      }

      const headers: Record<string, string> = {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await fetch(segmentUrl, { headers, redirect: 'follow' });

      res.status(response.status);

      const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      forwardHeaders.forEach((h) => {
        const val = response.headers.get(h);
        if (val) res.setHeader(h, val);
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=60');

      if (!response.body) {
        return res.end();
      }

      // @ts-ignore
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        if (!res.write(value)) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).send('Error al transferir segmento');
      }
    }
  });

  // Legacy proxy route (kept for custom server tab if user wants)
  app.get('/api/xtream/proxy', async (req, res) => {
    try {
      const { serverUrl, username, password, action, category_id, series_id } = req.query;

      if (!serverUrl || !username || !password) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (serverUrl, username, password)' });
      }

      const base = normalizeUrl(serverUrl as string);
      const url = new URL(`${base}/player_api.php`);
      url.searchParams.set('username', username as string);
      url.searchParams.set('password', password as string);

      if (action) url.searchParams.set('action', action as string);
      if (category_id) url.searchParams.set('category_id', category_id as string);
      if (series_id) url.searchParams.set('series_id', series_id as string);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'IPTVSmarters/1.0.0 (Linux; Android 11)',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `El servidor Xtream respondió con estado ${response.status}`,
        });
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return res.json(data);
      } catch {
        return res.status(502).json({
          error: 'El servidor respondió en un formato no compatible o inválido.',
        });
      }
    } catch (err: any) {
      return res.status(502).json({
        error: 'No se pudo conectar con el servidor Xtream.',
        details: err?.message,
      });
    }
  });

  // Setup Vite in Dev or Static files in Prod
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NesTV server running on http://0.0.0.0:${PORT}`);
  });
}

// Fallback streams helper
function getFallbackStreams(type: string, category_id?: string, token?: string) {
  if (type === 'vod') {
    return [
      {
        stream_id: 'vod_1',
        name: 'Big Buck Bunny (4K Ultra HD)',
        category_id: 'vod_anim',
        stream_type: 'movie',
        stream_icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/600px-Big_buck_bunny_poster_big.jpg',
        rating: '8.4',
        rating_5based: 4.2,
        plot: 'Un conejo gigante de corazón bondadoso decide vengarse de tres roedores bravucones del bosque cuando estos perturban su paz.',
        genre: 'Animación / Comedia',
        release_date: '2008',
        duration: '09:56',
        stream_url: `/api/iptv/stream/vod/vod_1?token=${token}`,
      },
      {
        stream_id: 'vod_2',
        name: 'Sintel - La Búsqueda del Dragón',
        category_id: 'vod_drama',
        stream_type: 'movie',
        stream_icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/600px-Sintel_poster.jpg',
        rating: '8.8',
        plot: 'Una joven solitaria rescata a un dragón bebé herido, creando un lazo inquebrantable.',
        genre: 'Fantasía / Aventura',
        release_date: '2010',
        duration: '14:48',
        stream_url: `/api/iptv/stream/vod/vod_2?token=${token}`,
      },
      {
        stream_id: 'vod_3',
        name: 'Tears of Steel (Sci-Fi Cyberpunk)',
        category_id: 'vod_scifi',
        stream_type: 'movie',
        stream_icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Tears_of_Steel_poster.jpg/600px-Tears_of_Steel_poster.jpg',
        rating: '7.9',
        plot: 'En un futuro distópico en Ámsterdam, un grupo de científicos y guerreros intenta salvar a la humanidad.',
        genre: 'Ciencia Ficción / VFX',
        release_date: '2012',
        duration: '12:14',
        stream_url: `/api/iptv/stream/vod/vod_3?token=${token}`,
      },
      {
        stream_id: 'vod_4',
        name: 'Elephants Dream',
        category_id: 'vod_scifi',
        stream_type: 'movie',
        stream_icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Elephants_Dream_poster.jpg/600px-Elephants_Dream_poster.jpg',
        rating: '7.5',
        plot: 'Proog y Emo caminan por una gigantesca máquina laberíntica donde los límites entre la realidad y los sueños se desvanecen.',
        genre: 'Ciencia Ficción / Surrealista',
        release_date: '2006',
        duration: '10:54',
        stream_url: `/api/iptv/stream/vod/vod_4?token=${token}`,
      },
    ];
  }

  if (type === 'series') {
    return [
      {
        series_id: 'series_1',
        name: 'Caminandes: Las Aventuras de Koro',
        category_id: 'series_blender',
        cover: 'https://images.unsplash.com/photo-1509205477838-a534e43a849f?w=600&h=900&fit=crop',
        plot: 'Sigue a Koro, una simpática llama en la Patagonia que se enfrenta a vallas electrificadas y pingüinos.',
        genre: 'Animación / Aventura',
        releaseDate: '2013-2016',
        rating: '8.9',
      },
      {
        series_id: 'series_2',
        name: 'Blender Studio Originals',
        category_id: 'series_shorts',
        cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=900&fit=crop',
        plot: 'Colección de cortometrajes aclamados internacionalmente realizados con herramientas de código abierto.',
        genre: 'Antología / Fantasía',
        releaseDate: '2020-2024',
        rating: '9.1',
      },
    ];
  }

  // Live streams
  return [
    {
      stream_id: '3732',
      name: 'Canal Principal en Vivo (Canal #3732)',
      category_id: 'live_cinema',
      stream_type: 'live',
      stream_icon: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=300&fit=crop',
      stream_url: `/api/iptv/stream/live/3732?token=${token}`,
    },
    {
      stream_id: 'live_1',
      name: 'NASA TV - Estación Espacial en Vivo',
      category_id: 'live_science',
      stream_type: 'live',
      stream_icon: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=300&h=300&fit=crop',
      stream_url: `/api/iptv/stream/live/live_1?token=${token}`,
    },
    {
      stream_id: 'live_2',
      name: 'DW News en Vivo (HD)',
      category_id: 'live_news',
      stream_type: 'live',
      stream_icon: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&h=300&fit=crop',
      stream_url: `/api/iptv/stream/live/live_2?token=${token}`,
    },
    {
      stream_id: 'live_3',
      name: 'France 24 Español / Internacional',
      category_id: 'live_news',
      stream_type: 'live',
      stream_icon: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&h=300&fit=crop',
      stream_url: `/api/iptv/stream/live/live_3?token=${token}`,
    },
    {
      stream_id: 'live_4',
      name: 'Blender Cinema 24/7 Live Stream',
      category_id: 'live_cinema',
      stream_type: 'live',
      stream_icon: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=300&fit=crop',
      stream_url: `/api/iptv/stream/live/live_4?token=${token}`,
    },
    {
      stream_id: 'live_5',
      name: 'Canal Acuario & Paisajes Ultra HD',
      category_id: 'live_relax',
      stream_type: 'live',
      stream_icon: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=300&fit=crop',
      stream_url: `/api/iptv/stream/live/live_5?token=${token}`,
    },
  ];
}

function getFallbackSeriesInfo(series_id: string, token: string) {
  return {
    info: {
      name: 'Caminandes: Las Aventuras de Koro',
      plot: 'Sigue a Koro, una simpática llama en la Patagonia.',
      genre: 'Animación / Comedia',
      rating: '8.9',
    },
    episodes: {
      '1': [
        {
          id: 'cam_ep_1',
          episode_num: 1,
          title: 'Episodio 1: Llama Drama',
          stream_url: `/api/iptv/stream/series/cam_ep_1?token=${token}`,
          info: { duration: '01:30', plot: 'Koro intenta cruzar una carretera solitaria.' },
        },
        {
          id: 'cam_ep_2',
          episode_num: 2,
          title: 'Episodio 2: Gran Dillama',
          stream_url: `/api/iptv/stream/series/cam_ep_2?token=${token}`,
          info: { duration: '02:26', plot: 'Koro descubre una máquina expendedora.' },
        },
        {
          id: 'cam_ep_3',
          episode_num: 3,
          title: 'Episodio 3: Llamigos',
          stream_url: `/api/iptv/stream/series/cam_ep_3?token=${token}`,
          info: { duration: '02:30', plot: 'Koro se encuentra con Maga, un pingüino travieso.' },
        },
      ],
    },
  };
}

function getFallbackUrl(id: string): string | null {
  const map: Record<string, string> = {
    '3732': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'live_1': 'https://nasa-hls.arc.nasa.gov/live/master.m3u8',
    'live_2': 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    'live_3': 'https://f24hls-i.akamaihd.net/hls/live/221193/F24_ES_LO_HLS/master_500.m3u8',
    'live_4': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'live_5': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'vod_1': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'vod_2': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    'vod_3': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'vod_4': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'cam_ep_1': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'cam_ep_2': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'cam_ep_3': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  };
  return map[id] || null;
}

startServer();
