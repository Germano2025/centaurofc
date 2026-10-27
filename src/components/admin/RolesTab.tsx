import React from 'react';
import { Shield, Users, Check, X, Info, ChevronRight } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  ROLE_DEFINITIONS,
  SYSTEM_MODULES,
  getDefaultPermissionsForRole,
} from '../../utils/permissionUtils';
import { Badge } from '../common/Badge';

export const RolesTab: React.FC = () => {
  const { availableUsers } = useAuth();

  const roles: UserRole[] = ['ADMINISTRADOR', 'USUARIO'];

  return (
    <div className="space-y-6">
      {/* Informational Guidance Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold text-sm text-blue-950">
            Perfis de Usuários do Sistema — Centauro
          </p>
          <p className="mt-1 text-blue-800">
            O sistema opera com 2 perfis: <strong>Administrador</strong> (acesso completo a todos os módulos, cadastros e administração) e <strong>Usuário</strong> (visualização de todos os módulos operacionais e esportivos, sem acesso padrão à Administração). Caso um usuário necessite de permissões complementares de edição ou acesso a módulos específicos, é possível conceder <strong>exceções granulares</strong> sem alterar seu perfil base.
          </p>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const info = ROLE_DEFINITIONS[role];
          const members = (availableUsers || []).filter((u) => u.role === role);
          const activeCount = members.filter((u) => u.active).length;
          const defaultPerms = getDefaultPermissionsForRole(role);

          return (
            <div
              key={role}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{info.name}</h4>
                      <p className="text-[11px] text-slate-500">{info.tagline}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${info.colorBadge}`}
                  >
                    {activeCount} {activeCount === 1 ? 'ativo' : 'ativos'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {info.description}
                </p>

                {/* Assigned Users list */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Membros Associados ({members.length}):
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {members.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        Nenhum usuário cadastrado neste perfil.
                      </span>
                    ) : (
                      members.map((u) => (
                        <span
                          key={u.id}
                          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                            u.active
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>{u.name}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Modules scope badges */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                {SYSTEM_MODULES.map((mod) => {
                  const canView = Boolean(defaultPerms[`${mod.id}:visualizar`]);
                  if (!canView) return null;
                  return (
                    <span
                      key={mod.id}
                      className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded"
                    >
                      {mod.label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparative Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Matriz Comparativa de Módulos & Perfis
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Visão panorâmica dos acessos concedidos por padrão a cada perfil do sistema.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-4">Módulo do Sistema</th>
                <th className="py-2.5 px-4 text-center w-36">Administrador</th>
                <th className="py-2.5 px-4 text-center w-36">Usuário (Padrão)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SYSTEM_MODULES.map((mod) => {
                const adminPerm = getDefaultPermissionsForRole('ADMINISTRADOR')[`${mod.id}:visualizar`];
                const userPerm = getDefaultPermissionsForRole('USUARIO')[`${mod.id}:visualizar`];

                return (
                  <tr key={mod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <div>
                        <span>{mod.label}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {mod.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                        <Check size={13} />
                        <span>Acesso Total</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {userPerm ? (
                        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium text-[11px]">
                          <Check size={13} />
                          <span>Visualizar</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium text-[11px]">
                          <X size={13} />
                          <span>Sem Acesso</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
