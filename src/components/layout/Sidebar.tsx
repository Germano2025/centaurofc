import React from 'react';
import {
  Trophy,
  Users,
  Calendar,
  ClipboardCheck,
  UserPlus,
  Trophy as TrophyIcon,
  DollarSign,
  FileText,
  Shield,
  LayoutDashboard,
  X,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SystemModule } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeModule, setActiveModule } = useApp();
  const { currentUser, hasPermission, signOut, isSimulatingUser, revertSimulation } = useAuth();

  const navItems: { id: SystemModule; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
    { id: 'interessados', label: 'Interessados & Funil', icon: UserPlus },
    { id: 'atletas', label: 'Atletas & Matrículas', icon: Users },
    { id: 'turmas', label: 'Turmas & Horários', icon: Calendar },
    { id: 'presencas', label: 'Controle de Presença', icon: ClipboardCheck },
    { id: 'financeiro', label: 'Financeiro & Mensalidades', icon: DollarSign },
    { id: 'jogos', label: 'Jogos & Competições', icon: TrophyIcon },
    { id: 'relatorios', label: 'Relatórios Gerenciais', icon: FileText },
    { id: 'administracao', label: 'Administração & Supabase', icon: Shield },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-40 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-amber-500/30 shadow-md shadow-amber-500/10">
                <img
                  src="/centauro-logo.png"
                  alt="Centauro Centro de Formação"
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wider text-amber-400">
                  CENTAURO
                </h2>
                <p className="text-[10px] text-slate-400 tracking-wide font-medium">Centro de Formação</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const allowed = hasPermission(item.id);
              const isActive = activeModule === item.id;

              if (!allowed) return null;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70">
          {isSimulatingUser && (
            <div className="mb-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-center justify-between">
              <span>Modo Simulação</span>
              <button
                onClick={revertSimulation}
                className="font-bold underline text-amber-400 hover:text-amber-200 cursor-pointer"
              >
                Voltar
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400 shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Usuário'}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentUser?.role === 'ADMINISTRADOR' ? 'Administrador' : 'Usuário'}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              title="Encerrar Sessão (Logout)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
