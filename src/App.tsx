import React, { useState } from 'react';
import {
  Users,
  Layers,
  UserPlus,
  ClipboardCheck,
  DollarSign,
  Trophy,
  Award,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { QuickActionModal } from './components/layout/QuickActionModal';
import { PaymentModal } from './components/financial/PaymentModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { AthletesModule } from './components/athletes/AthletesModule';
import { ClassesModule } from './components/classes/ClassesModule';
import { PresencasModule } from './components/presencas/PresencasModule';
import { FinancialModule } from './components/financial/FinancialModule';
import { LeadsModule } from './components/leads/LeadsModule';
import { GamesModule } from './components/games/GamesModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { AdminModule } from './components/admin/AdminModule';
import { PublicLeadForm } from './components/leads/PublicLeadForm';
import { LoginScreen } from './components/auth/LoginScreen';
import { ModulePlaceholder } from './components/common/ModulePlaceholder';
import { Toast } from './components/common/Toast';

function checkIsPublicRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    search.includes('form=interessados') ||
    search.includes('inscricao=true') ||
    search.includes('public=true') ||
    hash.includes('formulario') ||
    hash.includes('inscricao')
  );
}

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeModule, toastMessage } = useApp();
  const { hasPermission, currentUser, realAuthUser, isSimulatingUser, revertSimulation } = useAuth();

  const renderCurrentModule = () => {
    if (!hasPermission(activeModule)) {
      return (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 mt-4">
          <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
          <p className="text-xs text-slate-500 mt-1">
            Seu perfil de usuário não possui permissão para acessar este módulo.
          </p>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'atletas':
        return <AthletesModule />;
      case 'turmas':
        return <ClassesModule />;
      case 'interessados':
        return <LeadsModule />;
      case 'presencas':
        return <PresencasModule />;
      case 'financeiro':
        return <FinancialModule />;
      case 'jogos':
        return <GamesModule />;
      case 'relatorios':
        return <ReportsModule />;
      case 'administracao':
        return <AdminModule />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Simulation Banner */}
      {isSimulatingUser && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="bg-black/15 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
              Simulação de Permissões
            </span>
            <span>
              Visualizando como: <strong>{currentUser?.name}</strong> ({currentUser?.role})
            </span>
          </div>
          <button
            onClick={revertSimulation}
            className="px-2.5 py-1 bg-slate-950 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold cursor-pointer"
          >
            Voltar para {realAuthUser?.name?.split(' ')[0] || 'minha conta'}
          </button>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {renderCurrentModule()}
        </main>
      </div>

      {/* Modals */}
      <GlobalSearchModal />
      <QuickActionModal />
      <PaymentModal />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage.text} type={toastMessage.type} />
      )}
    </div>
  );
};

function AppRouting() {
  const [isPublicForm] = useState<boolean>(() => checkIsPublicRoute());
  const { addLead } = useApp();
  const { currentUser, isLoadingAuth } = useAuth();

  if (isPublicForm) {
    return (
      <PublicLeadForm
        onLeadAdded={(lead) => {
          addLead(lead, 'Formulário Online');
        }}
      />
    );
  }

  // Splash Loading
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#061426] via-[#0A1D37] to-[#08182B] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-950/60 p-2 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-4 animate-pulse">
          <img
            src="/centauro-logo.png"
            alt="Centauro"
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-base font-black text-amber-400 tracking-widest">CENTAURO</h2>
        <p className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase mt-0.5">Centro de Formação</p>
        <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Carregando plataforma Centauro...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Render real LoginScreen
  if (!currentUser) {
    return <LoginScreen />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRouting />
      </AppProvider>
    </AuthProvider>
  );
}
