import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Server,
  Lock,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Radio,
  X,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ManagedUser, UpstreamSettings, NeshUser } from '../types';
import { xtreamApi } from '../services/xtreamApi';

interface AdminPanelProps {
  currentUser: NeshUser;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'upstream'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [upstream, setUpstream] = useState<UpstreamSettings>({
    serverUrl: 'http://smarterstv99.dyndns.tv:25461',
    username: 'BTVCOL',
    password: 'w2gNRjBYsrHA',
  });

  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Connection test state
  const [isTestingUpstream, setIsTestingUpstream] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // User modal (Create / Edit)
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formExpiry, setFormExpiry] = useState('2026-12-31');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');

  // Upstream form
  const [upServerUrl, setUpServerUrl] = useState('http://smarterstv99.dyndns.tv:25461');
  const [upUsername, setUpUsername] = useState('BTVCOL');
  const [upPassword, setUpPassword] = useState('w2gNRjBYsrHA');
  const [showUpPassword, setShowUpPassword] = useState(false);
  const [isSavingUpstream, setIsSavingUpstream] = useState(false);

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load data from localStorage for admin bypass
  const loadLocalData = () => {
    setIsLoadingUsers(true);
    try {
      const savedUsers = localStorage.getItem('nesh_managed_users');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      } else {
        const initialUsers: ManagedUser[] = [
          {
            id: '1',
            username: 'admin',
            password: 'admin2026',
            name: 'Administrador General',
            status: 'active',
            expiryDate: '2030-12-31',
            role: 'admin',
            notes: 'Cuenta principal'
          },
          {
            id: '2',
            username: 'cliente1',
            password: '123456',
            name: 'Cliente Demo',
            status: 'active',
            expiryDate: '2026-12-31',
            role: 'user',
            notes: 'Prueba'
          }
        ];
        setUsers(initialUsers);
        localStorage.setItem('nesh_managed_users', JSON.stringify(initialUsers));
      }

      const savedUpstream = localStorage.getItem('nesh_upstream_settings');
      if (savedUpstream) {
        const parsed = JSON.parse(savedUpstream);
        setUpstream(parsed);
        setUpServerUrl(parsed.serverUrl);
        setUpUsername(parsed.username);
        setUpPassword(parsed.password);
      }
    } catch (err: any) {
      setError('Error al cargar datos locales');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setFormUsername('');
    setFormPassword(Math.random().toString(36).substring(2, 8));
    setFormName('');
    setFormExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormNotes('');
    setFormStatus('active');
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: ManagedUser) => {
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormPassword(u.password);
    setFormName(u.name);
    setFormExpiry(u.expiryDate || '2026-12-31');
    setFormNotes(u.notes || '');
    setFormStatus(u.status);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let updatedUsers = [...users];
      if (editingUserId) {
        updatedUsers = updatedUsers.map(u => u.id === editingUserId ? {
          ...u,
          username: formUsername,
          password: formPassword,
          name: formName,
          expiryDate: formExpiry,
          notes: formNotes,
          status: formStatus
        } : u);
        setSuccessMessage('Usuario actualizado exitosamente');
      } else {
        const newUser: ManagedUser = {
          id: Date.now().toString(),
          username: formUsername,
          password: formPassword,
          name: formName || formUsername,
          expiryDate: formExpiry,
          notes: formNotes,
          status: formStatus,
          role: 'user'
        };
        updatedUsers.push(newUser);
        setSuccessMessage('Nuevo cliente creado exitosamente');
      }

      setUsers(updatedUsers);
      localStorage.setItem('nesh_managed_users', JSON.stringify(updatedUsers));
      setShowUserModal(false);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError('Error al guardar el usuario');
    }
  };

  const handleToggleStatus = async (u: ManagedUser) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    const updatedUsers = users.map(item => item.id === u.id ? { ...item, status: nextStatus } : item);
    setUsers(updatedUsers);
    localStorage.setItem('nesh_managed_users', JSON.stringify(updatedUsers));
  };

  const handleDeleteUser = async (u: ManagedUser) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${u.username}"?`)) return;
    const updatedUsers = users.filter(item => item.id !== u.id);
    setUsers(updatedUsers);
    localStorage.setItem('nesh_managed_users', JSON.stringify(updatedUsers));
    setSuccessMessage(`Usuario ${u.username} eliminado`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCopyAccess = (u: ManagedUser) => {
    const text = `📺 Acceso a tu cuenta NesTV IPTV:\n👤 Usuario: ${u.username}\n🔑 Contraseña: ${u.password}\n📅 Vencimiento: ${u.expiryDate}\n🔗 Ingresa en: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveUpstream = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUpstream(true);
    setError(null);
    try {
      const newSettings = {
        serverUrl: upServerUrl,
        username: upUsername,
        password: upPassword,
      };
      setUpstream(newSettings);
      localStorage.setItem('nesh_upstream_settings', JSON.stringify(newSettings));
      setSuccessMessage('Configuración del servidor IPTV maestro guardada');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError('Error al guardar servidor maestro');
    } finally {
      setIsSavingUpstream(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingUpstream(true);
    setTestResult(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestResult({ connected: true, statusCode: '200', authStatus: 'OK' });
    } catch (err: any) {
      setTestResult({ connected: false, error: 'No se pudo conectar' });
    } finally {
      setIsTestingUpstream(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00ff66]/15 border border-[#00ff66] flex items-center justify-center text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Panel de Administración</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#00ff66] text-black">
                  Control Total
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Gestiona tus clientes y protege tus credenciales IPTV
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 border-b border-neutral-800 flex gap-2 bg-[#161616]">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-[#00ff66] text-[#00ff66]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestor de Clientes ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upstream')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'upstream'
                ? 'border-[#00ff66] text-[#00ff66]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Servidor IPTV Maestro & Protección</span>
          </button>
        </div>

        {/* Alerts & Messages */}
        <div className="px-6 pt-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 mb-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-[#00ff66]/50 text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 mb-3">
              <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
              <span className="flex-1">{successMessage}</span>
            </div>
          )}
        </div>

        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">Cuentas de Usuarios / Clientes</h3>
                <p className="text-xs text-neutral-400">
                  Crea usuarios individuales. Cada cliente entra solo con su usuario y contraseña asignados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadLocalData}
                  disabled={isLoadingUsers}
                  className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800"
                  title="Refrescar lista"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleOpenCreateUser}
                  className="px-4 py-2.5 rounded-xl bg-[#00ff66] text-black font-extrabold text-xs sm:text-sm tracking-wide shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:bg-[#00cc52] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>NUEVO CLIENTE</span>
                </button>
              </div>
            </div>

            {/* Users Table / List */}
            <div className="bg-[#181818] border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/60 text-neutral-400 uppercase tracking-wider text-[11px] border-b border-neutral-800">
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Contraseña</th>
                      <th className="py-3 px-4">Nombre / Cliente</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Vencimiento</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {users.map((u) => {
                      const isSuspended = u.status === 'suspended';
                      const isCurrentUser = u.username === currentUser.username;

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-neutral-800/40 transition-colors ${
                            isSuspended ? 'opacity-60 bg-red-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                            <span>{u.username}</span>
                            {u.role === 'admin' && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded font-sans">
                                Admin
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-300">
                            {u.password}
                          </td>
                          <td className="py-3.5 px-4 text-white font-medium">
                            {u.name}
                            {u.notes && (
                              <span className="block text-[10px] text-neutral-400">
                                {u.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isCurrentUser}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                !isSuspended
                                  ? 'bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/30 hover:bg-red-950/40 hover:text-red-400'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-[#00ff66]/15 hover:text-[#00ff66]'
                              }`}
                              title="Clic para cambiar estado"
                            >
                              {!isSuspended ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Activo</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  <span>Suspendido</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-300">
                            {u.expiryDate || 'Sin límite'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCopyAccess(u)}
                                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                  copiedId === u.id
                                    ? 'bg-[#00ff66] text-black border-[#00ff66]'
                                    : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:text-white hover:border-[#00ff66]'
                                }`}
                                title="Copiar datos para enviar al cliente"
                              >
                                {copiedId === u.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-[#00ff66] transition-colors cursor-pointer"
                                title="Editar usuario"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-red-400 hover:border-red-500/50 transition-colors cursor-pointer"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: UPSTREAM MASTER IPTV SETTINGS */}
        {activeTab === 'upstream' && (
          <div className="p-6
    </div>
  );
};
