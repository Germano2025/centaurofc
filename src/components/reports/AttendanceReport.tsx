import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Calendar,
  Users,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';
import {
  TrainingSession,
  AttendanceRecord,
  AbsenceJustification,
  Athlete,
  SoccerClass,
} from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatDateBR } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';
import { FileSpreadsheet } from 'lucide-react';

interface AttendanceReportProps {
  trainingSessions: TrainingSession[];
  attendances: AttendanceRecord[];
  absenceJustifications: AbsenceJustification[];
  athletes: Athlete[];
  classes: SoccerClass[];
  dateRange: DateRange;
  selectedClassId: string;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  trainingSessions = [],
  attendances = [],
  absenceJustifications = [],
  athletes = [],
  classes = [],
  dateRange,
  selectedClassId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(false);

  // 1. Filter sessions in period
  const periodSessions = useMemo(() => {
    return (trainingSessions || []).filter((ts) => {
      if (selectedClassId !== 'ALL' && ts.class_id !== selectedClassId) return false;
      return isDateInRange(ts.training_date, dateRange.startDate, dateRange.endDate);
    });
  }, [trainingSessions, selectedClassId, dateRange]);

  const sessionIds = useMemo(() => new Set(periodSessions.map((s) => s.id)), [periodSessions]);

  // 2. Filter attendances in period
  const periodAttendances = useMemo(() => {
    return (attendances || []).filter((a) => sessionIds.has(a.training_id));
  }, [attendances, sessionIds]);

  // 3. Filter justifications in period
  const periodJustifications = useMemo(() => {
    return (absenceJustifications || []).filter((j) => {
      const athlete = athletes.find((a) => a.id === j.athlete_id);
      if (selectedClassId !== 'ALL') {
        const classMatch = athlete?.current_class_id === selectedClassId || athlete?.class_id === selectedClassId;
        if (!classMatch) return false;
      }
      return isDateInRange(j.date, dateRange.startDate, dateRange.endDate);
    });
  }, [absenceJustifications, athletes, selectedClassId, dateRange]);

  // Totals
  const totalSessions = periodSessions.length;
  const totalRecords = periodAttendances.length;
  const totalPresences = periodAttendances.filter((a) => a.present || a.status === 'PRESENTE').length;
  const totalAbsences = totalRecords - totalPresences;
  const overallAttendanceRate = totalRecords > 0 ? (totalPresences / totalRecords) * 100 : 0;

  // 4. Per-Athlete Attendance Analysis
  const athleteStats = useMemo(() => {
    // Map of attendances by athleteId
    const map = new Map<string, { presences: number; absences: number }>();
    periodAttendances.forEach((a) => {
      const cur = map.get(a.athlete_id) || { presences: 0, absences: 0 };
      const isPresent = a.present || a.status === 'PRESENTE';
      map.set(a.athlete_id, {
        presences: cur.presences + (isPresent ? 1 : 0),
        absences: cur.absences + (!isPresent ? 1 : 0),
      });
    });

    return (athletes || [])
      .filter((ath) => {
        if (selectedClassId !== 'ALL') {
          const matchClass = ath.current_class_id === selectedClassId || ath.class_id === selectedClassId;
          if (!matchClass) return false;
        }
        if (ath.status !== 'ATIVO') return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const nameMatch = ath.name.toLowerCase().includes(q);
          const catMatch = (ath.category || '').toLowerCase().includes(q);
          if (!nameMatch && !catMatch) return false;
        }
        return true;
      })
      .map((ath) => {
        const data = map.get(ath.id) || { presences: 0, absences: 0 };
        const total = data.presences + data.absences;
        const rate = total > 0 ? (data.presences / total) * 100 : 0;
        const athClass = classes.find((c) => c.id === (ath.current_class_id || ath.class_id));

        return {
          id: ath.id,
          name: ath.name,
          category: ath.category || athClass?.category || 'Sub-11',
          className: athClass?.name || ath.class_name || 'Turma Oficial',
          presences: data.presences,
          absences: data.absences,
          total,
          rate,
          isRisk: data.absences >= 3,
        };
      })
      .filter((item) => (onlyRisk ? item.isRisk : true))
      .sort((a, b) => b.absences - a.absences);
  }, [athletes, periodAttendances, classes, selectedClassId, searchTerm, onlyRisk]);

  const riskAthletesCount = athleteStats.filter((a) => a.isRisk).length;

  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = ['Atleta', 'Turma / Categoria', 'Presenças', 'Faltas', 'Total Treinos', 'Taxa Presença (%)', 'Situação'];
    const rows = athleteStats.map((item) => [
      item.athlete.name,
      `${item.className} (${item.category})`,
      item.presences,
      item.absences,
      item.total,
      `${item.rate.toFixed(0)}%`,
      item.isRisk ? 'Alerta de Evasão (3+ faltas)' : item.rate >= 80 ? 'Assíduo' : 'Regular',
    ]);

    exportReportToPDF({
      title: 'Relatório Gerencial de Frequência & Assiduidade',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
        { label: 'Apenas Risco', value: onlyRisk ? 'Sim' : 'Não' },
      ],
      summaryMetrics: [
        { label: 'Treinos', value: `${totalSessions}` },
        { label: 'Presenças', value: `${totalPresences}` },
        { label: 'Faltas', value: `${totalAbsences}` },
        { label: 'Taxa Geral', value: `${overallAttendanceRate.toFixed(1)}%` },
        { label: 'Alunos em Risco', value: `${riskAthletesCount}` },
      ],
      columns,
      rows,
      filename: `relatorio-frequencia-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Atleta',
      'Nome do Atleta',
      'Turma',
      'Categoria',
      'Presenças',
      'Faltas',
      'Total de Sessões',
      'Taxa de Assiduidade (%)',
      'Alerta de Risco',
    ];

    const rows = athleteStats.map((item) => [
      item.athlete.id,
      item.athlete.name,
      item.className,
      item.category,
      item.presences,
      item.absences,
      item.total,
      item.rate.toFixed(1),
      item.isRisk ? 'SIM' : 'NAO',
    ]);

    exportReportToCSV(
      `relatorio-frequencia-${dateRange.startDate}-${dateRange.endDate}`,
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
            <ClipboardCheck size={18} className="text-purple-600" />
            <span>Métricas de Assiduidade e Frequência aos Treinos</span>
          </h3>
          <p className="text-xs text-slate-500">
            Acompanhamento individual e por turma, detecção de desengajamento e prevenção de evasão.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Treinos Realizados
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalSessions}</span>
            <span className="text-xs font-bold text-slate-500">
              {totalRecords} chamadas registradas
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Sessões no período selecionado</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Presenças Confirmadas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{totalPresences}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {totalRecords > 0 ? ((totalPresences / totalRecords) * 100).toFixed(0) : 0}% em campo
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{totalAbsences} ausências registradas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Taxa Média de Assiduidade
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">
              {overallAttendanceRate.toFixed(1)}%
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              Meta: 85%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                overallAttendanceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, overallAttendanceRate)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Alunos em Alerta (3+ Faltas)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700">{riskAthletesCount}</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              Risco de Evasão
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {periodJustifications.length} faltas justificadas no período
          </p>
        </div>
      </div>

      {/* Main Table: Assiduidade por Aluno */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar atleta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyRisk(!onlyRisk)}
              className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                onlyRisk
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {onlyRisk ? 'Exibindo Apenas Alertas (3+ Faltas)' : 'Filtrar Alertas de Faltas'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Atleta</th>
                <th className="py-2.5 px-3">Categoria / Turma</th>
                <th className="py-2.5 px-3 text-center">Treinos Registrados</th>
                <th className="py-2.5 px-3 text-center">Presenças</th>
                <th className="py-2.5 px-3 text-center">Faltas</th>
                <th className="py-2.5 px-3">Taxa de Assiduidade</th>
                <th className="py-2.5 px-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {athleteStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhum aluno corresponde aos critérios aplicados.
                  </td>
                </tr>
              ) : (
                athleteStats.map((ath) => (
                  <tr key={ath.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{ath.name}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-blue-700 block">{ath.category}</span>
                      <span className="text-[11px] text-slate-500">{ath.className}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-600">
                      {ath.total}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {ath.presences}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">
                      {ath.absences}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ath.rate >= 80 ? 'bg-emerald-500' : ath.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, ath.rate)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-700">
                          {ath.total > 0 ? `${ath.rate.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          ath.isRisk ? 'danger' : ath.rate >= 80 ? 'success' : 'warning'
                        }
                        size="sm"
                      >
                        {ath.isRisk
                          ? 'Alerta de Evasão'
                          : ath.rate >= 80
                          ? 'Assíduo'
                          : 'Atenção Frequência'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Justifications Table */}
      {periodJustifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={15} className="text-blue-600" />
            <span>Faltas Justificadas no Período ({periodJustifications.length})</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Atleta</th>
                  <th className="py-2 px-3">Motivo / Categoria</th>
                  <th className="py-2 px-3">Observações do Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodJustifications.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{formatDateBR(j.date)}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{j.athlete_name}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="primary" size="sm">
                        {j.reason}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 italic">
                      {j.description || 'Nenhum detalhe adicional informado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
