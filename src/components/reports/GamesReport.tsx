import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Calendar,
  Layers,
  Search,
  Filter,
  Award,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
} from 'lucide-react';
import {
  GameMatch,
  SoccerClass,
  Athlete,
  MatchGoal,
  MatchParticipant,
} from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatDateBR } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';

interface GamesReportProps {
  matches: GameMatch[];
  classes: SoccerClass[];
  athletes: Athlete[];
  matchGoals: MatchGoal[];
  matchParticipants?: MatchParticipant[];
  dateRange: DateRange;
  selectedClassId: string;
}

export const GamesReport: React.FC<GamesReportProps> = ({
  matches = [],
  classes = [],
  athletes = [],
  matchGoals = [],
  matchParticipants = [],
  dateRange,
  selectedClassId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REALIZADO' | 'AGENDADO' | 'CANCELADO'>('ALL');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'VITORIA' | 'EMPATE' | 'DERROTA'>('ALL');

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return (matches || []).filter((m) => {
      // 1. Class filter
      if (selectedClassId !== 'ALL' && m.class_id !== selectedClassId) {
        return false;
      }

      // 2. Date range
      const matchDate = m.match_date || (m as any).date;
      if (!isDateInRange(matchDate, dateRange.startDate, dateRange.endDate)) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'ALL') {
        const isCompleted = m.status === 'REALIZADO' || m.status === 'FINALIZADO';
        if (statusFilter === 'REALIZADO' && !isCompleted) return false;
        if (statusFilter === 'AGENDADO' && m.status !== 'AGENDADO' && m.status !== 'EM_ANDAMENTO') return false;
        if (statusFilter === 'CANCELADO' && m.status !== 'CANCELADO') return false;
      }

      // 4. Result filter (only applies to completed matches)
      if (resultFilter !== 'ALL') {
        const isCompleted = m.status === 'REALIZADO' || m.status === 'FINALIZADO';
        if (!isCompleted) return false;
        const psScore = m.score_ps ?? 0;
        const oppScore = m.score_opponent ?? 0;
        if (resultFilter === 'VITORIA' && psScore <= oppScore) return false;
        if (resultFilter === 'EMPATE' && psScore !== oppScore) return false;
        if (resultFilter === 'DERROTA' && psScore >= oppScore) return false;
      }

      // 5. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const oppMatch = (m.opponent || '').toLowerCase().includes(q);
        const compMatch = (m.competition_name || '').toLowerCase().includes(q);
        const classMatch = (m.class_name || '').toLowerCase().includes(q);
        const catMatch = (m.category || '').toLowerCase().includes(q);
        if (!oppMatch && !compMatch && !classMatch && !catMatch) return false;
      }

      return true;
    });
  }, [matches, selectedClassId, dateRange, statusFilter, resultFilter, searchTerm]);

  // Aggregate Metrics
  const totalMatches = filteredMatches.length;
  const completedMatches = filteredMatches.filter(
    (m) => m.status === 'REALIZADO' || m.status === 'FINALIZADO'
  );
  const scheduledMatches = filteredMatches.filter(
    (m) => m.status === 'AGENDADO' || m.status === 'EM_ANDAMENTO'
  );

  const wins = completedMatches.filter(
    (m) => (m.score_ps ?? 0) > (m.score_opponent ?? 0)
  ).length;
  const draws = completedMatches.filter(
    (m) => (m.score_ps ?? 0) === (m.score_opponent ?? 0)
  ).length;
  const losses = completedMatches.filter(
    (m) => (m.score_ps ?? 0) < (m.score_opponent ?? 0)
  ).length;

  const winRate = completedMatches.length > 0 ? (wins / completedMatches.length) * 100 : 0;

  const goalsScored = completedMatches.reduce((sum, m) => sum + (m.score_ps || 0), 0);
  const goalsConceded = completedMatches.reduce((sum, m) => sum + (m.score_opponent || 0), 0);
  const goalDifference = goalsScored - goalsConceded;

  // Goals Breakdown by Athlete (Artilharia no Período)
  const topScorers = useMemo(() => {
    const periodMatchIds = new Set(filteredMatches.map((m) => m.id));
    const goalMap = new Map<string, { athlete_name: string; count: number; category?: string }>();

    (matchGoals || []).forEach((g) => {
      if (periodMatchIds.has(g.match_id)) {
        const ath = athletes.find((a) => a.id === g.athlete_id);
        const name = g.athlete_name || ath?.name || 'Atleta';
        const cur = goalMap.get(g.athlete_id) || {
          athlete_name: name,
          count: 0,
          category: ath?.category,
        };
        goalMap.set(g.athlete_id, {
          ...cur,
          count: cur.count + (g.goals_count || 1),
        });
      }
    });

    return Array.from(goalMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredMatches, matchGoals, athletes]);

  // Export handlers
  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = ['Data', 'Competição', 'Turma / Categoria', 'Adversário', 'Placar', 'Resultado', 'Gols PS'];
    const rows = filteredMatches.map((m) => {
      const matchDate = m.match_date || (m as any).date;
      const isCompleted = m.status === 'REALIZADO' || m.status === 'FINALIZADO';
      const psScore = m.score_ps ?? 0;
      const oppScore = m.score_opponent ?? 0;
      const resStr = isCompleted
        ? psScore > oppScore
          ? 'Vitória'
          : psScore === oppScore
          ? 'Empate'
          : 'Derrota'
        : m.status || 'Agendado';

      const matchGoalsStr = (matchGoals || [])
        .filter((g) => g.match_id === m.id)
        .map((g) => `${g.athlete_name || 'Atleta'} (${g.goals_count})`)
        .join(', ');

      return [
        matchDate ? formatDateBR(matchDate) : '-',
        m.competition_name || 'Amistoso',
        `${m.class_name || 'Geral'} (${m.category || 'Sub-11'})`,
        m.opponent,
        isCompleted ? `${psScore} x ${oppScore}` : 'A Disputar',
        resStr,
        matchGoalsStr || '-',
      ];
    });

    exportReportToPDF({
      title: 'Relatório Gerencial de Jogos & Competições',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
        { label: 'Status', value: statusFilter },
        { label: 'Resultado', value: resultFilter },
      ],
      summaryMetrics: [
        { label: 'Partidas', value: `${totalMatches}` },
        { label: 'Vitórias', value: `${wins} (${winRate.toFixed(0)}%)` },
        { label: 'Gols Pró', value: `${goalsScored}` },
        { label: 'Gols Contra', value: `${goalsConceded}` },
        { label: 'Saldo', value: `${goalDifference >= 0 ? `+${goalDifference}` : goalDifference}` },
      ],
      columns,
      rows,
      filename: `relatorio-jogos-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Partida',
      'Data',
      'Horário',
      'Competição',
      'Turma',
      'Categoria',
      'Adversário',
      'Gols PS',
      'Gols Adversário',
      'Resultado',
      'Status',
      'Local',
    ];

    const rows = filteredMatches.map((m) => {
      const matchDate = m.match_date || (m as any).date;
      const isCompleted = m.status === 'REALIZADO' || m.status === 'FINALIZADO';
      const psScore = m.score_ps ?? 0;
      const oppScore = m.score_opponent ?? 0;
      const resStr = isCompleted
        ? psScore > oppScore
          ? 'Vitória'
          : psScore === oppScore
          ? 'Empate'
          : 'Derrota'
        : 'A Disputar';

      return [
        m.id,
        matchDate ? formatDateBR(matchDate) : '',
        m.match_time || (m as any).time || '',
        m.competition_name || 'Amistoso',
        m.class_name || '',
        m.category || '',
        m.opponent,
        isCompleted ? psScore : '',
        isCompleted ? oppScore : '',
        resStr,
        m.status,
        m.location || 'Centauro',
      ];
    });

    exportReportToCSV(
      `relatorio-jogos-${dateRange.startDate}-${dateRange.endDate}`,
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
            <Trophy size={18} className="text-amber-500" />
            <span>Métricas e Histórico de Competições</span>
          </h3>
          <p className="text-xs text-slate-500">
            Aproveitamento, saldo de gols, artilharia e confrontos realizados no período.
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Matches */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Jogos no Período
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalMatches}</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {completedMatches.length} realizados
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {scheduledMatches.length} partidas agendadas
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Aproveitamento / Vitórias
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">
              {winRate.toFixed(0)}%
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {wins} V • {draws} E • {losses} D
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(100, winRate)}%` }}
            />
          </div>
        </div>

        {/* Goals Scored */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Gols Marcados (GP)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-700">⚽ {goalsScored}</span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {completedMatches.length > 0 ? (goalsScored / completedMatches.length).toFixed(1) : 0} por jogo
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Gols sofridos: {goalsConceded} (Saldo: {goalDifference >= 0 ? `+${goalDifference}` : goalDifference})
          </p>
        </div>

        {/* Saldo de Gols */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Saldo de Gols
          </span>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                goalDifference > 0
                  ? 'text-emerald-700'
                  : goalDifference === 0
                  ? 'text-slate-700'
                  : 'text-rose-700'
              }`}
            >
              {goalDifference >= 0 ? `+${goalDifference}` : goalDifference}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                goalDifference >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {goalDifference >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Diferença de rendimento ofensivo</p>
        </div>
      </div>

      {/* Top Scorers Spotlight */}
      {topScorers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={16} className="text-amber-500" />
              <span>Artilharia no Período</span>
            </h4>
            <span className="text-[11px] text-slate-400">Gols oficiais registrados</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {topScorers.map((scorer, idx) => (
              <div
                key={scorer.athlete_name + idx}
                className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 text-center relative overflow-hidden"
              >
                <div className="text-[10px] font-bold uppercase text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded inline-block mb-1">
                  #{idx + 1}
                </div>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {scorer.athlete_name}
                </span>
                <span className="text-lg font-black text-amber-700 block mt-0.5">
                  ⚽ {scorer.count} {scorer.count === 1 ? 'gol' : 'gols'}
                </span>
                {scorer.category && (
                  <span className="text-[10px] text-slate-400 block">{scorer.category}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar adversário ou competição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="REALIZADO">Partidas Realizadas</option>
              <option value="AGENDADO">Partidas Agendadas</option>
              <option value="CANCELADO">Canceladas</option>
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todos os Resultados</option>
              <option value="VITORIA">Vitórias</option>
              <option value="EMPATE">Empates</option>
              <option value="DERROTA">Derrotas</option>
            </select>
          </div>
        </div>

        {/* Matches Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Data & Hora</th>
                <th className="py-2.5 px-3">Competição</th>
                <th className="py-2.5 px-3">Turma / Categoria</th>
                <th className="py-2.5 px-3">Confronto</th>
                <th className="py-2.5 px-3 text-center">Placar</th>
                <th className="py-2.5 px-3 text-center">Resultado</th>
                <th className="py-2.5 px-3">Local</th>
                <th className="py-2.5 px-3">Artilheiros do Jogo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhuma partida encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredMatches.map((m) => {
                  const matchDate = m.match_date || (m as any).date;
                  const matchTime = m.match_time || (m as any).time;
                  const isCompleted = m.status === 'REALIZADO' || m.status === 'FINALIZADO';
                  const psScore = m.score_ps ?? 0;
                  const oppScore = m.score_opponent ?? 0;
                  const isWin = isCompleted && psScore > oppScore;
                  const isDraw = isCompleted && psScore === oppScore;
                  const isLoss = isCompleted && psScore < oppScore;

                  const goalsInThisMatch = (matchGoals || []).filter((g) => g.match_id === m.id);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">
                          {matchDate ? formatDateBR(matchDate) : '-'}
                        </span>
                        {matchTime && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {matchTime}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {m.competition_name || 'Amistoso Preparatório'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-blue-700 block">
                          {m.category || 'Sub-11'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {m.class_name || 'Turma Oficial'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">
                          <span className="font-bold text-slate-900">Centauro</span> vs{' '}
                          <span className="font-semibold text-slate-700">{m.opponent}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isCompleted ? (
                          <span className="font-black text-sm text-slate-900">
                            {psScore} x {oppScore}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">A disputar</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isCompleted ? (
                          <Badge
                            variant={isWin ? 'success' : isDraw ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            {m.status || 'Agendado'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {m.location || 'Centauro'}
                      </td>
                      <td className="py-2.5 px-3">
                        {goalsInThisMatch.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {goalsInThisMatch.map((g, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                              >
                                ⚽ {g.athlete_name || 'Atleta'} ({g.goals_count})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
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
