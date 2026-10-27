import React from 'react';
import { Menu, Search, Plus, LogOut, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { activeModule, setIsQuickActionOpen, setIsGlobalSearchOpen } = useApp();
  const { currentUser, signOut } = useAuth();

  const moduleTitles: Record<string, string> = {
    dashboard: 'Dashboard Geral',
    interessados: 'Interessados & Aulas Experimentais',
    atletas: 'Gestão de Atletas & Alunos',
    turmas: 'Turmas & Horários',
    presencas: 'Controle de Presença e Chamada',
    financeiro: 'Financeiro, Mensalidades & Fluxo',
    jogos: 'Jogos, Amistosos & Torneios',
    avaliacoes: 'Avaliações Técnicas & Rendimento',
    relatorios: 'Relatórios Gerenciais',
    administracao: 'Administração & Supabase RLS',
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            {moduleTitles[activeModule] || 'Centauro Gestão'}
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">Centro de Formação Centauro • Recife/PE</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={() => setIsGlobalSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs text-slate-500 transition-colors cursor-pointer"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Buscar no sistema...</span>
        </button>

        {/* Central de Notificações com Badge e Dropdown */}
        <NotificationDropdown />

        <button
          onClick={() => setIsQuickActionOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/20 transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Ação Rápida</span>
        </button>

        {/* User Pill & Quick Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
            <div
              title={`${currentUser.name} (${currentUser.role})`}
              className="hidden md:flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
            >
              <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.name.charAt(0)}
              </div>
              <span className="max-w-[100px] truncate font-medium text-slate-700">
                {currentUser.name.split(' ')[0]}
              </span>
            </div>

            <button
              onClick={() => signOut()}
              title="Encerrar sessão"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
