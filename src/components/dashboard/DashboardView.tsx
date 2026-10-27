import React, { useMemo } from 'react';
import {
  Users,
  UserPlus,
  Layers,
  ClipboardCheck,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useApp, PeriodFilter } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const DashboardView: React.FC = () => {
  const {
    periodFilter,
    setPeriodFilter,
    dashboardMetrics,
    setActiveModule,
    classes = [],
  } = useApp();

  const { currentUser } = useAuth();

  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: 'current_month', label: 'Mês Atual' },
    { id: 'last_month', label: 'Mês Anterior' },
    { id: 'last_3_months', label: 'Últimos 3 Meses' },
    { id: 'last_6_months', label: 'Últimos 6 Meses' },
    { id: 'custom', label: 'Personalizado' },
  ];

  // Calculated rates for the 3 financial pillars
  const totalExpected = dashboardMetrics.totalExpectedRevenue || (
    dashboardMetrics.totalReceived + dashboardMetrics.totalToReceive + dashboardMetrics.totalOverdue
  );

  const percentPaid = totalExpected > 0
    ? Math.round((dashboardMetrics.totalReceived / totalExpected) * 100)
    : 0;

  const percentPending = totalExpected > 0
    ? Math.round((dashboardMetrics.totalToReceive / totalExpected) * 100)
    : 0;

  const percentOverdue = totalExpected > 0
    ? Number(((dashboardMetrics.totalOverdue / totalExpected) * 100).toFixed(1))
    : 0;

  const activeClassesCount = useMemo(() => {
    return classes.filter((c) => c.active !== false).length;
  }, [classes]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Welcome Bar & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Olá, {currentUser.name}</span>
            <Badge variant="navy" size="sm">
              {currentUser.role}
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão Geral e Indicadores do Centauro Centro de Formação.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPeriodFilter(opt.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                periodFilter === opt.id
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 GENERAL INDICATORS: ATLETAS ATIVOS, INTERESSADOS, TURMAS, MÉDIA DE PRESENÇA */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Indicadores Gerais
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Clique no card para abrir o módulo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Atletas Ativos */}
          <StatCard
            title="Atletas Ativos"
            value={dashboardMetrics.totalActiveAthletes}
            subtitle={`${dashboardMetrics.payingAthletes} Pagantes • ${dashboardMetrics.scholarshipAthletes} Bolsistas`}
            icon={Users}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-700"
            trendBadge={
              dashboardMetrics.newAthletesPeriod > 0
                ? { text: `+${dashboardMetrics.newAthletesPeriod} no mês`, variant: 'success' }
                : { text: 'Alunos no Centauro', variant: 'neutral' }
            }
            onClick={() => setActiveModule('atletas')}
          />

          {/* 2. Interessados */}
          <StatCard
            title="Interessados"
            value={dashboardMetrics.totalLeads}
            subtitle={`${dashboardMetrics.newLeadsCount} novos • ${dashboardMetrics.scheduledTrialClassesCount} aulas marcadas`}
            icon={UserPlus}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-700"
            trendBadge={{ text: `${dashboardMetrics.leadConversionRate}% conversão`, variant: 'info' }}
            onClick={() => setActiveModule('interessados')}
          />

          {/* 3. Turmas */}
          <StatCard
            title="Turmas"
            value={activeClassesCount}
            subtitle={`${classes.length} categorias e treinos regulares`}
            icon={Layers}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-700"
            trendBadge={{ text: 'Grade Oficial', variant: 'warning' }}
            onClick={() => setActiveModule('turmas')}
          />

          {/* 4. Média de Presença */}
          <StatCard
            title="Média de Presença"
            value={
              dashboardMetrics.totalAttendances > 0
                ? `${dashboardMetrics.overallAttendanceRate}%`
                : '0%'
            }
            subtitle={
              dashboardMetrics.totalAttendances > 0
                ? `${dashboardMetrics.presentAttendances} presenças registradas`
                : 'Frequência apurada nas chamadas'
            }
            icon={ClipboardCheck}
            iconBgColor={dashboardMetrics.totalAttendances > 0 ? 'bg-emerald-50' : 'bg-slate-100'}
            iconColor={dashboardMetrics.totalAttendances > 0 ? 'text-emerald-700' : 'text-slate-500'}
            trendBadge={
              dashboardMetrics.totalAttendances > 0
                ? {
                    text: `${dashboardMetrics.overallAttendanceRate}% freq.`,
                    variant: dashboardMetrics.overallAttendanceRate >= 75 ? 'success' : 'warning',
                  }
                : { text: 'Sem chamadas', variant: 'neutral' }
            }
            onClick={() => setActiveModule('presencas')}
          />
        </div>
      </div>

      {/* 5. SAÚDE FINANCEIRA DO MÊS (PAGO, À RECEBER, EM ATRASO) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign size={18} />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Saúde Financeira do Mês
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Demonstrativo consolidado de faturamento, liquidação e acompanhamento de inadimplência.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveModule('financeiro')}
            rightIcon={<ArrowRight size={14} />}
          >
            Abrir Módulo Financeiro
          </Button>
        </div>

        {/* 3 Pillars: PAGO, À RECEBER, EM ATRASO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: PAGO */}
          <div
            onClick={() => setActiveModule('financeiro')}
            className="rounded-2xl p-5 bg-emerald-50/70 border border-emerald-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="success" size="sm" className="font-extrabold uppercase tracking-wider">
                  PAGO
                </Badge>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-950 block tracking-tight">
                {formatCurrency(dashboardMetrics.totalReceived)}
              </span>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                Mensalidades e cobranças quitadas com sucesso
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs">
              <span className="text-emerald-700 text-[11px] font-semibold">Taxa Arrecadada:</span>
              <span className="font-black text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                {percentPaid}% do total
              </span>
            </div>
          </div>

          {/* Card 2: À RECEBER */}
          <div
            onClick={() => setActiveModule('financeiro')}
            className="rounded-2xl p-5 bg-blue-50/70 border border-blue-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="primary" size="sm" className="font-extrabold uppercase tracking-wider">
                  À RECEBER
                </Badge>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-blue-950 block tracking-tight">
                {formatCurrency(dashboardMetrics.totalToReceive)}
              </span>
              <p className="text-xs text-blue-800 font-medium mt-1">
                Cobranças em aberto dentro do prazo de vencimento
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs">
              <span className="text-blue-700 text-[11px] font-semibold">Previsão no Prazo:</span>
              <span className="font-black text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300">
                {percentPending}% do total
              </span>
            </div>
          </div>

          {/* Card 3: EM ATRASO */}
          <div
            onClick={() => setActiveModule('financeiro')}
            className="rounded-2xl p-5 bg-rose-50/70 border border-rose-200 hover:border-rose-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="danger" size="sm" className="font-extrabold uppercase tracking-wider">
                  EM ATRASO
                </Badge>
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-rose-950 block tracking-tight">
                {formatCurrency(dashboardMetrics.totalOverdue)}
              </span>
              <p className="text-xs text-rose-800 font-medium mt-1">
                Cobranças vencidas pendentes de quitação
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs">
              <span className="text-rose-700 text-[11px] font-semibold">Taxa de Inadimplência:</span>
              <span className="font-black text-rose-900 bg-rose-100/90 px-2 py-0.5 rounded-md border border-rose-300">
                {percentOverdue}%
              </span>
            </div>
          </div>
        </div>

        {/* Resumo Consolidado / Barra de Destaque */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Receita Total Prevista:</span>
            <span className="text-sm font-black text-slate-900">
              {formatCurrency(dashboardMetrics.totalExpectedRevenue)}
            </span>
          </div>

          {dashboardMetrics.totalExtraRevenue > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Receitas Extras (Uniforme/Outros):</span>
              <span className="text-xs font-bold text-blue-700">
                +{formatCurrency(dashboardMetrics.totalExtraRevenue)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Eficiência de Cobrança:</span>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <TrendingUp size={12} />
              <span>{percentPaid}% Arrecadado</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Footer */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Ações Rápidas de Gestão
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Acesse diretamente os cadastros e rotinas operacionais do Centauro.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Users size={14} />}
            onClick={() => setActiveModule('atletas')}
          >
            Novo Atleta
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<UserPlus size={14} />}
            onClick={() => setActiveModule('interessados')}
          >
            Novo Interessado
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Layers size={14} />}
            onClick={() => setActiveModule('turmas')}
          >
            Ver Turmas
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<DollarSign size={14} />}
            onClick={() => setActiveModule('financeiro')}
          >
            Lançar Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
};
