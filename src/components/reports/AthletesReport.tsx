import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  CreditCard,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import { Athlete, SoccerClass, Responsible } from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatCurrency, formatDateBR, formatPhone } from '../../utils/formatters';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';
import { Badge } from '../common/Badge';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface AthletesReportProps {
  athletes: Athlete[];
  classes: SoccerClass[];
  responsibles: Responsible[];
  dateRange: DateRange;
  selectedClassId: string;
}

export const AthletesReport: React.FC<AthletesReportProps> = ({
  athletes = [],
  classes = [],
  responsibles = [],
  dateRange,
  selectedClassId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO' | 'DESLIGADO'>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');

  // Filtered Athletes
  const filteredAthletes = useMemo(() => {
    return (athletes || []).filter((a) => {
      // 1. Class filter
      if (selectedClassId !== 'ALL') {
        const classMatch = a.current_class_id === selectedClassId || a.class_id === selectedClassId;
        if (!classMatch) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

      // 3. Condition filter
      if (conditionFilter !== 'ALL') {
        if (conditionFilter === 'BOLSISTAS') {
          if (a.financial_condition !== 'BOLSA_INTEGRAL' && a.financial_condition !== 'BOLSA_PARCIAL') {
            return false;
          }
        } else if (a.financial_condition !== conditionFilter) {
          return false;
        }
      }

      // 4. Date range filter (enrollment date)
      if (a.enrollment_date) {
        const inRange = isDateInRange(a.enrollment_date, dateRange.startDate, dateRange.endDate);
        if (!inRange) return false;
      }

      // 5. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = a.name.toLowerCase().includes(q);
        const respMatch = (a.responsible_name || '').toLowerCase().includes(q);
        const catMatch = (a.category || '').toLowerCase().includes(q);
        if (!nameMatch && !respMatch && !catMatch) return false;
      }

      return true;
    });
  }, [athletes, selectedClassId, statusFilter, conditionFilter, dateRange, searchTerm]);

  // Metrics
  const total = filteredAthletes.length;
  const activeCount = filteredAthletes.filter((a) => a.status === 'ATIVO').length;
  const scholarshipIntegral = filteredAthletes.filter((a) => a.financial_condition === 'BOLSA_INTEGRAL').length;
  const scholarshipPartial = filteredAthletes.filter((a) => a.financial_condition === 'BOLSA_PARCIAL').length;
  const payingCount = filteredAthletes.filter(
    (a) => a.financial_condition === 'PAGANTE_SEM_DESCONTO' || a.financial_condition === 'PAGANTE_COM_DESCONTO'
  ).length;
  const inactiveOrLeft = filteredAthletes.filter((a) => a.status === 'INATIVO' || a.status === 'DESLIGADO').length;

  // Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredAthletes.forEach((a) => {
      const cat = a.category || 'Não definida';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAthletes]);

  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = ['Atleta', 'Turma / Categoria', 'Condição', 'Responsável', 'Telefone', 'Matrícula', 'Status'];
    const rows = filteredAthletes.map((a) => {
      const athClass = classes.find((c) => c.id === (a.current_class_id || a.class_id));
      const condStr =
        a.financial_condition === 'BOLSA_INTEGRAL'
          ? 'Bolsa 100%'
          : a.financial_condition === 'BOLSA_PARCIAL'
          ? 'Bolsa Parcial'
          : a.financial_condition === 'PAGANTE_COM_DESCONTO'
          ? 'Pagante c/ Desconto'
          : 'Pagante Integral';

      return [
        a.name + (a.nickname ? ` (${a.nickname})` : ''),
        `${athClass?.name || a.class_name || 'Sem turma'} (${a.category || athClass?.category || 'Sub-11'})`,
        condStr,
        a.responsible_name || '-',
        formatPhone(a.responsible_phone || a.phone || ''),
        a.enrollment_date ? formatDateBR(a.enrollment_date) : '-',
        a.status || 'ATIVO',
      ];
    });

    exportReportToPDF({
      title: 'Relatório Gerencial de Atletas & Matrículas',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
        { label: 'Status', value: statusFilter },
        { label: 'Condição', value: conditionFilter },
      ],
      summaryMetrics: [
        { label: 'Total', value: `${total}` },
        { label: 'Ativos', value: `${activeCount}` },
        { label: 'Pagantes', value: `${payingCount}` },
        { label: 'Bolsistas', value: `${scholarshipIntegral + scholarshipPartial}` },
        { label: 'Inativos/Evasão', value: `${inactiveOrLeft}` },
      ],
      columns,
      rows,
      filename: `relatorio-atletas-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Atleta',
      'Nome Completo',
      'Apelido',
      'Turma',
      'Categoria',
      'Condição Financeira',
      'Status',
      'Nome do Responsável',
      'Telefone Responsável',
      'Data de Matrícula',
    ];

    const rows = filteredAthletes.map((a) => {
      const athClass = classes.find((c) => c.id === (a.current_class_id || a.class_id));
      return [
        a.id,
        a.name,
        a.nickname || '',
        athClass?.name || a.class_name || '',
        a.category || athClass?.category || '',
        a.financial_condition || 'PAGANTE_SEM_DESCONTO',
        a.status || 'ATIVO',
        a.responsible_name || '',
        a.responsible_phone || a.phone || '',
        a.enrollment_date ? formatDateBR(a.enrollment_date) : '',
      ];
    });

    exportReportToCSV(
      `relatorio-atletas-${dateRange.startDate}-${dateRange.endDate}`,
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
            <Users size={18} className="text-blue-600" />
            <span>Métricas e Base de Atletas Cadastrados</span>
          </h3>
          <p className="text-xs text-slate-500">
            Distribuição por categorias, perfil de bolsistas/pagantes, responsáveis e status de matrícula.
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
            Total no Período
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{total}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {activeCount} ativos ({total > 0 ? ((activeCount / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Alunos cadastrados/filtrados</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Alunos Pagantes
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-700">{payingCount}</span>
            <span className="text-xs font-bold text-slate-500">
              {total > 0 ? ((payingCount / total) * 100).toFixed(0) : 0}% da base
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Mensalidade integral ou desconto</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Bolsas Esportivas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">
              {scholarshipIntegral + scholarshipPartial}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              {scholarshipIntegral} integrais (100%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{scholarshipPartial} bolsas parciais</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Inativos & Desligados
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700">{inactiveOrLeft}</span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              {total > 0 ? ((inactiveOrLeft / total) * 100).toFixed(1) : 0}% evasão
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Histórico mantido no banco</p>
        </div>
      </div>

      {/* Distribution by Category */}
      {categoryStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={15} className="text-blue-600" />
            <span>Distribuição de Alunos por Categoria</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoryStats.map((item) => (
              <div key={item.category} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                <span className="text-[11px] font-bold text-slate-600 block">{item.category}</span>
                <span className="text-lg font-black text-slate-900">{item.count}</span>
                <span className="text-[10px] text-slate-400 block">
                  {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
                </span>
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
              placeholder="Buscar atleta ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todas as Condições</option>
              <option value="PAGANTE_SEM_DESCONTO">Pagante Integral</option>
              <option value="PAGANTE_COM_DESCONTO">Pagante com Desconto</option>
              <option value="BOLSA_INTEGRAL">Bolsa Integral (100%)</option>
              <option value="BOLSA_PARCIAL">Bolsa Parcial</option>
              <option value="BOLSISTAS">Todos os Bolsistas</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
              <option value="DESLIGADO">Desligados</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Atleta</th>
                <th className="py-2.5 px-3">Categoria / Turma</th>
                <th className="py-2.5 px-3">Condição Financeira</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Matrícula</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhum atleta corresponde aos filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAthletes.map((a) => {
                  const athClass = classes.find((c) => c.id === (a.current_class_id || a.class_id));
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{a.name}</span>
                        {a.nickname && <span className="text-[10px] text-slate-400">({a.nickname})</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-blue-700 block">{a.category || athClass?.category || 'Sub-11'}</span>
                        <span className="text-[11px] text-slate-500">{athClass?.name || a.class_name || 'Sem turma'}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            a.financial_condition === 'BOLSA_INTEGRAL'
                              ? 'warning'
                              : a.financial_condition === 'BOLSA_PARCIAL'
                              ? 'info'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {a.financial_condition === 'BOLSA_INTEGRAL'
                            ? 'Bolsa 100%'
                            : a.financial_condition === 'BOLSA_PARCIAL'
                            ? 'Bolsa Parcial'
                            : 'Pagante'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {a.responsible_name || 'Não informado'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {formatPhone(a.responsible_phone || a.phone || '')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {a.enrollment_date ? formatDateBR(a.enrollment_date) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            a.status === 'ATIVO' ? 'success' : a.status === 'INATIVO' ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {a.status}
                        </Badge>
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
