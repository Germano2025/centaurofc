import React from 'react';
import { UserPlus, Plus, Calendar, DollarSign, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuickActionModal: React.FC = () => {
  const { isQuickActionOpen, setIsQuickActionOpen, setActiveModule } = useApp();

  if (!isQuickActionOpen) return null;

  const actions = [
    {
      title: 'Novo Interessado (Lead)',
      desc: 'Cadastrar contato comercial ou agendamento de aula',
      icon: UserPlus,
      color: 'bg-blue-100 text-blue-700',
      action: () => {
        setActiveModule('interessados');
        setIsQuickActionOpen(false);
      },
    },
    {
      title: 'Matricular Novo Atleta',
      desc: 'Ficha completa de cadastro com responsável e turma',
      icon: Plus,
      color: 'bg-emerald-100 text-emerald-700',
      action: () => {
        setActiveModule('atletas');
        setIsQuickActionOpen(false);
      },
    },
    {
      title: 'Agendar Treino / Chamada',
      desc: 'Iniciar registro de presenças da turma',
      icon: Calendar,
      color: 'bg-amber-100 text-amber-700',
      action: () => {
        setActiveModule('presencas');
        setIsQuickActionOpen(false);
      },
    },
    {
      title: 'Recebimento / Mensalidade',
      desc: 'Registrar pagamento ou dar baixa em mensalidade',
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-700',
      action: () => {
        setActiveModule('financeiro');
        setIsQuickActionOpen(false);
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Ações Rápidas do Sistema</h3>
          <button onClick={() => setIsQuickActionOpen(false)} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                onClick={act.action}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{act.title}</h4>
                  <p className="text-[11px] text-slate-500">{act.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
