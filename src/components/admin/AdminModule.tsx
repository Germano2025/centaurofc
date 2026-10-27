import React, { useState } from 'react';
import {
  Users,
  Shield,
  History,
  Database,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { StatCard } from '../common/StatCard';
import { UserListTab } from './UserListTab';
import { RolesTab } from './RolesTab';
import { AuditLogsTab } from './AuditLogsTab';
import { SupabaseSecurityTab } from './SupabaseSecurityTab';
import { DataManagementTab } from './DataManagementTab';
import { UploadCloud } from 'lucide-react';

export type AdminTab = 'usuarios' | 'perfis' | 'auditoria' | 'seguranca_supabase' | 'dados_producao';

export const AdminModule: React.FC = () => {
  const { currentUser, availableUsers = [], auditLogs = [], canView } = useAuth();
  const { setActiveModule } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios');
  const [notification, setNotification] = useState<string | null>(null);

  // Security barrier: verify administrative access permission
  const hasAccess = canView ? canView('administracao') : currentUser?.role === 'ADMINISTRADOR';

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Acesso Restrito ao Módulo Administrativo</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Seu perfil atual ({currentUser?.role || 'Visitante'}) não possui permissão para visualizar ou gerenciar
            usuários e configurações de segurança do sistema.
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => setActiveModule('dashboard')}
          >
            Voltar ao Dashboard Geral
          </Button>
        </div>
      </div>
    );
  }

  // Summary counts
  const totalUsers = availableUsers?.length || 0;
  const activeUsers = availableUsers?.filter((u) => u.active).length || 0;
  const adminCount = availableUsers?.filter((u) => u.active && u.role === 'ADMINISTRADOR').length || 0;
  const totalAuditLogs = auditLogs?.length || 0;

  const tabs: { id: AdminTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'usuarios', label: 'Usuários & Acesso', icon: Users },
    { id: 'perfis', label: 'Perfis & Matriz Padrão', icon: Shield },
    { id: 'auditoria', label: 'Trilha de Auditoria', icon: History },
    { id: 'dados_producao', label: 'Dados Reais & Produção', icon: UploadCloud },
    { id: 'seguranca_supabase', label: 'Segurança & Supabase RLS', icon: Database },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Notification */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Usuários"
          value={totalUsers}
          subtitle={`${activeUsers} ativos • ${totalUsers - activeUsers} inativos`}
          icon={Users}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-700"
          onClick={() => setActiveTab('usuarios')}
        />

        <StatCard
          title="Usuários Ativos"
          value={activeUsers}
          subtitle="Com acesso regular liberado"
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-700"
          onClick={() => setActiveTab('usuarios')}
        />

        <StatCard
          title="Administradores"
          value={adminCount}
          subtitle="Acesso irrestrito ao sistema"
          icon={ShieldCheck}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-700"
          onClick={() => setActiveTab('perfis')}
        />

        <StatCard
          title="Logs de Auditoria"
          value={totalAuditLogs}
          subtitle="Registros imutáveis de segurança"
          icon={History}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-700"
          onClick={() => setActiveTab('auditoria')}
        />
      </div>

      {/* Tabs Navigation Header */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
        <nav className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold text-xs transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'usuarios' && <UserListTab onNotify={showNotification} />}
        {activeTab === 'perfis' && <RolesTab />}
        {activeTab === 'auditoria' && <AuditLogsTab />}
        {activeTab === 'dados_producao' && <DataManagementTab />}
        {activeTab === 'seguranca_supabase' && <SupabaseSecurityTab />}
      </div>
    </div>
  );
};
