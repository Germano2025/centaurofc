import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuditLog, AuditActionType } from '../../types';
import { Badge } from '../common/Badge';

export const AuditLogsTab: React.FC = () => {
  const { auditLogs } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter((log) => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        log.description.toLowerCase().includes(search) ||
        log.performer_name.toLowerCase().includes(search) ||
        (log.target_user_name && log.target_user_name.toLowerCase().includes(search));

      const matchAction = actionFilter === 'ALL' || log.action_type === actionFilter;

      return matchSearch && matchAction;
    });
  }, [auditLogs, searchTerm, actionFilter]);

  const getActionBadge = (type: AuditActionType) => {
    switch (type) {
      case 'CRIACAO_USUARIO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck size={11} /> Criação
          </span>
        );
      case 'INATIVACAO_USUARIO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <UserX size={11} /> Inativação
          </span>
        );
      case 'REATIVACAO_USUARIO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck size={11} /> Reativação
          </span>
        );
      case 'ALTERACAO_PERFIL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldAlert size={11} /> Troca de Perfil
          </span>
        );
      case 'ALTERACAO_PERMISSOES':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck size={11} /> Permissões
          </span>
        );
      case 'RESET_PERMISSOES':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Reset Padrão
          </span>
        );
      case 'EDICAO_USUARIO':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Edição
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, autor ou alvo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todas as Ações</option>
            <option value="CRIACAO_USUARIO">Criação de Usuário</option>
            <option value="EDICAO_USUARIO">Edição de Cadastro</option>
            <option value="INATIVACAO_USUARIO">Inativação de Usuário</option>
            <option value="REATIVACAO_USUARIO">Reativação de Usuário</option>
            <option value="ALTERACAO_PERFIL">Alteração de Perfil</option>
            <option value="ALTERACAO_PERMISSOES">Alteração de Permissões</option>
            <option value="RESET_PERMISSOES">Reset para Padrão</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <History size={16} className="text-blue-600" />
            <span>Trilha de Auditoria Administrativa</span>
          </div>
          <span className="text-slate-500">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Data / Hora</th>
                <th className="py-2.5 px-4">Ação</th>
                <th className="py-2.5 px-4">Executor (Autor)</th>
                <th className="py-2.5 px-4">Usuário Alvo</th>
                <th className="py-2.5 px-4">Descrição da Alteração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhum log de auditoria encontrado para o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const date = new Date(log.timestamp);
                  const formattedDate = date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const formattedTime = date.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-slate-700">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formattedDate}</span>
                          <span className="text-[10px] text-slate-400">às {formattedTime}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action_type)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {log.performer_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.target_user_name ? (
                          <span className="text-slate-700 font-medium">{log.target_user_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 leading-relaxed max-w-md">
                        {log.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
