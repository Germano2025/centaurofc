import React, { useMemo } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  ClipboardCheck,
  Trophy,
  Award,
  UserPlus,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  Athlete,
  SoccerClass,
  MonthlyFee,
  ExtraRevenue,
  TrainingSession,
  AttendanceRecord,
  GameMatch,
  TrialLead,
  TechnicalEvaluation,
} from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface GeneralConsolidatedReportProps {
  athletes: Athlete[];
  classes: SoccerClass[];
  monthlyFees: MonthlyFee[];
  extraRevenues: ExtraRevenue[];
  trainingSessions: TrainingSession[];
  attendances: AttendanceRecord[];
  matches: GameMatch[];
  leads: TrialLead[];
  evaluations: TechnicalEvaluation[];
  dateRange: DateRange;
  selectedClassId: string;
}

export const GeneralConsolidatedReport: React.FC<GeneralConsolidatedReportProps> = ({
  athletes = [],
  classes = [],
  monthlyFees = [],
  extraRevenues = [],
  trainingSessions = [],
  attendances = [],
  matches = [],
  leads = [],
  evaluations = [],
  dateRange,
  selectedClassId,
}) => {
  // 1. Filtragem de Atletas
  const filteredAthletes = useMemo(() => {
    return (athletes || []).filter((a) => {
      if (selectedClassId !== 'ALL') {
        const classMatch = a.current_class_id === selectedClassId || a.class_id === selectedClassId;
        if (!classMatch) return false;
      }
      return true;
    });
  }, [athletes, selectedClassId]);

  const activeAthletes = filteredAthletes.filter((a) => a.status === 'ATIVO');
  const scholarshipAthletes = activeAthletes.filter((a) => a.financial_condition === 'BOLSA_INTEGRAL');
  const payingAthletes = activeAthletes.filter((a) => a.financial_condition !== 'BOLSA_INTEGRAL');

  // 2. Filtragem Financeira no Período
  const filteredFees = useMemo(() => {
    return (monthlyFees || []).filter((f) => {
      const athlete = athletes.find((a) => a.id === f.athlete_id);
      if (selectedClassId !== 'ALL') {
        const classMatch = athlete?.current_class_id === selectedClassId || athlete?.class_id === selectedClassId;
        if (!classMatch) return false;
      }
      // Check date in range (due_date or payment_date)
      const targetDate = f.payment_date || f.due_date;
      return isDateInRange(targetDate, dateRange.startDate, dateRange.endDate);
    });
  }, [monthlyFees, athletes, selectedClassId, dateRange]);

  const filteredExtras = useMemo(() => {
    return (extraRevenues || []).filter((e) => {
      if (e.athlete_id) {
        const athlete = athletes.find((a) => a.id === e.athlete_id);
        if (selectedClassId !== 'ALL') {
          const classMatch = athlete?.current_class_id === selectedClassId || athlete?.class_id === selectedClassId;
          if (!classMatch) return false;
        }
      }
      const targetDate = e.payment_date || e.due_date || e.sale_date;
      return isDateInRange(targetDate, dateRange.startDate, dateRange.endDate);
    });
  }, [extraRevenues, athletes, selectedClassId, dateRange]);

  const totalFeesReceived = filteredFees
    .filter((f) => f.status === 'PAGO')
    .reduce((sum, f) => sum + (f.final_amount ?? f.original_amount ?? 0), 0);

  const totalExtrasReceived = filteredExtras
    .filter((e) => e.status === 'PAGO')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalReceived = totalFeesReceived + totalExtrasReceived;

  const totalFeesPending = filteredFees
    .filter((f) => f.status === 'A_RECEBER' || f.status === 'PENDENTE' || f.status === 'EM_ATRASO')
    .reduce((sum, f) => sum + (f.final_amount ?? f.original_amount ?? 0), 0);

  const totalFeesOverdue = filteredFees
    .filter((f) => f.status === 'EM_ATRASO')
    .reduce((sum, f) => sum + (f.final_amount ?? f.original_amount ?? 0), 0);

  const defaultRate =
    totalFeesReceived + totalFeesPending > 0
      ? (totalFeesOverdue / (totalFeesReceived + totalFeesPending)) * 100
      : 0;

  // 3. Filtragem de Treinos e Frequência no Período
  const filteredSessions = useMemo(() => {
    return (trainingSessions || []).filter((ts) => {
      if (selectedClassId !== 'ALL' && ts.class_id !== selectedClassId) return false;
      return isDateInRange(ts.training_date, dateRange.startDate, dateRange.endDate);
    });
  }, [trainingSessions, selectedClassId, dateRange]);

  const sessionIds = useMemo(() => new Set(filteredSessions.map((s) => s.id)), [filteredSessions]);

  const filteredAttendances = useMemo(() => {
    return (attendances || []).filter((att) => sessionIds.has(att.training_id));
  }, [attendances, sessionIds]);

  const totalPresences = filteredAttendances.filter((a) => a.present || a.status === 'PRESENTE').length;
  const attendanceRate =
    filteredAttendances.length > 0 ? (totalPresences / filteredAttendances.length) * 100 : 0;

  // 4. Jogos e Competições no Período
  const filteredMatches = useMemo(() => {
    return (matches || []).filter((m) => {
      if (selectedClassId !== 'ALL' && m.class_id !== selectedClassId) return false;
      return isDateInRange(m.match_date, dateRange.startDate, dateRange.endDate);
    });
  }, [matches, selectedClassId, dateRange]);

  const totalMatches = filteredMatches.length;
  const completedMatches = filteredMatches.filter((m) => m.status === 'REALIZADO');
  const wins = completedMatches.filter(
    (m) => (m.score_ps ?? 0) > (m.score_opponent ?? 0)
  ).length;
  const goalsScored = completedMatches.reduce((sum, m) => sum + (m.score_ps || 0), 0);
  const goalsConceded = completedMatches.reduce((sum, m) => sum + (m.score_opponent || 0), 0);

  // 5. Interessados no Período
  const filteredLeads = useMemo(() => {
    return (leads || []).filter((l) => {
      if (selectedClassId !== 'ALL' && l.preferred_class_id !== selectedClassId) return false;
      return isDateInRange(l.created_at, dateRange.startDate, dateRange.endDate);
    });
  }, [leads, selectedClassId, dateRange]);

  const convertedLeads = filteredLeads.filter(
    (l) => l.stage === 'MATRICULADO' || l.stage === 'CONVERTIDO'
  ).length;
  const conversionRate =
    filteredLeads.length > 0 ? (convertedLeads / filteredLeads.length) * 100 : 0;

  // 6. Avaliações no Período
  const filteredEvaluations = useMemo(() => {
    return (evaluations || []).filter((ev) => {
      if (selectedClassId !== 'ALL' && ev.class_id !== selectedClassId) return false;
      return isDateInRange(ev.evaluation_date, dateRange.startDate, dateRange.endDate);
    });
  }, [evaluations, selectedClassId, dateRange]);

  const avgEvalGrade = useMemo(() => {
    const list = filteredEvaluations.filter((e) => e.general_grade !== undefined && e.general_grade !== null);
    if (list.length === 0) return null;
    return (list.reduce((sum, e) => sum + Number(e.general_grade || 0), 0) / list.length).toFixed(1);
  }, [filteredEvaluations]);

  // 7. Breakdown por Turma
  const classBreakdown = useMemo(() => {
    return (classes || []).map((cls) => {
      const clsAthletes = (athletes || []).filter(
        (a) => (a.current_class_id === cls.id || a.class_id === cls.id) && a.status === 'ATIVO'
      );
      const capacity = cls.capacity_recommended || 30;
      const occupancyRate = capacity > 0 ? (clsAthletes.length / capacity) * 100 : 0;

      const clsSessions = (trainingSessions || []).filter(
        (ts) => ts.class_id === cls.id && isDateInRange(ts.training_date, dateRange.startDate, dateRange.endDate)
      );
      const clsSessionIds = new Set(clsSessions.map((s) => s.id));
      const clsAtts = (attendances || []).filter((a) => clsSessionIds.has(a.training_id));
      const clsPresences = clsAtts.filter((a) => a.present || a.status === 'PRESENTE').length;
      const clsAttRate = clsAtts.length > 0 ? (clsPresences / clsAtts.length) * 100 : 0;

      const clsMatches = (matches || []).filter(
        (m) => m.class_id === cls.id && isDateInRange(m.match_date, dateRange.startDate, dateRange.endDate)
      );

      return {
        id: cls.id,
        name: cls.name,
        category: cls.category,
        coach: cls.coach_name || 'Comissão Técnica',
        capacity,
        activeAthletesCount: clsAthletes.length,
        occupancyRate,
        sessionsCount: clsSessions.length,
        attendanceRate: clsAttRate,
        matchesCount: clsMatches.length,
      };
    });
  }, [classes, athletes, trainingSessions, attendances, matches, dateRange]);

  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = [
      'Turma',
      'Categoria',
      'Professor',
      'Atletas Ativos',
      'Capacidade',
      'Ocupação (%)',
      'Treinos',
      'Assiduidade (%)',
      'Jogos',
    ];

    const rows = classBreakdown.map((row) => [
      row.name,
      row.category || 'Geral',
      row.coach,
      row.activeAthletesCount,
      row.capacity,
      `${row.occupancyRate.toFixed(0)}%`,
      row.sessionsCount,
      row.attendanceRate > 0 ? `${row.attendanceRate.toFixed(0)}%` : '-',
      row.matchesCount,
    ]);

    exportReportToPDF({
      title: 'Relatório Executivo Consolidado Geral',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
      ],
      summaryMetrics: [
        { label: 'Atletas Ativos', value: `${activeAthletes.length}` },
        { label: 'Receita Paga', value: formatCurrency(totalReceived) },
        { label: 'Inadimplência', value: `${defaultRate.toFixed(1)}%` },
        { label: 'Presença Treinos', value: `${attendanceRate.toFixed(1)}%` },
        { label: 'Partidas (Vitórias)', value: `${totalMatches} (${wins})` },
      ],
      columns,
      rows,
      filename: `relatorio-executivo-consolidado-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Turma',
      'Nome da Turma',
      'Categoria',
      'Professor Responsável',
      'Atletas Ativos',
      'Capacidade Recomendada',
      'Taxa de Ocupação (%)',
      'Treinos Realizados no Período',
      'Assiduidade Média (%)',
      'Partidas Disputadas',
    ];

    const rows = classBreakdown.map((row) => [
      row.id,
      row.name,
      row.category || '',
      row.coach,
      row.activeAthletesCount,
      row.capacity,
      row.occupancyRate.toFixed(1),
      row.sessionsCount,
      row.attendanceRate.toFixed(1),
      row.matchesCount,
    ]);

    exportReportToCSV(
      `relatorio-executivo-consolidado-${dateRange.startDate}-${dateRange.endDate}`,
      columns,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar / Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers size={18} className="text-blue-600" />
            <span>Painel Executivo Multimódulo</span>
          </h3>
          <p className="text-xs text-slate-500">
            Visão gerencial estratégica integrada: matrículas, receitas, assiduidade, competições e funil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Exportar documento PDF formatado"
          >
            <FileText size={15} className="text-rose-600" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Exportar planilha Excel/CSV"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Planilha Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atletas Ativos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Atletas Ativos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{activeAthletes.length}</span>
            <span className="text-[11px] font-bold text-slate-500">
              {scholarshipAthletes.length} bolsistas • {payingAthletes.length} pagantes
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{
                width: `${activeAthletes.length > 0 ? (payingAthletes.length / activeAthletes.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Total Recebido */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Receita Efetivada
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">
              {formatCurrency(totalReceived)}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              {filteredFees.filter((f) => f.status === 'PAGO').length} cobranças pagas
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Mensalidades: {formatCurrency(totalFeesReceived)}</span>
            <span>Extras: {formatCurrency(totalExtrasReceived)}</span>
          </div>
        </div>

        {/* Inadimplência / Atraso */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inadimplência no Período
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">
              {formatCurrency(totalFeesOverdue)}
            </span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              {defaultRate.toFixed(1)}% taxa
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            À receber total em aberto: <strong>{formatCurrency(totalFeesPending)}</strong>
          </div>
        </div>

        {/* Frequência Média */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Assiduidade / Presença
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ClipboardCheck size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">
              {attendanceRate.toFixed(1)}%
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              {filteredSessions.length} treinos realizados
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 65 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Esportivo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Trophy size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Jogos & Rendimento
              </span>
              <p className="text-sm font-black text-slate-900">
                {totalMatches} {totalMatches === 1 ? 'partida' : 'partidas'} • {wins} vitórias
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
              ⚽ {goalsScored} GP / {goalsConceded} GC
            </span>
          </div>
        </div>

        {/* Funil & Captação */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Captação de Alunos
              </span>
              <p className="text-sm font-black text-slate-900">
                {filteredLeads.length} novos interessados
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              {conversionRate.toFixed(1)}% conversão ({convertedLeads})
            </span>
          </div>
        </div>

        {/* Avaliações Pedagógicas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                Avaliações Técnicas
              </span>
              <p className="text-sm font-black text-slate-900">
                {filteredEvaluations.length} avaliações
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
              {avgEvalGrade !== null ? `Média ${avgEvalGrade}` : 'Sem notas'}
            </span>
          </div>
        </div>
      </div>

      {/* Comparative Table by Class */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers size={17} className="text-blue-600" />
              <span>Desempenho Consolidado por Turma & Categoria</span>
            </h3>
            <p className="text-xs text-slate-500">
              Visão cruzada de capacidade, lotação, treinos e partidas no período selecionado.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {classBreakdown.length} turmas cadastradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Turma</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Professor</th>
                <th className="py-2.5 px-3 text-center">Atletas Ativos</th>
                <th className="py-2.5 px-3 text-center">Capacidade</th>
                <th className="py-2.5 px-3">Taxa de Ocupação</th>
                <th className="py-2.5 px-3 text-center">Treinos</th>
                <th className="py-2.5 px-3 text-center">Assiduidade</th>
                <th className="py-2.5 px-3 text-center">Jogos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classBreakdown.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">{row.name}</td>
                  <td className="py-3 px-3 font-semibold text-blue-700">{row.category}</td>
                  <td className="py-3 px-3 text-slate-600">{row.coach}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {row.activeAthletesCount}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-500">{row.capacity}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.occupancyRate >= 90
                              ? 'bg-rose-500'
                              : row.occupancyRate >= 70
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, row.occupancyRate)}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px] text-slate-700">
                        {row.occupancyRate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-slate-600">
                    {row.sessionsCount}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        row.attendanceRate >= 80
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.attendanceRate >= 60
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.attendanceRate > 0 ? `${row.attendanceRate.toFixed(0)}%` : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700">
                    {row.matchesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
