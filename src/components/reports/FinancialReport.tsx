import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  CreditCard,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import { MonthlyFee, ExtraRevenue, Athlete, SoccerClass, PaymentMethod } from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';
import { Badge } from '../common/Badge';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface FinancialReportProps {
  monthlyFees: MonthlyFee[];
  extraRevenues: ExtraRevenue[];
  athletes: Athlete[];
  classes: SoccerClass[];
  dateRange: DateRange;
  selectedClassId: string;
  onClassChange?: (classId: string) => void;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  monthlyFees = [],
  extraRevenues = [],
  athletes = [],
  classes = [],
  dateRange,
  selectedClassId,
  onClassChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAGO' | 'A_RECEBER' | 'EM_ATRASO'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MENSALIDADE' | 'EXTRA'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>(selectedClassId || 'ALL');

  useEffect(() => {
    setClassFilter(selectedClassId || 'ALL');
  }, [selectedClassId]);

  const handleClassFilterChange = (val: string) => {
    setClassFilter(val);
    if (onClassChange) {
      onClassChange(val);
    }
  };

  // Unified Transaction Item
  interface TxItem {
    id: string;
    athlete_name: string;
    description: string;
    type: 'Mensalidade' | 'Receita Extra';
    category?: string;
    competence?: string;
    due_date: string;
    payment_date?: string;
    payment_method?: PaymentMethod;
    amount: number;
    status: 'PAGO' | 'A_RECEBER' | 'EM_ATRASO';
    class_id?: string;
    class_name?: string;
  }

  const allTransactions = useMemo<TxItem[]>(() => {
    // 1. Map Monthly Fees
    const feeItems: TxItem[] = (monthlyFees || []).map((fee) => {
      const athlete = (athletes || []).find((a) => a.id === fee.athlete_id);
      const athleteClassId = athlete?.current_class_id || athlete?.class_id;
      const athleteClass = (classes || []).find((c) => c.id === athleteClassId);
      const isPaid = fee.status === 'PAGO';
      const isOverdue = fee.status === 'EM_ATRASO';
      const normalizedStatus: 'PAGO' | 'A_RECEBER' | 'EM_ATRASO' = isPaid
        ? 'PAGO'
        : isOverdue
        ? 'EM_ATRASO'
        : 'A_RECEBER';

      return {
        id: fee.id,
        athlete_name: athlete?.name || 'Atleta não identificado',
        description: `Mensalidade ${fee.reference_month || ''} ${fee.notes ? `(${fee.notes})` : ''}`.trim(),
        type: 'Mensalidade',
        competence: fee.reference_month || '',
        due_date: fee.due_date || '',
        payment_date: fee.payment_date,
        payment_method: fee.payment_method,
        amount: fee.final_amount ?? fee.original_amount ?? 0,
        status: normalizedStatus,
        class_id: athleteClassId,
        class_name: athleteClass?.name || athlete?.class_name,
      };
    });

    // 2. Map Extra Revenues
    const extraItems: TxItem[] = (extraRevenues || []).map((rev) => {
      const athlete = rev.athlete_id ? (athletes || []).find((a) => a.id === rev.athlete_id) : undefined;
      const athleteClassId = athlete?.current_class_id || athlete?.class_id;
      const athleteClass = (classes || []).find((c) => c.id === athleteClassId);
      const isPaid = rev.status === 'PAGO';
      const isOverdue = rev.status === 'EM_ATRASO';
      const normalizedStatus: 'PAGO' | 'A_RECEBER' | 'EM_ATRASO' = isPaid
        ? 'PAGO'
        : isOverdue
        ? 'EM_ATRASO'
        : 'A_RECEBER';

      return {
        id: rev.id,
        athlete_name: athlete?.name || 'Venda Avulsa / Geral',
        description: rev.description || 'Cobrança Extra',
        type: 'Receita Extra',
        category: rev.category,
        due_date: rev.due_date || rev.sale_date || rev.payment_date || '',
        payment_date: rev.payment_date,
        payment_method: rev.payment_method,
        amount: rev.amount || 0,
        status: normalizedStatus,
        class_id: athleteClassId,
        class_name: athleteClass?.name || athlete?.class_name,
      };
    });

    return [...feeItems, ...extraItems];
  }, [monthlyFees, extraRevenues, athletes, classes]);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // 1. Date Range (match against payment_date if paid, or due_date)
      const targetDate = tx.payment_date || tx.due_date;
      if (!isDateInRange(targetDate, dateRange.startDate, dateRange.endDate)) return false;

      // 2. Class filter
      if (classFilter !== 'ALL') {
        if (!tx.class_id || tx.class_id !== classFilter) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'A_RECEBER' && tx.status !== 'A_RECEBER') return false;
        if (statusFilter === 'PAGO' && tx.status !== 'PAGO') return false;
        if (statusFilter === 'EM_ATRASO' && tx.status !== 'EM_ATRASO') return false;
      }

      // 4. Type filter
      if (typeFilter === 'MENSALIDADE' && tx.type !== 'Mensalidade') return false;
      if (typeFilter === 'EXTRA' && tx.type !== 'Receita Extra') return false;

      // 5. Method filter
      if (methodFilter !== 'ALL' && tx.payment_method !== methodFilter) return false;

      // 6. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const athMatch = tx.athlete_name.toLowerCase().includes(q);
        const descMatch = tx.description.toLowerCase().includes(q);
        const classMatch = (tx.class_name || '').toLowerCase().includes(q);
        if (!athMatch && !descMatch && !classMatch) return false;
      }

      return true;
    });
  }, [allTransactions, dateRange, classFilter, statusFilter, typeFilter, methodFilter, searchTerm]);

  // Metrics
  const totalAmount = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalPaid = filteredTransactions
    .filter((t) => t.status === 'PAGO')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalPending = filteredTransactions
    .filter((t) => t.status === 'A_RECEBER')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalOverdue = filteredTransactions
    .filter((t) => t.status === 'EM_ATRASO')
    .reduce((acc, t) => acc + t.amount, 0);

  const defaultRate = totalAmount > 0 ? (totalOverdue / totalAmount) * 100 : 0;

  // Payment Method Breakdown
  const methodStats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredTransactions
      .filter((t) => t.status === 'PAGO' && t.payment_method)
      .forEach((t) => {
        const m = t.payment_method || 'OUTRO';
        const cur = map.get(m) || { count: 0, total: 0 };
        map.set(m, { count: cur.count + 1, total: cur.total + t.amount });
      });
    return Array.from(map.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
    }));
  }, [filteredTransactions]);

  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === classFilter);

    const columns = ['Vencimento', 'Atleta / Pagador', 'Turma', 'Descrição', 'Tipo', 'Valor', 'Status', 'Pagamento', 'Forma'];
    const rows = filteredTransactions.map((t) => [
      t.due_date ? formatDateBR(t.due_date) : '-',
      t.athlete_name,
      t.class_name || '-',
      t.description,
      t.type,
      formatCurrency(t.amount),
      t.status === 'PAGO' ? 'Pago' : t.status === 'EM_ATRASO' ? 'Em Atraso' : 'À Receber',
      t.payment_date ? formatDateBR(t.payment_date) : '-',
      t.payment_method || '-',
    ]);

    exportReportToPDF({
      title: 'Relatório Gerencial Financeiro & Cobranças',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
        { label: 'Status', value: statusFilter === 'A_RECEBER' ? 'À Receber' : statusFilter === 'PAGO' ? 'Pagos' : statusFilter === 'EM_ATRASO' ? 'Em Atraso' : 'Todos' },
        { label: 'Tipo', value: typeFilter },
      ],
      summaryMetrics: [
        { label: 'Total Pago', value: formatCurrency(totalPaid) },
        { label: 'À Receber', value: formatCurrency(totalPending) },
        { label: 'Em Atraso', value: formatCurrency(totalOverdue) },
        { label: 'Inadimplência', value: `${defaultRate.toFixed(1)}%` },
        { label: 'Total Faturado', value: formatCurrency(totalAmount) },
      ],
      columns,
      rows,
      filename: `relatorio-financeiro-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Lançamento',
      'Vencimento',
      'Atleta / Pagador',
      'Turma',
      'Descrição',
      'Tipo de Cobrança',
      'Valor (R$)',
      'Status',
      'Data de Pagamento',
      'Forma de Pagamento',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.due_date ? formatDateBR(t.due_date) : '',
      t.athlete_name,
      t.class_name || 'Geral',
      t.description,
      t.type,
      t.amount.toFixed(2),
      t.status === 'PAGO' ? 'Pago' : t.status === 'EM_ATRASO' ? 'Em Atraso' : 'À Receber',
      t.payment_date ? formatDateBR(t.payment_date) : '',
      t.payment_method || '',
    ]);

    exportReportToCSV(
      `relatorio-financeiro-${dateRange.startDate}-${dateRange.endDate}`,
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
            <DollarSign size={18} className="text-emerald-600" />
            <span>Demonstrativo Financeiro & Fluxo de Cobranças</span>
          </h3>
          <p className="text-xs text-slate-500">
            Mensalidades, receitas extras, recebimentos confirmados, previsões em aberto e inadimplência.
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
            Receita Efetivada (Paga)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalPaid)}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(0) : 0}% recebido
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {filteredTransactions.filter((t) => t.status === 'PAGO').length} lançamentos quitados
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            À Receber / Em Aberto
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-700">{formatCurrency(totalPending)}</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {filteredTransactions.filter((t) => t.status === 'A_RECEBER').length} cobranças
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Dentro do prazo de vencimento</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Em Atraso / Inadimplente
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700">{formatCurrency(totalOverdue)}</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              {defaultRate.toFixed(1)}% taxa
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {filteredTransactions.filter((t) => t.status === 'EM_ATRASO').length} cobranças vencidas
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Faturado no Período
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{formatCurrency(totalAmount)}</span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {filteredTransactions.length} títulos
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Mensalidades e receitas extras somadas</p>
        </div>
      </div>

      {/* Methods Breakdown */}
      {methodStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard size={15} className="text-emerald-600" />
            <span>Faturamento por Forma de Pagamento</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {methodStats.map((item) => (
              <div key={item.method} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <span className="text-[11px] font-bold text-slate-500 block">
                  {item.method === 'CARTAO_CREDITO'
                    ? 'Cartão de Crédito'
                    : item.method === 'CARTAO_DEBITO'
                    ? 'Cartão de Débito'
                    : item.method === 'DINHEIRO'
                    ? 'Dinheiro'
                    : item.method === 'BOLETO'
                    ? 'Boleto'
                    : item.method}
                </span>
                <span className="text-sm font-black text-slate-900 block mt-0.5">
                  {formatCurrency(item.total)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {item.count} pagamentos ({totalPaid > 0 ? ((item.total / totalPaid) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar lançamento ou atleta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de Seleção por Turma */}
            <select
              value={classFilter}
              onChange={(e) => handleClassFilterChange(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer max-w-[210px] text-slate-800"
              title="Filtrar lançamentos por turma"
            >
              <option value="ALL">Todas as Turmas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.category ? `(${cls.category})` : ''}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PAGO">Pagos</option>
              <option value="A_RECEBER">À Receber (Em Aberto)</option>
              <option value="EM_ATRASO">Em Atraso (Vencidos)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="MENSALIDADE">Apenas Mensalidades</option>
              <option value="EXTRA">Apenas Receitas Extras</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todas Formas Pgto</option>
              <option value="PIX">Pix</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_CREDITO">Cartão Crédito</option>
              <option value="CARTAO_DEBITO">Cartão Débito</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Atleta / Descrição</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Competência</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3">Data Pagamento</th>
                <th className="py-2.5 px-3">Forma Pgto</th>
                <th className="py-2.5 px-3 font-right text-right">Valor</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Nenhum lançamento financeiro corresponde aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{tx.athlete_name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                        {tx.class_name && (
                          <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10px]">
                            {tx.class_name}
                          </span>
                        )}
                        <span>{tx.description}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={tx.type === 'Mensalidade' ? 'primary' : 'warning'} size="sm">
                        {tx.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-semibold">{tx.competence || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDateBR(tx.due_date)}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {tx.payment_date ? formatDateBR(tx.payment_date) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold">
                      {tx.payment_method || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          tx.status === 'PAGO'
                            ? 'success'
                            : tx.status === 'EM_ATRASO'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {tx.status === 'PAGO'
                          ? 'PAGO'
                          : tx.status === 'EM_ATRASO'
                          ? 'EM ATRASO'
                          : 'À RECEBER'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
