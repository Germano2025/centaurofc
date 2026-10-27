import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  RotateCcw,
  CheckCircle2,
  X,
  AlertTriangle,
  Lock,
  Layers,
} from 'lucide-react';
import { UserProfile, SystemModule, PermissionAction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  SYSTEM_MODULES,
  ACTION_LABELS,
  getDefaultPermissionsForRole,
  ROLE_DEFINITIONS,
  hasUserPermission,
} from '../../utils/permissionUtils';

interface UserPermissionsModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateUserPermissions, resetUserPermissionsToRole, isLastAdmin, currentUser } = useAuth();

  // Local copy of permissions map: key `${module}:${action}` -> boolean
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const isTargetLastAdmin = user ? user.role === 'ADMINISTRADOR' && isLastAdmin(user.id) : false;

  useEffect(() => {
    if (user) {
      const defaults = getDefaultPermissionsForRole(user.role);
      const combined: Record<string, boolean> = {};

      SYSTEM_MODULES.forEach((mod) => {
        mod.actions.forEach((act) => {
          const key = `${mod.id}:${act}`;
          // If custom override exists, use it; otherwise use default
          if (user.custom_permissions && key in user.custom_permissions) {
            combined[key] = Boolean(user.custom_permissions[key]);
          } else {
            combined[key] = Boolean(defaults[key]);
          }
        });
      });

      setPermissions(combined);
      setErrorMessage('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const roleDefaults = getDefaultPermissionsForRole(user.role);

  const toggleAction = (module: SystemModule, action: PermissionAction) => {
    const key = `${module}:${action}`;
    const currentValue = Boolean(permissions[key]);

    // Safeguard: do not let last active admin remove their own administration view permission
    if (isTargetLastAdmin && key === 'administracao:visualizar' && currentValue === true) {
      setErrorMessage(
        'Ação Bloqueada: Não é permitido revogar a permissão de Administração do único Administrador ativo.'
      );
      return;
    }

    setErrorMessage('');
    setPermissions((prev) => ({
      ...prev,
      [key]: !currentValue,
    }));
  };

  const handleResetToRoleDefault = () => {
    const defaults = getDefaultPermissionsForRole(user.role);
    setPermissions(defaults);
    setErrorMessage('');
  };

  const handleGrantAll = () => {
    const all: Record<string, boolean> = {};
    SYSTEM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        all[`${mod.id}:${act}`] = true;
      });
    });
    setPermissions(all);
    setErrorMessage('');
  };

  const handleSave = () => {
    // Check if administration access is maintained if user is last admin
    if (isTargetLastAdmin && !permissions['administracao:visualizar']) {
      setErrorMessage(
        'Ação Bloqueada: O usuário é o único Administrador ativo e não pode perder a permissão de administração.'
      );
      return;
    }

    const res = updateUserPermissions(user.id, permissions);
    if (!res.success) {
      setErrorMessage(res.message || 'Erro ao salvar matriz de permissões.');
      return;
    }

    onSuccess(`Permissões personalizadas salvas com sucesso para ${user.name}!`);
    onClose();
  };

  // Group modules by category
  const categories: {
    id: 'operacional' | 'esportivo' | 'financeiro' | 'sistema';
    title: string;
    description: string;
  }[] = [
    {
      id: 'operacional',
      title: 'Módulos Operacionais & Cadastrais',
      description: 'Gestão de Atletas, Responsáveis, Turmas e Interessados.',
    },
    {
      id: 'esportivo',
      title: 'Módulos Esportivos & Campo',
      description: 'Chamadas de Presença, Jogos/Competições e Avaliações Técnicas.',
    },
    {
      id: 'financeiro',
      title: 'Módulo Financeiro & Fluxo de Caixa',
      description: 'Mensalidades, bolsas, acréscimos, cobranças e receitas extras.',
    },
    {
      id: 'sistema',
      title: 'Gestão Geral, Relatórios & Governança',
      description: 'Dashboard, Relatórios Gerenciais e Administração do Sistema.',
    },
  ];

  // Count overrides
  let overrideCount = 0;
  Object.keys(permissions).forEach((key) => {
    if (permissions[key] !== Boolean(roleDefaults[key])) {
      overrideCount++;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Matriz de Permissões: {user.name}
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {user.role}
                </span>
                {overrideCount > 0 && (
                  <span className="text-xs bg-blue-950 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">
                    {overrideCount} {overrideCount === 1 ? 'exceção' : 'exceções'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle granular de acesso por Módulo + Ação para este usuário.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Actions & Safeguard alert */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={handleResetToRoleDefault}
            >
              Restaurar Padrão ({ROLE_DEFINITIONS[user.role].name})
            </Button>
            <Button variant="outline" size="sm" onClick={handleGrantAll}>
              Conceder Todos
            </Button>
          </div>

          <div className="text-xs text-slate-500">
            {overrideCount === 0 ? (
              <span className="text-slate-600 font-medium">
                ✓ Usuário seguindo 100% as diretrizes padrão do perfil.
              </span>
            ) : (
              <span className="text-blue-700 font-bold">
                ★ {overrideCount} {overrideCount === 1 ? 'permissão personalizada' : 'permissões personalizadas'} ativas.
              </span>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Permissions Matrix */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {categories.map((cat) => {
            const modulesInCat = SYSTEM_MODULES.filter((m) => m.category === cat.id);
            if (modulesInCat.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-3">
                <div className="border-b border-slate-200 pb-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {cat.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">{cat.description}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {modulesInCat.map((module) => {
                    return (
                      <div
                        key={module.id}
                        className="p-3.5 bg-slate-50/70 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        {/* Module Info */}
                        <div className="sm:max-w-xs">
                          <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{module.label}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                            {module.description}
                          </p>
                        </div>

                        {/* Actions Checkboxes */}
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {(module.actions || []).map((act) => {
                            const key = `${module.id}:${act}`;
                            const isAllowed = Boolean(permissions[key]);
                            const isDefault = Boolean(roleDefaults[key]);
                            const isOverridden = isAllowed !== isDefault;

                            return (
                              <label
                                key={act}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                  isAllowed
                                    ? isOverridden
                                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-2xs'
                                      : 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                                    : 'bg-slate-100/80 border-slate-200 text-slate-400 line-through opacity-70'
                                }`}
                                title={ACTION_LABELS[act].description}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={() => toggleAction(module.id, act)}
                                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>{ACTION_LABELS[act].label}</span>
                                {isOverridden && (
                                  <span className="text-[9px] font-black uppercase text-blue-700 ml-0.5">
                                    ★
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-black text-blue-700">★</span>
            <span>Itens com estrela indicam exceções individuais em relação ao perfil padrão.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Salvar Matriz de Permissões
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
