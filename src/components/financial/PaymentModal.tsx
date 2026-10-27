import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { PaymentMethod, ExtraRevenueCategory } from '../../types';
import { formatCurrency, formatDateBR } from '../../utils/formatters';
import {
  DollarSign,
  CheckCircle,
  User,
  Calendar,
  CreditCard,
  Tag,
  FileText,
  Info,
  Search,
  X,
  Check,
  Plus,
  ListFilter,
  Edit3,
} from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentModalPrefill,
    athletes = [],
    classes = [],
    monthlyFees = [],
    registerMonthlyFeePayment,
    createMonthlyFee,
    createExtraRevenue,
    addAthlete,
    showToast,
  } = useApp();

  // If opened with a specific feeId (e.g. from AthleteDetailPage), it acts as Dar Baixa for that fee
  const isDirectFeePayment = Boolean(paymentModalPrefill?.feeId);

  // When generating individual charges from "+ Nova Receita/Cobrança":
  // ONLY two operations: 'NEW_FEE' (Gerar Mensalidade) or 'EXTRA_REVENUE' (Gerar Outro Tipo de Cobrança)
  type GenerationType = 'NEW_FEE' | 'EXTRA_REVENUE';
  const [genType, setGenType] = useState<GenerationType>('NEW_FEE');

  // Athlete Input Mode: 'type' (Digitar Nome) or 'select' (Selecionar da Lista)
  type AthleteInputMode = 'type' | 'select';
  const [athleteInputMode, setAthleteInputMode] = useState<AthleteInputMode>('type');
  const [athleteSearchText, setAthleteSearchText] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Common fields
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [amount, setAmount] = useState('150.00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Fee specific
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`;
  });

  // Extra Revenue specific
  const [extraCategory, setExtraCategory] = useState<ExtraRevenueCategory>('UNIFORME');
  const [extraDescription, setExtraDescription] = useState('Uniforme Oficial Centauro');

  // Direct Fee Payment (Dar Baixa) specific
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Helper to auto-calculate athlete's fee when athlete changes
  const applyAthleteFeeDefaults = (athId: string, refMonthStr: string) => {
    const athlete = athletes.find((a) => a.id === athId);
    if (!athlete) return;

    // Determine due date based on athlete's due_day
    const dueDayNum = athlete.due_day || 10;
    const [yearPart, monthPart] = refMonthStr.split('-');
    const safeDay = String(Math.min(Math.max(dueDayNum, 1), 28)).padStart(2, '0');
    setDueDate(`${yearPart}-${monthPart}-${safeDay}`);

    // Determine amount based on class and scholarship/discount
    const athleteClass = classes.find((c) => c.id === athlete.class_id);
    const basePrice = athleteClass?.monthly_fee ?? 150;

    let finalPrice = basePrice;
    if (athlete.financial_condition === 'BOLSA_INTEGRAL') {
      finalPrice = 0;
    } else if (athlete.financial_condition === 'BOLSA_PARCIAL') {
      if (athlete.discount_type === 'PERCENTUAL') {
        const pct = athlete.discount_value || 50;
        finalPrice = Math.max(0, basePrice - (basePrice * pct) / 100);
      } else {
        const fix = athlete.discount_value || 0;
        finalPrice = Math.max(0, basePrice - fix);
      }
    } else if (athlete.financial_condition === 'PAGANTE_COM_DESCONTO') {
      if (athlete.discount_type === 'PERCENTUAL') {
        const pct = athlete.discount_value || 0;
        finalPrice = Math.max(0, basePrice - (basePrice * pct) / 100);
      } else {
        const fix = athlete.discount_value || 0;
        finalPrice = Math.max(0, basePrice - fix);
      }
    }

    setAmount(finalPrice.toFixed(2));
  };

  // Filtered athletes based on typing query
  const filteredAthletes = useMemo(() => {
    const q = athleteSearchText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (!q) {
      return athletes.slice(0, 10);
    }

    return athletes
      .filter((a) => {
        const nameNorm = (a.name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const categoryNorm = (a.category || '').toLowerCase();
        const classNameNorm = (a.class_name || '').toLowerCase();
        const respNorm = (a.responsible_name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const idStr = (a.id || '').toLowerCase();

        return (
          nameNorm.includes(q) ||
          categoryNorm.includes(q) ||
          classNameNorm.includes(q) ||
          respNorm.includes(q) ||
          idStr.includes(q)
        );
      })
      .slice(0, 12);
  }, [athletes, athleteSearchText]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle prefill from openPaymentModal
  useEffect(() => {
    if (isPaymentModalOpen && paymentModalPrefill) {
      if (paymentModalPrefill.feeId) {
        const fee = monthlyFees.find((f) => f.id === paymentModalPrefill.feeId);
        if (fee) {
          const ath = athletes.find((a) => a.id === fee.athlete_id);
          setSelectedAthleteId(fee.athlete_id);
          setAthleteSearchText(ath?.name || '');
          setAmount(String(fee.final_amount ?? fee.original_amount ?? 150));
          setDueDate(fee.due_date || '');
          setReferenceMonth(fee.reference_month || '');
        }
      } else if (paymentModalPrefill.type === 'EXTRA') {
        setGenType('EXTRA_REVENUE');
        if (paymentModalPrefill.amount) setAmount(String(paymentModalPrefill.amount));
        if (paymentModalPrefill.description) setExtraDescription(paymentModalPrefill.description);
        if (paymentModalPrefill.athleteId) {
          const ath = athletes.find((a) => a.id === paymentModalPrefill.athleteId);
          setSelectedAthleteId(paymentModalPrefill.athleteId);
          setAthleteSearchText(ath?.name || '');
        } else {
          setSelectedAthleteId('');
          setAthleteSearchText('');
        }
      } else {
        setGenType('NEW_FEE');
        const targetAthId = paymentModalPrefill.athleteId || '';
        if (targetAthId) {
          const ath = athletes.find((a) => a.id === targetAthId);
          setSelectedAthleteId(targetAthId);
          setAthleteSearchText(ath?.name || '');
          applyAthleteFeeDefaults(targetAthId, referenceMonth);
        } else {
          setSelectedAthleteId('');
          setAthleteSearchText('');
        }
      }
    } else if (isPaymentModalOpen) {
      setGenType('NEW_FEE');
      setSelectedAthleteId('');
      setAthleteSearchText('');
      setIsSearchDropdownOpen(false);
    }
  }, [isPaymentModalOpen, paymentModalPrefill, monthlyFees, athletes]);

  if (!isPaymentModalOpen) return null;

  const handleClose = () => {
    setIsPaymentModalOpen(false);
    setNotes('');
    setAthleteSearchText('');
    setSelectedAthleteId('');
    setIsSearchDropdownOpen(false);
  };

  const handleAthleteChange = (athId: string) => {
    setSelectedAthleteId(athId);
    const ath = athletes.find((a) => a.id === athId);
    if (ath) {
      setAthleteSearchText(ath.name);
    } else {
      setAthleteSearchText('');
    }
    if (genType === 'NEW_FEE') {
      applyAthleteFeeDefaults(athId, referenceMonth);
    }
  };

  const handleReferenceMonthChange = (newMonth: string) => {
    setReferenceMonth(newMonth);
    if (selectedAthleteId) {
      applyAthleteFeeDefaults(selectedAthleteId, newMonth);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (numAmount < 0) {
      showToast('O valor informado não pode ser negativo.', 'error');
      return;
    }

    let targetAthleteId = selectedAthleteId;
    let athleteName = '';

    if (targetAthleteId) {
      const found = athletes.find((a) => a.id === targetAthleteId);
      athleteName = found?.name || 'Atleta';
    } else if (athleteSearchText.trim()) {
      // Find matching athlete by name (case- and accent-insensitive)
      const queryNorm = athleteSearchText
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

      const foundByName = athletes.find((a) => {
        const aNorm = (a.name || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        return aNorm === queryNorm;
      });

      if (foundByName) {
        targetAthleteId = foundByName.id;
        athleteName = foundByName.name;
        setSelectedAthleteId(foundByName.id);
      } else {
        // Fast-register typed athlete so relational integrity is preserved
        const created = addAthlete({
          name: athleteSearchText.trim(),
          status: 'ATIVO',
          financial_condition: 'PAGANTE_INTEGRAL',
        });
        targetAthleteId = created.athlete.id;
        athleteName = created.athlete.name;
        setSelectedAthleteId(created.athlete.id);
      }
    }

    if (!targetAthleteId) {
      showToast('Digite ou selecione obrigatoriamente um atleta para a cobrança.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isDirectFeePayment && paymentModalPrefill?.feeId) {
        // Direct fee payment confirmation (from external trigger)
        registerMonthlyFeePayment(paymentModalPrefill.feeId, paymentMethod, paymentDate, 0, notes.trim() || undefined);
        showToast(`Baixa confirmada com sucesso para ${athleteName}!`, 'success');
      } else if (genType === 'NEW_FEE') {
        // Generation of individual monthly fee -> ALWAYS created as PENDENTE (A_RECEBER)
        createMonthlyFee({
          athlete_id: targetAthleteId,
          reference_month: referenceMonth,
          original_amount: numAmount,
          discount_amount: 0,
          card_fee_amount: 0,
          final_amount: numAmount,
          due_date: dueDate,
          status: 'A_RECEBER', // Em aberto! Não baixado por aqui
          notes: notes.trim() || undefined,
        });
        showToast(
          `Cobrança de mensalidade (${referenceMonth}) gerada com sucesso para ${athleteName}! A baixa deve ser efetuada na lista financeira após o pagamento.`,
          'success'
        );
      } else if (genType === 'EXTRA_REVENUE') {
        // Generation of other charge -> created as PENDENTE (A_RECEBER)
        createExtraRevenue({
          athlete_id: targetAthleteId,
          category: extraCategory,
          description: extraDescription.trim() || 'Cobrança Avulsa',
          amount: numAmount,
          due_date: dueDate,
          sale_date: new Date().toISOString().substring(0, 10),
          status: 'A_RECEBER', // Em aberto! Não baixado por aqui
          payment_method: 'PIX',
          notes: notes.trim() || undefined,
        });
        showToast(
          `Cobrança de "${extraDescription.trim()}" gerada com sucesso para ${athleteName}! A baixa deve ser efetuada na lista financeira após o pagamento.`,
          'success'
        );
      }

      handleClose();
    } catch (err) {
      console.error('Error submitting charge/payment:', err);
      showToast('Erro ao processar lançamento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Fee Payment view (when opened with feeId)
  if (isDirectFeePayment) {
    const feeItem = monthlyFees.find((f) => f.id === paymentModalPrefill?.feeId);
    const athlete = athletes.find((a) => a.id === feeItem?.athlete_id);

    return (
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClose}
        title="Dar Baixa na Mensalidade"
        description="Confirme o recebimento e dê baixa na cobrança individual do atleta."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>{athlete?.name || 'Atleta'}</span>
              <span className="text-emerald-700 font-black text-sm">
                {formatCurrency(parseFloat(amount) || 0)}
              </span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Competência: <strong>{feeItem?.reference_month || referenceMonth}</strong> • Vencimento: <strong>{formatDateBR(dueDate)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <CreditCard size={14} className="text-blue-600" />
                <span>Forma de Pagamento *</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                <option value="PIX">Pix (Instantâneo)</option>
                <option value="DINHEIRO">Dinheiro em Espécie</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="BOLETO">Boleto Bancário</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-blue-600" />
                <span>Data do Pagamento *</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <DollarSign size={14} className="text-emerald-600" />
              <span>Valor Recebido (R$) *</span>
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs font-bold text-emerald-800 border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Recebimento</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pago via Pix na secretaria pelo responsável"
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle size={15} />}
            >
              Confirmar Baixa (Recebido)
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  // STANDARD MODAL: "+ Nova Receita / Cobrança"
  // Strictly for launching individual charges selecting the athlete (no baja here!)
  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const selectedAthleteClass = selectedAthlete
    ? classes.find((c) => c.id === selectedAthlete.class_id || c.id === selectedAthlete.current_class_id)
    : undefined;

  return (
    <Modal
      isOpen={isPaymentModalOpen}
      onClose={handleClose}
      title="Nova Receita / Cobrança Individual"
      description="Lançamento individual de cobrança digitando ou selecionando o atleta. (A baixa é efetuada diretamente na lista financeira após o pagamento)."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Notice Info Box */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <p className="font-bold">Lançamento de Cobrança Individual</p>
            <p className="text-[11px] text-blue-800">
              Este formulário serve para <strong>gerar</strong> uma nova cobrança ou receita para o atleta (status em aberto). Para <strong>baixar</strong> o pagamento recebido, utilize o botão <strong>"Dar Baixa"</strong> localizado antes do botão editar na lista financeira.
            </p>
          </div>
        </div>

        {/* Operation Selector Tabs - ONLY TWO POSSIBILITIES */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setGenType('NEW_FEE');
              if (selectedAthleteId) {
                applyAthleteFeeDefaults(selectedAthleteId, referenceMonth);
              }
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              genType === 'NEW_FEE'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} className={genType === 'NEW_FEE' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Gerar Mensalidade</span>
          </button>
          <button
            type="button"
            onClick={() => setGenType('EXTRA_REVENUE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              genType === 'EXTRA_REVENUE'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag size={14} className={genType === 'EXTRA_REVENUE' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Gerar Outro Tipo de Cobrança</span>
          </button>
        </div>

        {/* Athlete Selection Mode Switcher: Digitar ou Selecionar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User size={14} className="text-blue-600" />
              <span>Atleta para a Cobrança *</span>
            </label>

            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAthleteInputMode('type');
                  setIsSearchDropdownOpen(false);
                }}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  athleteInputMode === 'type'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Search size={11} />
                <span>Digitar Nome</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAthleteInputMode('select');
                  setIsSearchDropdownOpen(false);
                }}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  athleteInputMode === 'select'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListFilter size={11} />
                <span>Selecionar da Lista</span>
              </button>
            </div>
          </div>

          {/* Mode: Digitar Nome (Search with Autocomplete) */}
          {athleteInputMode === 'type' ? (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={athleteSearchText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAthleteSearchText(val);
                    setIsSearchDropdownOpen(true);
                    if (!val.trim()) {
                      setSelectedAthleteId('');
                    } else {
                      const exact = athletes.find(
                        (a) => a.name.toLowerCase().trim() === val.toLowerCase().trim()
                      );
                      if (exact) {
                        setSelectedAthleteId(exact.id);
                        if (genType === 'NEW_FEE') applyAthleteFeeDefaults(exact.id, referenceMonth);
                      }
                    }
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  placeholder="Digite o nome do atleta (ex: José Américo, Lucas...)"
                  className="w-full text-xs font-semibold pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  autoComplete="off"
                />
                {athleteSearchText && (
                  <button
                    type="button"
                    onClick={() => {
                      setAthleteSearchText('');
                      setSelectedAthleteId('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="Limpar digitação"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {isSearchDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                  {filteredAthletes.length > 0 ? (
                    filteredAthletes.map((a) => {
                      const athleteClass = classes.find(
                        (c) => c.id === a.class_id || c.id === a.current_class_id
                      );
                      const isSelected = a.id === selectedAthleteId;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAthleteId(a.id);
                            setAthleteSearchText(a.name);
                            setIsSearchDropdownOpen(false);
                            if (genType === 'NEW_FEE') applyAthleteFeeDefaults(a.id, referenceMonth);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-blue-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50 font-bold' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{a.name}</span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              Turma: {athleteClass?.name || a.category || 'Sem turma'} • Status: {a.status}
                            </span>
                          </div>
                          {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        Nenhum atleta cadastrado com o termo "{athleteSearchText}".
                      </p>
                      {athleteSearchText.trim().length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchDropdownOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Confirmar nome digitado "{athleteSearchText.trim()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Mode: Selecionar da Lista (Classic Select) */
            <select
              value={selectedAthleteId}
              onChange={(e) => {
                const athId = e.target.value;
                handleAthleteChange(athId);
              }}
              className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="">-- Selecione o Atleta para a Cobrança --</option>
              {athletes.map((a) => {
                const athleteClass = classes.find(
                  (c) => c.id === a.class_id || c.id === a.current_class_id
                );
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} • {athleteClass?.name || a.category || 'Sem turma'} ({a.status})
                  </option>
                );
              })}
            </select>
          )}

          {/* Feedback Card of Selected or Typed Athlete */}
          {selectedAthlete ? (
            <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                <span className="truncate">
                  Atleta: <strong>{selectedAthlete.name}</strong>
                  {selectedAthleteClass && (
                    <span className="text-emerald-700 ml-1">
                      • Turma: <strong>{selectedAthleteClass.name}</strong>
                    </span>
                  )}
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold uppercase">
                    {selectedAthlete.status}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAthleteId('');
                  setAthleteSearchText('');
                  if (athleteInputMode === 'type') setIsSearchDropdownOpen(true);
                }}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0 cursor-pointer"
              >
                Trocar
              </button>
            </div>
          ) : athleteSearchText.trim() ? (
            <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between gap-2 text-xs text-blue-950">
              <div className="flex items-center gap-2 min-w-0">
                <User size={14} className="text-blue-600 shrink-0" />
                <span className="truncate">
                  Cobrança em nome de: <strong>{athleteSearchText.trim()}</strong>
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 font-bold">
                    Nome Digitado
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAthleteId('');
                  setAthleteSearchText('');
                }}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer"
              >
                Limpar
              </button>
            </div>
          ) : null}
        </div>

        {/* 1. GERAR MENSALIDADE FIELDS */}
        {genType === 'NEW_FEE' && (
          <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Mês de Referência (AAAA-MM) *</span>
                </label>
                <input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => handleReferenceMonthChange(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Data de Vencimento *</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-600" />
                <span>Valor da Mensalidade (R$) *</span>
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150,00"
                className="w-full text-xs font-bold text-emerald-800 border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Valor pré-calculado com base na turma e condições financeiras/bolsa do atleta.
              </span>
            </div>
          </div>
        )}

        {/* 2. GERAR OUTRO TIPO DE COBRANÇA FIELDS */}
        {genType === 'EXTRA_REVENUE' && (
          <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Tag size={13} className="text-blue-600" />
                  <span>Categoria da Cobrança *</span>
                </label>
                <select
                  value={extraCategory}
                  onChange={(e) => setExtraCategory(e.target.value as ExtraRevenueCategory)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  <option value="UNIFORME">Uniforme Completo</option>
                  <option value="CAMISA">Camisa de Treino / Avulsa</option>
                  <option value="CALCAO">Calção</option>
                  <option value="MEIAO">Meião</option>
                  <option value="BOLSA">Bolsa / Mochila</option>
                  <option value="COPO">Copo / Squeeze</option>
                  <option value="INSCRICAO_CAMPEONATO">Inscrição em Campeonato</option>
                  <option value="TAXA_ARBITRAGEM">Taxa de Arbitragem</option>
                  <option value="AVULSO">Diária / Taxa Avulsa</option>
                  <option value="OUTRO">Outra Cobrança</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Data de Vencimento *</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <FileText size={13} className="text-blue-600" />
                <span>Descrição da Cobrança *</span>
              </label>
              <input
                type="text"
                value={extraDescription}
                onChange={(e) => setExtraDescription(e.target.value)}
                placeholder="Ex: Kit Uniforme 2026 Tam 12"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-600" />
                <span>Valor a Cobrar (R$) *</span>
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120,00"
                className="w-full text-xs font-bold text-emerald-800 border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Observações do Lançamento (Opcional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Cobrança combinada com o responsável para pagamento até o dia 15"
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-[11px] text-slate-500">
            A cobrança será lançada com status <strong>À Receber</strong>.
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || (!selectedAthleteId && !athleteSearchText.trim())}
              isLoading={isSubmitting}
            >
              {genType === 'NEW_FEE' ? 'Gerar Mensalidade' : 'Gerar Cobrança Individual'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
