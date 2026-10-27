import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Shield,
  ShieldCheck,
  Edit2,
  Power,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  UserCheck,
  RotateCcw,
  KeyRound,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ROLE_DEFINITIONS, countCustomOverrides } from '../../utils/permissionUtils';
import { UserFormModal } from './UserFormModal';
import { UserPermissionsModal } from './UserPermissionsModal';
import { InactivateUserModal } from './InactivateUserModal';
import { formatDateBR } from '../../utils/formatters';

interface UserListTabProps {
  onNotify: (msg: string) => void;
}

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export const UserListTab: React.FC<UserListTabProps> = ({ onNotify }) => {
  const {
    availableUsers,
    currentUser,
    switchUser,
    resetUserPermissionsToRole,
    resetPasswordForEmail,
    canCreate,
    canEdit,
    canInactivate,
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState<UserProfile | null>(null);

  const [isInactivateModalOpen, setIsInactivateModalOpen] = useState(false);
  const [userToInactivate, setUserToInactivate] = useState<UserProfile | null>(null);

  // Filter users
  const filteredUsers = useMemo(() => {
    return (availableUsers || []).filter((u) => {
      // Search
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.phone && u.phone.includes(search));

      // Role filter
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;

      // Status filter
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.active) ||
        (statusFilter === 'INACTIVE' && !u.active);

      return matchSearch && matchRole && matchStatus;
    });
  }, [availableUsers, searchTerm, roleFilter, statusFilter]);

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setUserToEdit(user);
    setIsFormModalOpen(true);
  };

  const handleOpenPermissions = (user: UserProfile) => {
    setUserForPermissions(user);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenInactivate = (user: UserProfile) => {
    setUserToInactivate(user);
    setIsInactivateModalOpen(true);
  };

  const handleResetPermissions = (user: UserProfile) => {
    const res = resetUserPermissionsToRole(user.id);
    if (res.success) {
      onNotify(`Permissões de ${user.name} restauradas para o padrão do perfil ${user.role}!`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos os Perfis</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="USUARIO">Usuário</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Apenas Ativos</option>
            <option value="INACTIVE">Apenas Inativos</option>
          </select>
        </div>

        {/* Create Button */}
        <div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus size={15} />}
            onClick={handleOpenCreate}
          >
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Users Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Mostrando <strong>{filteredUsers.length}</strong> de{' '}
          <strong>{availableUsers.length}</strong> usuários cadastrados
        </span>
      </div>

      {/* User Cards / Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Perfil / Função</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Permissões</th>
                <th className="py-3 px-4">Último Acesso</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum usuário encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const overrideCount = countCustomOverrides(user);
                  const roleInfo = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS['USUARIO'];

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !user.active ? 'bg-slate-50/50 opacity-75' : ''
                      }`}
                    >
                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                              {user.name.charAt(0)}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                user.active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{user.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail size={12} className="text-slate-400" />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} className="text-slate-400" />
                                  {user.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${roleInfo.colorBadge}`}
                        >
                          {roleInfo.name}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <AlertCircle size={12} />
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* Custom Permissions Indicator */}
                      <td className="py-3 px-4">
                        {overrideCount === 0 ? (
                          <span className="text-[11px] text-slate-500 font-medium">
                            Padrão do Perfil
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenPermissions(user)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          >
                            <span>★</span>
                            <span>{overrideCount} {overrideCount === 1 ? 'exceção' : 'exceções'}</span>
                          </button>
                        )}
                      </td>

                      {/* Last Access */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {user.last_access ? (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {new Date(user.last_access).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">Nunca acessou</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Switch to this user (Simulator) */}
                          <button
                            onClick={() => {
                              switchUser(user.id);
                              onNotify(`Sessão alternada para ${user.name}!`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Alternar para este usuário"
                          >
                            <UserCheck size={15} />
                          </button>

                          {/* Manage Permissions */}
                          <button
                            onClick={() => handleOpenPermissions(user)}
                            className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title="Gerenciar Permissões Granulares"
                          >
                            <ShieldCheck size={15} />
                          </button>

                          {/* Edit User Info */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Dados Cadastrais"
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Send Password Setup / Reset link via Supabase Auth */}
                          <button
                            onClick={async () => {
                              const res = await resetPasswordForEmail(user.email);
                              if (res.success) {
                                onNotify(
                                  `Link de definição de acesso enviado para ${user.email} via Supabase Auth!`
                                );
                              } else {
                                onNotify(`Aviso: ${res.message}`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Enviar Link de Definição/Redefinição de Senha (Supabase Auth)"
                          >
                            <KeyRound size={15} />
                          </button>

                          {/* Activate / Inactivate */}
                          <button
                            onClick={() => handleOpenInactivate(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              user.active
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={user.active ? 'Inativar Usuário' : 'Reativar Usuário'}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <UserFormModal
        userToEdit={userToEdit}
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={onNotify}
      />

      <UserPermissionsModal
        user={userForPermissions}
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onSuccess={onNotify}
      />

      <InactivateUserModal
        user={userToInactivate}
        isOpen={isInactivateModalOpen}
        onClose={() => setIsInactivateModalOpen(false)}
        onSuccess={onNotify}
      />
    </div>
  );
};
