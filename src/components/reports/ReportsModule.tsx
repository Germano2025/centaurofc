import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  BarChart3,
  Users,
  DollarSign,
  Layers,
  ClipboardCheck,
  Trophy,
  UserPlus,
  Award,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { GeneralConsolidatedReport } from './GeneralConsolidatedReport';
import { AthletesReport } from './AthletesReport';
import { FinancialReport } from './FinancialReport';
import { ClassesOccupancyReport } from './ClassesOccupancyReport';
import { AttendanceReport } from './AttendanceReport';
import { GamesReport } from './GamesReport';
import { LeadsFunnelReport } from './LeadsFunnelReport';
import { TechnicalEvaluationsReport } from './TechnicalEvaluationsReport';
import { DateRange } from '../../utils/reportUtils';
import { formatDateBR } from '../../utils/formatters';

type ReportTab =
  | 'geral'
  | 'atletas'
  | 'financeiro'
  | 'turmas'
  | 'presencas'
  | 'jogos'
  | 'funil'
  | 'avaliacoes';

type PeriodPreset =
  | 'ESTE_MES'
  | 'MES_ANTERIOR'
  | 'PERSONALIZADO';

export const ReportsModule: React.FC = () => {
  const {
    athletes = [],
    classes = [],
    responsibles = [],
    monthlyFees = [],
    extraRevenues = [],
    trainingSessions = [],
    attendances = [],
    absenceJustifications = [],
    leads = [],
    trialClasses = [],
    matches = [],
    matchGoals = [],
    matchParticipants = [],
    evaluations = [],
  } = useApp();

  const [activeTab, setActiveTab] = useState<ReportTab>('geral');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('ESTE_MES');

  // Custom date range state
  const [customRange, setCustomRange] = useState(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const end = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`;
    return { startDate: start, endDate: end };
  });

  // Calculate effective dateRange based on preset
  const dateRange: DateRange = useMemo(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (periodPreset === 'ESTE_MES') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: toISO(start), endDate: toISO(end), label: 'Este Mês' };
    }

    if (periodPreset === 'MES_ANTERIOR') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: toISO(start), endDate: toISO(end), label: 'Mês Anterior' };
    }

    // Default or PERSONALIZADO
    return {
      startDate: customRange.startDate || toISO(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: customRange.endDate || toISO(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      label: 'Personalizado',
    };
  }, [periodPreset, customRange]);

  const tabsConfig = [
    {
      id: 'geral' as ReportTab,
      label: 'Visão Geral Consolidada',
      shortLabel: 'Geral',
      icon: BarChart3,
      badge: 'Multimódulo',
    },
    {
      id: 'atletas' as ReportTab,
      label: 'Atletas & Matrículas',
      shortLabel: 'Atletas',
      icon: Users,
      badge: athletes.length,
    },
    {
      id: 'financeiro' as ReportTab,
      label: 'Financeiro & Cobranças',
      shortLabel: 'Financeiro',
      icon: DollarSign,
      badge: monthlyFees.length + extraRevenues.length,
    },
    {
      id: 'turmas' as ReportTab,
      label: 'Turmas & Ocupação',
      shortLabel: 'Turmas',
      icon: Layers,
      badge: classes.length,
    },
    {
      id: 'presencas' as ReportTab,
      label: 'Presenças & Treinos',
      shortLabel: 'Presenças',
      icon: ClipboardCheck,
      badge: trainingSessions.length,
    },
    {
      id: 'jogos' as ReportTab,
      label: 'Jogos & Competições',
      shortLabel: 'Jogos',
      icon: Trophy,
      badge: matches.length,
    },
    {
      id: 'funil' as ReportTab,
      label: 'Interessados & Funil',
      shortLabel: 'Funil & Leads',
      icon: UserPlus,
      badge: leads.length,
    },
    {
      id: 'avaliacoes' as ReportTab,
      label: 'Avaliações Técnicas',
      shortLabel: 'Avaliações',
      icon: Award,
      badge: evaluations.length,
    },
  ];

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6 pb-16">
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Relatórios Gerenciais
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Dashboard analítico e consolidação estratégica de todos os módulos com exportação em PDF e Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Print quick action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Imprimir relatório em tela"
          >
            <Printer size={15} className="text-slate-600" />
            <span className="hidden sm:inline">Imprimir Tela</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={15} className="text-blue-600" />
            <span>Filtros Globais de Análise</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedClassId('ALL');
                setPeriodPreset('ESTE_MES');
                const today = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const start = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const end = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(lastDay)}`;
                setCustomRange({ startDate: start, endDate: end });
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
              title="Redefinir filtros para o padrão"
            >
              <RefreshCw size={12} />
              <span>Limpar Filtros</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Preset Buttons */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar size={13} className="text-slate-500" />
              <span>Período de Referência</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ESTE_MES' as PeriodPreset, label: 'Este Mês' },
                { id: 'MES_ANTERIOR' as PeriodPreset, label: 'Mês Anterior' },
                { id: 'PERSONALIZADO' as PeriodPreset, label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodPreset(p.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    periodPreset === p.id
                      ? 'bg-blue-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Turma / Categoria Selector */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Layers size={13} className="text-slate-500" />
                <span>Filtrar por Turma / Categoria</span>
              </span>
              {selectedClass && (
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                  {selectedClass.category}
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 cursor-pointer"
              >
                <option value="ALL">Todas as Turmas / Categorias</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.category || 'Geral'})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Custom date range inputs when PERSONALIZADO is selected */}
        {periodPreset === 'PERSONALIZADO' && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Data Inicial:
              </label>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Data Final:
              </label>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        )}

        {/* Current Active Filters Breadcrumb Badge */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 flex-wrap">
          <span className="font-semibold text-slate-400">Parâmetros ativos:</span>
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700">
            Período: {formatDateBR(dateRange.startDate)} até {formatDateBR(dateRange.endDate)}
          </span>
          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700">
            Turma: {selectedClass ? `${selectedClass.name} (${selectedClass.category})` : 'Todas'}
          </span>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-thin">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels Content */}
      <div className="transition-all">
        {activeTab === 'geral' && (
          <GeneralConsolidatedReport
            athletes={athletes}
            classes={classes}
            monthlyFees={monthlyFees}
            extraRevenues={extraRevenues}
            trainingSessions={trainingSessions}
            attendances={attendances}
            matches={matches}
            leads={leads}
            evaluations={evaluations}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
          />
        )}

        {activeTab === 'atletas' && (
          <AthletesReport
            athletes={athletes}
            classes={classes}
            responsibles={responsibles}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
          />
        )}

        {activeTab === 'financeiro' && (
          <FinancialReport
            monthlyFees={monthlyFees}
            extraRevenues={extraRevenues}
            athletes={athletes}
            classes={classes}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
            onClassChange={(clsId) => setSelectedClassId(clsId)}
          />
        )}

        {activeTab === 'turmas' && (
          <ClassesOccupancyReport
            classes={classes}
            athletes={athletes}
            selectedClassId={selectedClassId}
          />
        )}

        {activeTab === 'presencas' && (
          <AttendanceReport
            trainingSessions={trainingSessions}
            attendances={attendances}
            absenceJustifications={absenceJustifications}
            athletes={athletes}
            classes={classes}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
          />
        )}

        {activeTab === 'jogos' && (
          <GamesReport
            matches={matches}
            classes={classes}
            athletes={athletes}
            matchGoals={matchGoals}
            matchParticipants={matchParticipants}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
          />
        )}

        {activeTab === 'funil' && (
          <LeadsFunnelReport
            leads={leads}
            trialClasses={trialClasses}
            classes={classes}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
          />
        )}

        {activeTab === 'avaliacoes' && (
          <TechnicalEvaluationsReport
            evaluations={evaluations}
            classes={classes}
            athletes={athletes}
            dateRange={dateRange}
            selectedClassId={selectedClassId}
          />
        )}
      </div>
    </div>
  );
};
