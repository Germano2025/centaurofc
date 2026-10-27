import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  Layers,
  Search,
  Filter,
  Star,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  TechnicalEvaluation,
  SoccerClass,
  Athlete,
} from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatDateBR } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';

interface TechnicalEvaluationsReportProps {
  evaluations: TechnicalEvaluation[];
  classes: SoccerClass[];
  athletes: Athlete[];
  dateRange: DateRange;
  selectedClassId: string;
}

export const TechnicalEvaluationsReport: React.FC<TechnicalEvaluationsReportProps> = ({
  evaluations = [],
  classes = [],
  athletes = [],
  dateRange,
  selectedClassId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'DESTAQUE' | 'BOM' | 'ATENCAO'>('ALL');

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return (evaluations || []).filter((ev) => {
      // 1. Class filter
      if (selectedClassId !== 'ALL') {
        const ath = athletes.find((a) => a.id === ev.athlete_id);
        const classMatch =
          ev.class_id === selectedClassId ||
          ath?.current_class_id === selectedClassId ||
          ath?.class_id === selectedClassId;
        if (!classMatch) return false;
      }

      // 2. Date range
      if (!isDateInRange(ev.evaluation_date, dateRange.startDate, dateRange.endDate)) {
        return false;
      }

      // 3. Grade filter
      const grade = Number(ev.general_grade ?? 0);
      if (gradeFilter === 'DESTAQUE' && grade < 8.5) return false;
      if (gradeFilter === 'BOM' && (grade < 7.0 || grade >= 8.5)) return false;
      if (gradeFilter === 'ATENCAO' && grade >= 7.0) return false;

      // 4. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const ath = athletes.find((a) => a.id === ev.athlete_id);
        const athName = (ev.athlete_name || ath?.name || '').toLowerCase();
        const evalName = (ev.evaluator_name || '').toLowerCase();
        const classStr = (ev.class_name || ath?.class_name || '').toLowerCase();
        const catStr = (ev.category || ath?.category || '').toLowerCase();
        const positiveStr = (ev.positive_points || ev.strengths || '').toLowerCase();
        const improveStr = (ev.improvement_points || ev.improvements || '').toLowerCase();

        if (
          !athName.includes(q) &&
          !evalName.includes(q) &&
          !classStr.includes(q) &&
          !catStr.includes(q) &&
          !positiveStr.includes(q) &&
          !improveStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [evaluations, athletes, selectedClassId, dateRange, gradeFilter, searchTerm]);

  // Metrics
  const totalEvals = filteredEvaluations.length;
  const uniqueAthletesEvaluated = new Set(filteredEvaluations.map((e) => e.athlete_id)).size;

  const validGrades = filteredEvaluations
    .map((e) => Number(e.general_grade))
    .filter((g) => !isNaN(g) && g > 0);

  const avgGrade =
    validGrades.length > 0
      ? (validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length).toFixed(1)
      : '-';

  const highPerformers = filteredEvaluations.filter((e) => Number(e.general_grade || 0) >= 8.5).length;
  const midPerformers = filteredEvaluations.filter(
    (e) => Number(e.general_grade || 0) >= 7.0 && Number(e.general_grade || 0) < 8.5
  ).length;
  const needsAttention = filteredEvaluations.filter((e) => Number(e.general_grade || 0) < 7.0).length;

  // Export handlers
  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = ['Data', 'Atleta', 'Turma / Categoria', 'Avaliador', 'Nota', 'Pontos Fortes', 'A Desenvolver'];
    const rows = filteredEvaluations.map((ev) => {
      const ath = athletes.find((a) => a.id === ev.athlete_id);
      const athClass = classes.find((c) => c.id === (ev.class_id || ath?.current_class_id || ath?.class_id));

      return [
        ev.evaluation_date ? formatDateBR(ev.evaluation_date) : '-',
        ev.athlete_name || ath?.name || 'Atleta',
        `${ev.class_name || athClass?.name || 'Turma'} (${ev.category || ath?.category || 'Sub-11'})`,
        ev.evaluator_name || 'Comissão Técnica',
        ev.general_grade !== undefined && ev.general_grade !== null ? Number(ev.general_grade).toFixed(1) : '-',
        (ev.positive_points || ev.strengths || '-').slice(0, 45),
        (ev.improvement_points || ev.improvements || '-').slice(0, 45),
      ];
    });

    exportReportToPDF({
      title: 'Relatório Gerencial de Avaliações Técnicas',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
        { label: 'Faixa de Nota', value: gradeFilter },
      ],
      summaryMetrics: [
        { label: 'Total Avaliações', value: `${totalEvals}` },
        { label: 'Atletas Avaliados', value: `${uniqueAthletesEvaluated}` },
        { label: 'Média Geral', value: `${avgGrade}/10` },
        { label: 'Destaques (>=8.5)', value: `${highPerformers}` },
        { label: 'Apoio (<7.0)', value: `${needsAttention}` },
      ],
      columns,
      rows,
      filename: `relatorio-avaliacoes-tecnicas-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Avaliação',
      'Data',
      'Atleta',
      'Turma',
      'Categoria',
      'Avaliador',
      'Nota Geral',
      'Pontos Fortes',
      'Pontos a Desenvolver',
      'Observações',
    ];

    const rows = filteredEvaluations.map((ev) => {
      const ath = athletes.find((a) => a.id === ev.athlete_id);
      const athClass = classes.find((c) => c.id === (ev.class_id || ath?.current_class_id || ath?.class_id));

      return [
        ev.id,
        ev.evaluation_date ? formatDateBR(ev.evaluation_date) : '',
        ev.athlete_name || ath?.name || '',
        ev.class_name || athClass?.name || '',
        ev.category || ath?.category || '',
        ev.evaluator_name || '',
        ev.general_grade ?? '',
        ev.positive_points || ev.strengths || '',
        ev.improvement_points || ev.improvements || '',
        ev.observations || ev.notes || '',
      ];
    });

    exportReportToCSV(
      `relatorio-avaliacoes-tecnicas-${dateRange.startDate}-${dateRange.endDate}`,
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
            <Award size={18} className="text-purple-600" />
            <span>Métricas e Histórico de Avaliações Técnicas</span>
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhamento pedagógico, notas gerais, destaques e oportunidades de evolução.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Avaliações Realizadas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalEvals}</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {uniqueAthletesEvaluated} atletas
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Total de fichas preenchidas</p>
        </div>

        {/* Média Geral */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Média Geral das Notas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">{avgGrade}</span>
            <span className="text-xs font-bold text-slate-500">Escala de 0 a 10</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-purple-600 h-full rounded-full"
              style={{
                width: `${avgGrade !== '-' ? (Number(avgGrade) / 10) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Destaques */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Alto Desempenho (Nota ≥ 8.5)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{highPerformers}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {totalEvals > 0 ? ((highPerformers / totalEvals) * 100).toFixed(0) : 0}% do total
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Atletas em nível de destaque</p>
        </div>

        {/* Necessitam Apoio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Necessitam Atenção (&lt; 7.0)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{needsAttention}</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {midPerformers} regulares (7.0 - 8.4)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Foco em fundamentos básicos</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar atleta, professor ou nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todas as Faixas de Nota</option>
              <option value="DESTAQUE">Destaques (Nota ≥ 8.5)</option>
              <option value="BOM">Regulares (7.0 a 8.4)</option>
              <option value="ATENCAO">Necessitam Apoio (&lt; 7.0)</option>
            </select>
          </div>
        </div>

        {/* Evaluations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Atleta</th>
                <th className="py-2.5 px-3">Turma / Categoria</th>
                <th className="py-2.5 px-3">Avaliador</th>
                <th className="py-2.5 px-3 text-center">Nota Geral</th>
                <th className="py-2.5 px-3">Pontos Fortes</th>
                <th className="py-2.5 px-3">A Desenvolver</th>
                <th className="py-2.5 px-3">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhuma avaliação técnica encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev) => {
                  const ath = athletes.find((a) => a.id === ev.athlete_id);
                  const athClass = classes.find((c) => c.id === (ev.class_id || ath?.current_class_id || ath?.class_id));
                  const gradeNum = Number(ev.general_grade ?? 0);

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {ev.evaluation_date ? formatDateBR(ev.evaluation_date) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">
                          {ev.athlete_name || ath?.name || 'Atleta'}
                        </span>
                        {ath?.nickname && (
                          <span className="text-[10px] text-slate-400">({ath.nickname})</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-blue-700 block">
                          {ev.category || ath?.category || 'Sub-11'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {ev.class_name || athClass?.name || 'Sem turma'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {ev.evaluator_name || 'Comissão Técnica'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {ev.general_grade !== undefined && ev.general_grade !== null ? (
                          <Badge
                            variant={gradeNum >= 8.5 ? 'success' : gradeNum >= 7.0 ? 'primary' : 'warning'}
                            size="sm"
                          >
                            ⭐ {gradeNum.toFixed(1)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                        <p className="line-clamp-2 text-[11px]">
                          {ev.positive_points || ev.strengths || '-'}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                        <p className="line-clamp-2 text-[11px]">
                          {ev.improvement_points || ev.improvements || '-'}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs">
                        <p className="line-clamp-2 text-[11px]">
                          {ev.observations || ev.notes || '-'}
                        </p>
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
