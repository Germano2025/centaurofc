import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  Clock,
  Filter,
  Calendar,
  CheckCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Receipt,
  Tag,
  CreditCard,
  User,
  Layers,
  HelpCircle,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { formatCurrency, formatDateBR, normalizeSearchText } from '../../utils/formatters';
import { calculateAthleteFeeDetails } from '../../utils/financialUtils';
import { MonthlyFee, ExtraRevenue, PaymentMethod, FinancialStatus, ExtraRevenueCategory } from '../../types';

export interface FinancialTransactionItem {
  id: string;
  athlete_name?: string;
  description: string;
  type: 'Mensalidade' | 'Receita Extra';
  due_date: string;
  amount: number;
  status: 'PAGO' | 'A_RECEBER' | 'ATRASADO';
  rawType: 'FEE' | 'EXTRA';
  feeItem?: MonthlyFee;
  extraItem?: ExtraRevenue;
}

export const FinancialModule: React.FC = () => {
  const {
    monthlyFees = [],
    extraRevenues = [],
    athletes = [],
    openPaymentModal,
    generateMonthlyFeesForCompetence,
    registerMonthlyFeePayment,
    updateMonthlyFee,
    deleteMonthlyFee,
    updateExtraRevenue,
    deleteExtraRevenue,
    showToast,
  } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'PAGO' | 'A_RECEBER' | 'ATRASADO'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // ==================== BATCH GENERATION CONFIRMATION MODAL ====================
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMonth, setBatchMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Active athletes count
  const activeAthletes = useMemo(() => {
    return (athletes || []).filter((a) => a.status === 'ATIVO');
  }, [athletes]);

  // Existing fees for selected batch month
  const existingFeesInMonth = useMemo(() => {
    return (monthlyFees || []).filter((f) => f.reference_month === batchMonth);
  }, [monthlyFees, batchMonth]);

  // Estimated batch summary with individual athlete fees
  const estimatedBatchSummary = useMemo(() => {
    let count = 0;
    let totalEstimatedValue = 0;
    for (const athlete of activeAthletes) {
      const alreadyHas = (monthlyFees || []).some(
        (f) => f.athlete_id === athlete.id && f.reference_month === batchMonth
      );
      if (!alreadyHas) {
        count++;
        const details = calculateAthleteFeeDetails(athlete, 180);
        totalEstimatedValue += details.finalAmount;
      }
    }
    return {
      count,
      totalEstimatedValue,
    };
  }, [activeAthletes, monthlyFees, batchMonth]);

  const estimatedNewFees = estimatedBatchSummary.count;

  const handleConfirmBatchGeneration = () => {
    if (!batchMonth) {
      showToast('Selecione o mês de competência.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const res = generateMonthlyFeesForCompetence(batchMonth);
      showToast(
        `Cobranças geradas para ${batchMonth}: ${res.generatedCount} novas mensalidades geradas (${res.skippedCount} já existentes ou isentos).`,
        'success'
      );
      setIsBatchModalOpen(false);
    } catch (err: any) {
      showToast('Erro ao gerar mensalidades em lote.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ==================== EDIT ITEM MODAL STATE ====================
  const [itemToEdit, setItemToEdit] = useState<FinancialTransactionItem | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<FinancialStatus>('A_RECEBER');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('PIX');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRefMonth, setEditRefMonth] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editExtraCategory, setEditExtraCategory] = useState<ExtraRevenueCategory>('UNIFORME');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const handleOpenEdit = (tx: FinancialTransactionItem) => {
    setItemToEdit(tx);
    setEditAmount(String(tx.amount));
    setEditDueDate(tx.due_date || new Date().toISOString().split('T')[0]);
    setEditNotes(tx.feeItem?.notes || tx.extraItem?.notes || '');

    if (tx.rawType === 'FEE' && tx.feeItem) {
      setEditStatus(tx.feeItem.status);
      setEditRefMonth(tx.feeItem.reference_month || '');
      setEditPaymentMethod(tx.feeItem.payment_method || 'PIX');
      setEditPaymentDate(tx.feeItem.payment_date || new Date().toISOString().split('T')[0]);
    } else if (tx.rawType === 'EXTRA' && tx.extraItem) {
      setEditDescription(tx.extraItem.description || '');
      setEditExtraCategory(tx.extraItem.category || 'UNIFORME');
      setEditPaymentMethod(tx.extraItem.payment_method || 'PIX');
      setEditPaymentDate(tx.extraItem.payment_date || tx.extraItem.sale_date || new Date().toISOString().split('T')[0]);
      setEditStatus('PAGO');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    const parsedAmount = parseFloat(editAmount.replace(',', '.')) || 0;
    if (parsedAmount <= 0) {
      showToast('O valor deve ser maior que zero.', 'error');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      if (itemToEdit.rawType === 'FEE' && itemToEdit.feeItem) {
        updateMonthlyFee(itemToEdit.id, {
          reference_month: editRefMonth,
          due_date: editDueDate,
          final_amount: parsedAmount,
          original_amount: parsedAmount,
          status: editStatus,
          payment_method: editStatus === 'PAGO' ? editPaymentMethod : undefined,
          payment_date: editStatus === 'PAGO' ? (editPaymentDate || new Date().toISOString().split('T')[0]) : undefined,
          notes: editNotes.trim() || undefined,
        });
      } else if (itemToEdit.rawType === 'EXTRA' && itemToEdit.extraItem) {
        updateExtraRevenue(itemToEdit.id, {
          description: editDescription.trim() || itemToEdit.extraItem.description,
          category: editExtraCategory,
          amount: parsedAmount,
          payment_method: editPaymentMethod,
          payment_date: editPaymentDate || editDueDate,
          sale_date: editPaymentDate || editDueDate,
          notes: editNotes.trim() || undefined,
        });
      }

      setItemToEdit(null);
    } catch (err) {
      console.error('Error updating fee/revenue:', err);
      showToast('Erro ao atualizar cobrança.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ==================== DAR BAIXA MODAL STATE ====================
  const [itemToDarBaixa, setItemToDarBaixa] = useState<FinancialTransactionItem | null>(null);
  const [baixaMethod, setBaixaMethod] = useState<PaymentMethod>('PIX');
  const [baixaDate, setBaixaDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [baixaAmount, setBaixaAmount] = useState('');
  const [baixaNotes, setBaixaNotes] = useState('');
  const [isSubmittingBaixa, setIsSubmittingBaixa] = useState(false);

  const handleOpenDarBaixa = (tx: FinancialTransactionItem) => {
    setItemToDarBaixa(tx);
    setBaixaAmount(String(tx.amount || 0));
    setBaixaDate(new Date().toISOString().split('T')[0]);
    setBaixaMethod('PIX');
    setBaixaNotes('');
  };

  const handleConfirmDarBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDarBaixa) return;
    const numAmount = parseFloat(baixaAmount.replace(',', '.')) || 0;
    if (numAmount < 0) {
      showToast('O valor recebido não pode ser negativo.', 'error');
      return;
    }

    setIsSubmittingBaixa(true);
    try {
      if (itemToDarBaixa.rawType === 'FEE') {
        registerMonthlyFeePayment(
          itemToDarBaixa.id,
          baixaMethod,
          baixaDate,
          0,
          baixaNotes.trim() || undefined
        );
      } else {
        updateExtraRevenue(itemToDarBaixa.id, {
          status: 'PAGO',
          amount: numAmount,
          payment_method: baixaMethod,
          payment_date: baixaDate,
          notes: baixaNotes.trim() || undefined,
        });
        showToast(`Baixa confirmada com sucesso para ${itemToDarBaixa.athlete_name}!`, 'success');
      }
      setItemToDarBaixa(null);
    } catch (err) {
      console.error('Error confirming baixa:', err);
      showToast('Erro ao confirmar baixa do pagamento.', 'error');
    } finally {
      setIsSubmittingBaixa(false);
    }
  };

  // ==================== DELETE ITEM MODAL STATE ====================
  const [itemToDelete, setItemToDelete] = useState<FinancialTransactionItem | null>(null);

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.rawType === 'FEE') {
      deleteMonthlyFee(itemToDelete.id);
    } else {
      deleteExtraRevenue(itemToDelete.id);
    }

    setItemToDelete(null);
  };

  // ==================== TRANSACTIONS LIST ====================
  const transactions = useMemo<FinancialTransactionItem[]>(() => {
    const feeItems: FinancialTransactionItem[] = (monthlyFees || []).map((fee) => {
      const athlete = (athletes || []).find((a) => a.id === fee.athlete_id);
      const statusNormalized: 'PAGO' | 'A_RECEBER' | 'ATRASADO' =
        fee.status === 'PAGO' ? 'PAGO' : fee.status === 'EM_ATRASO' ? 'ATRASADO' : 'A_RECEBER';

      return {
        id: fee.id,
        athlete_name: athlete?.name || 'Atleta não identificado',
        description: `Mensalidade ${fee.reference_month || ''} ${fee.notes ? `(${fee.notes})` : ''}`.trim(),
        type: 'Mensalidade',
        due_date: fee.due_date || '',
        amount: fee.final_amount ?? fee.original_amount ?? 0,
        status: statusNormalized,
        rawType: 'FEE',
        feeItem: fee,
      };
    });

    const extraItems: FinancialTransactionItem[] = (extraRevenues || []).map((rev) => {
      const athlete = rev.athlete_id ? (athletes || []).find((a) => a.id === rev.athlete_id) : undefined;
      const todayStr = new Date().toISOString().substring(0, 10);
      const isPaid = rev.status === 'PAGO';
      const isOverdue = rev.status === 'EM_ATRASO' || (rev.due_date && rev.due_date < todayStr && !isPaid);
      const statusNormalized: 'PAGO' | 'A_RECEBER' | 'ATRASADO' = isPaid
        ? 'PAGO'
        : isOverdue
        ? 'ATRASADO'
        : 'A_RECEBER';

      return {
        id: rev.id,
        athlete_name: athlete?.name || 'Venda Avulsa / Geral',
        description: rev.description || 'Cobrança Extra',
        type: 'Cobrança / Receita',
        due_date: rev.due_date || rev.sale_date || rev.payment_date || rev.created_at?.substring(0, 10) || '',
        amount: rev.amount || 0,
        status: statusNormalized,
        rawType: 'EXTRA',
        extraItem: rev,
      };
    });

    return [...feeItems, ...extraItems].sort(
      (a, b) => new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime()
    );
  }, [monthlyFees, extraRevenues, athletes]);

  const totalReceived = useMemo(() => {
    return (transactions || [])
      .filter((t) => t.status === 'PAGO')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const totalPending = useMemo(() => {
    return (transactions || [])
      .filter((t) => t.status === 'A_RECEBER' || t.status === 'ATRASADO')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let list = transactions || [];
    if (filterType !== 'ALL') {
      list = list.filter((tx) => tx.status === filterType);
    }
    if (searchTerm.trim()) {
      const qNorm = normalizeSearchText(searchTerm);
      list = list.filter((tx) => {
        const matchAthlete = normalizeSearchText(tx.athlete_name).includes(qNorm);
        const matchDesc = normalizeSearchText(tx.description).includes(qNorm);
        const matchType = normalizeSearchText(tx.type).includes(qNorm);
        return matchAthlete || matchDesc || matchType;
      });
    }
    return list;
  }, [transactions, filterType, searchTerm]);

  const hasActiveFinancialFilters = Boolean(searchTerm.trim() || filterType !== 'ALL');

  const handleClearFinancialFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={26} />
            Financeiro & Mensalidades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Controle de cobranças, mensalidades dos atletas, bolsas e fluxo de caixa do CT Caxangá.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Calendar size={15} />}
            onClick={() => setIsBatchModalOpen(true)}
          >
            Gerar Mensalidades do Mês
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => openPaymentModal && openPaymentModal({})}
          >
            Nova Receita / Cobrança
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Total Recebido"
          value={formatCurrency(totalReceived)}
          icon={ArrowUpRight}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <StatCard
          title="À Receber"
          value={formatCurrency(totalPending)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
        />
        <StatCard
          title="Total de Lançamentos"
          value={(transactions || []).length}
          icon={DollarSign}
        />
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por atleta ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-full hover:bg-slate-100"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'PAGO', label: 'Pagos' },
                  { id: 'A_RECEBER', label: 'À Receber' },
                  { id: 'ATRASADO', label: 'Em Atraso' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {hasActiveFinancialFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearFinancialFilters}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                leftIcon={<RotateCcw size={13} />}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Filter results info */}
        {hasActiveFinancialFilters && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <span>
              Exibindo <strong>{filteredTransactions.length}</strong> de <strong>{(transactions || []).length}</strong> lançamentos
              {searchTerm && <span> para "{searchTerm}"</span>}
            </span>
            <button
              onClick={handleClearFinancialFilters}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Resetar filtros
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-3 px-3">Atleta / Descrição</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Vencimento</th>
                <th className="py-3 px-3">Valor</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Search size={24} className="text-slate-300 mb-1" />
                      <p className="font-semibold text-slate-600 text-xs">Nenhum lançamento encontrado</p>
                      <p className="text-[11px] text-slate-400">
                        {hasActiveFinancialFilters
                          ? 'Nenhum lançamento corresponde à busca e filtros aplicados.'
                          : 'Nenhum lançamento financeiro registrado.'}
                      </p>
                      {hasActiveFinancialFilters && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={handleClearFinancialFilters}
                          leftIcon={<RotateCcw size={12} />}
                          className="mt-1.5"
                        >
                          Limpar Filtros
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{tx.athlete_name || tx.description}</p>
                      {tx.athlete_name && <p className="text-[11px] text-slate-500">{tx.description}</p>}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600">{tx.type}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDateBR(tx.due_date)}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{formatCurrency(tx.amount)}</td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          tx.status === 'PAGO'
                            ? 'success'
                            : tx.status === 'ATRASADO'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {tx.status === 'PAGO'
                          ? 'PAGO'
                          : tx.status === 'ATRASADO'
                          ? 'EM ATRASO'
                          : 'À RECEBER'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão de Dar Baixa na cobrança antes do botão Editar */}
                        {tx.status !== 'PAGO' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 text-xs py-1 px-2.5 font-bold transition-all shadow-2xs"
                            leftIcon={<CheckCircle size={14} />}
                            onClick={() => handleOpenDarBaixa(tx)}
                          >
                            Dar Baixa
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tx)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100/70 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                          title="Editar lançamento financeiro"
                        >
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(tx)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-100/60 border border-rose-200 transition-colors cursor-pointer"
                          title="Excluir cobrança individual"
                        >
                          <Trash2 size={13} />
                          <span>Apagar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 1. MODAL DE CONFIRMAÇÃO: GERAÇÃO EM LOTE DE MENSALIDADES */}
      {/* ================================================================ */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => !isGenerating && setIsBatchModalOpen(false)}
        title="Gerar Mensalidades do Mês em Lote"
        description="Confirmação e parametrização para geração de cobranças automáticas."
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={17} />
            <div>
              <p className="font-bold">Confirmação de Geração Automática</p>
              <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                Antes de gerar automaticamente, confirme a competência e os parâmetros abaixo. O sistema criará as cobranças com os vencimentos e descontos cadastrados de cada atleta ativo.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-600" />
              <span>Competência de Cobrança (Mês / Ano) *</span>
            </label>
            <input
              type="month"
              value={batchMonth}
              onChange={(e) => setBatchMonth(e.target.value)}
              className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              required
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-slate-600" />
                <span>Resumo da Execução</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-extrabold bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                Total Estimado: {formatCurrency(estimatedBatchSummary.totalEstimatedValue)}
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Atletas Ativos</span>
                <span className="text-base font-black text-slate-900">{activeAthletes.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Já Gerados</span>
                <span className="text-base font-black text-blue-700">{existingFeesInMonth.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">A Gerar Agora</span>
                <span className="text-base font-black text-emerald-700">{estimatedNewFees}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor a Cobrar</span>
                <span className="text-sm font-black text-emerald-800">{formatCurrency(estimatedBatchSummary.totalEstimatedValue)}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
            <p className="font-bold flex items-center gap-1.5 text-blue-900">
              <HelpCircle size={14} className="text-blue-600 shrink-0" />
              <span>Regras automáticas aplicadas na geração em lote:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-blue-900">
              <li>Cada mensalidade gerará o <strong>valor cadastrado na ficha de cada atleta</strong> (valor individual da mensalidade).</li>
              <li>Cada mensalidade adotará o <strong>dia de vencimento individual</strong> cadastrado do aluno (ex: 05, 10, 15, 20).</li>
              <li>Atletas com <strong>Bolsa Integral (100%)</strong> são gerados com status <strong>PAGO</strong> (isenção automática de valor 0).</li>
              <li>Descontos específicos cadastrados na ficha do atleta serão deduzidos do valor final.</li>
              <li>Alunos que já possuem mensalidade para a competência {batchMonth} <strong>não serão duplicados</strong>.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchModalOpen(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmBatchGeneration}
              isLoading={isGenerating}
              leftIcon={<Calendar size={14} />}
            >
              Confirmar Geração em Lote
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================ */}
      {/* 2. MODAL DE EDIÇÃO INDIVIDUAL DE COBRANÇA / MENSALIDADE */}
      {/* ================================================================ */}
      {itemToEdit && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingEdit && setItemToEdit(null)}
          title={`Editar ${itemToEdit.type}`}
          description={`Atualize os dados financeiros de ${itemToEdit.athlete_name || itemToEdit.description}`}
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">{itemToEdit.athlete_name || itemToEdit.description}</span>
              <Badge variant={itemToEdit.type === 'Mensalidade' ? 'primary' : 'gray'} size="sm">
                {itemToEdit.type}
              </Badge>
            </div>

            {/* Mensalidade specific fields */}
            {itemToEdit.rawType === 'FEE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Mês de Referência (AAAA-MM) *"
                  type="month"
                  required
                  value={editRefMonth}
                  onChange={(e) => setEditRefMonth(e.target.value)}
                />

                <Input
                  label="Data de Vencimento *"
                  type="date"
                  required
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            )}

            {/* Receita Extra specific fields */}
            {itemToEdit.rawType === 'EXTRA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Tag size={13} className="text-blue-600" />
                    <span>Categoria</span>
                  </label>
                  <select
                    value={editExtraCategory}
                    onChange={(e) => setEditExtraCategory(e.target.value as ExtraRevenueCategory)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="UNIFORME">Uniforme Completo</option>
                    <option value="CAMISA">Camisa Avulsa</option>
                    <option value="CALCAO">Calção</option>
                    <option value="MEIAO">Meião</option>
                    <option value="COPO">Copo / Squeeze</option>
                    <option value="BOLSA">Bolsa / Mochila</option>
                    <option value="INSCRICAO_CAMPEONATO">Inscrição em Campeonato</option>
                    <option value="TAXA_ARBITRAGEM">Taxa de Arbitragem</option>
                    <option value="AVULSO">Diária / Avulso</option>
                    <option value="OUTRO">Outra Receita</option>
                  </select>
                </div>

                <Input
                  label="Descrição *"
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            )}

            {/* Amount and Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <DollarSign size={13} className="text-emerald-600" />
                  <span>Valor (R$) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="150,00"
                  className="w-full text-xs font-bold text-emerald-800 border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {itemToEdit.rawType === 'FEE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Status da Cobrança *</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as FinancialStatus)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="A_RECEBER">À Receber</option>
                    <option value="PAGO">Pago (Liquidado)</option>
                    <option value="EM_ATRASO">Em Atraso (Vencido)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Payment Details when Paid */}
            {(editStatus === 'PAGO' || itemToEdit.rawType === 'EXTRA') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1">
                    <CreditCard size={13} className="text-emerald-600" />
                    <span>Forma de Pagamento</span>
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="PIX">Pix (Instantâneo)</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro em Espécie</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Data do Pagamento</label>
                  <input
                    type="date"
                    value={editPaymentDate}
                    onChange={(e) => setEditPaymentDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ex: Ajuste de valor autorizado pela diretoria"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToEdit(null)}
                disabled={isSubmittingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingEdit}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 3. MODAL DE EXCLUSÃO INDIVIDUAL DE COBRANÇA */}
      {/* ================================================================ */}
      {itemToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          title="Excluir Lançamento Financeiro"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold">Deseja realmente apagar esta cobrança?</p>
                <p className="text-rose-700 mt-1 leading-relaxed">
                  Esta ação removerá permanentemente o lançamento financeiro da base de dados e do histórico do aluno.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Lançamento:</span>
                <span className="font-bold text-slate-800">{itemToDelete.athlete_name || itemToDelete.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <span className="font-semibold text-slate-700">{itemToDelete.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vencimento / Data:</span>
                <span className="font-medium text-slate-700">{formatDateBR(itemToDelete.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor:</span>
                <span className="font-bold text-rose-700">{formatCurrency(itemToDelete.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status atual:</span>
                <span className="font-semibold text-slate-800">{itemToDelete.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                leftIcon={<Trash2 size={14} />}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 3. MODAL DE BAIXA DE COBRANÇA (LIQUIDAÇÃO FINANCEIRA) */}
      {/* ================================================================ */}
      {itemToDarBaixa && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingBaixa && setItemToDarBaixa(null)}
          title="Confirmar Baixa de Cobrança"
          description={`Registro de recebimento do atleta ${itemToDarBaixa.athlete_name || 'Atleta'}`}
          size="md"
        >
          <form onSubmit={handleConfirmDarBaixa} className="space-y-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-900 text-sm">{itemToDarBaixa.athlete_name}</span>
                <span className="text-emerald-700 font-black text-sm">{formatCurrency(itemToDarBaixa.amount)}</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Lançamento: <strong>{itemToDarBaixa.description}</strong> ({itemToDarBaixa.type})
                {itemToDarBaixa.due_date && <span> • Vencimento: <strong>{formatDateBR(itemToDarBaixa.due_date)}</strong></span>}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <CreditCard size={14} className="text-blue-600" />
                  <span>Forma de Pagamento *</span>
                </label>
                <select
                  value={baixaMethod}
                  onChange={(e) => setBaixaMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  <option value="PIX">Pix (Instantâneo)</option>
                  <option value="DINHEIRO">Dinheiro em Espécie</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="TRANSFERENCIA">Transferência / TED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar size={14} className="text-blue-600" />
                  <span>Data do Recebimento *</span>
                </label>
                <input
                  type="date"
                  value={baixaDate}
                  onChange={(e) => setBaixaDate(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <DollarSign size={14} className="text-emerald-600" />
                <span>Valor Efetivamente Recebido (R$) *</span>
              </label>
              <input
                type="text"
                value={baixaAmount}
                onChange={(e) => setBaixaAmount(e.target.value)}
                className="w-full text-xs font-bold text-emerald-800 border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Recebimento (Opcional)</label>
              <input
                type="text"
                value={baixaNotes}
                onChange={(e) => setBaixaNotes(e.target.value)}
                placeholder="Ex: Comprovante Pix anexado / pago pelo responsável na secretaria"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToDarBaixa(null)}
                disabled={isSubmittingBaixa}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingBaixa}
                isLoading={isSubmittingBaixa}
                leftIcon={<CheckCircle size={15} />}
              >
                Confirmar Baixa (Recebido)
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
