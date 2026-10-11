import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  expiryDate: string;
  createdAt: string;
  notes?: string;
}

export interface UpstreamConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export interface AppConfig {
  upstream: UpstreamConfig;
  users: AppUser[];
}

const CONFIG_FILE = path.resolve(__dirname, '..', 'data', 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  upstream: {
    serverUrl: process.env.XTREAM_SERVER_URL || 'http://bstv.online:8080',
    username: process.env.XTREAM_USERNAME || '68moct01',
    password: process.env.XTREAM_PASSWORD || '9846871h',
  },
  users: [
    {
      id: 'admin-1',
      username: 'admin',
      password: 'admin2026',
      name: 'Administrador (Tú)',
      role: 'admin',
      status: 'active',
      expiryDate: '2030-12-31',
      createdAt: '2025-01-01',
      notes: 'Cuenta principal de control',
    },
    {
      id: 'user-1',
      username: 'cliente1',
      password: 'tv1234',
      name: 'Cliente de Prueba 1',
      role: 'user',
      status: 'active',
      expiryDate: '2026-12-31',
      createdAt: '2025-01-01',
      notes: 'Cliente activo',
    },
    {
      id: 'user-2',
      username: 'cliente2',
      password: 'tv5678',
      name: 'Cliente de Prueba 2',
      role: 'user',
      status: 'active',
      expiryDate: '2026-12-31',
      createdAt: '2025-01-01',
      notes: 'Cliente activo',
    },
    {
      id: 'demo-1',
      username: 'demo',
      password: 'demo',
      name: 'Acceso Demo',
      role: 'user',
      status: 'active',
      expiryDate: '2030-12-31',
      createdAt: '2025-01-01',
      notes: 'Usuario de demostración',
    },
  ],
};

// Ensure data folder and config file exist
function loadConfig(): AppConfig {
  try {
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
      return DEFAULT_CONFIG;
    }

    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      upstream: { ...DEFAULT_CONFIG.upstream, ...parsed.upstream },
      users: parsed.users || DEFAULT_CONFIG.users,
    };
  } catch (err) {
    console.error('Error loading config:', err);
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: AppConfig) {
  try {
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

export const storage = {
  getConfig(): AppConfig {
    return loadConfig();
  },

  getUpstream(): UpstreamConfig {
    return loadConfig().upstream;
  },

  setUpstream(upstream: Partial<UpstreamConfig>) {
    const conf = loadConfig();
    conf.upstream = { ...conf.upstream, ...upstream };
    saveConfig(conf);
    return conf.upstream;
  },

  getUsers(): AppUser[] {
    return loadConfig().users;
  },

  getUserByUsername(username: string): AppUser | undefined {
    return loadConfig().users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  },

  authenticate(username: string, password: string): AppUser | null {
    const user = this.getUserByUsername(username);
    if (!user) return null;
    if (user.password !== password.trim()) return null;
    if (user.status !== 'active') return null;

    // Check expiration if set
    if (user.expiryDate) {
      const exp = new Date(user.expiryDate);
      if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return null;
      }
    }
    return user;
  },

  addUser(user: Omit<AppUser, 'id' | 'createdAt'>): AppUser {
    const conf = loadConfig();
    const existing = conf.users.find(
      (u) => u.username.toLowerCase() === user.username.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`El nombre de usuario "${user.username}" ya existe`);
    }

    const newUser: AppUser = {
      ...user,
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: user.username.trim(),
      password: user.password.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    conf.users.unshift(newUser);
    saveConfig(conf);
    return newUser;
  },

  updateUser(id: string, updates: Partial<Omit<AppUser, 'id' | 'createdAt'>>): AppUser {
    const conf = loadConfig();
    const idx = conf.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      throw new Error('Usuario no encontrado');
    }

    // If changing username, ensure uniqueness
    if (updates.username) {
      const check = conf.users.find(
        (u) => u.id !== id && u.username.toLowerCase() === updates.username!.trim().toLowerCase()
      );
      if (check) {
        throw new Error(`El nombre de usuario "${updates.username}" ya está en uso`);
      }
    }

    const updated = {
      ...conf.users[idx],
      ...updates,
      username: updates.username ? updates.username.trim() : conf.users[idx].username,
      password: updates.password ? updates.password.trim() : conf.users[idx].password,
    };

    conf.users[idx] = updated;
    saveConfig(conf);
    return updated;
  },

  deleteUser(id: string) {
    const conf = loadConfig();
    const user = conf.users.find((u) => u.id === id);
    if (user?.role === 'admin' && conf.users.filter((u) => u.role === 'admin').length <= 1) {
      throw new Error('No puedes eliminar al único administrador del sistema');
    }
    conf.users = conf.users.filter((u) => u.id !== id);
    saveConfig(conf);
  },
};
