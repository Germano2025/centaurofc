import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Athlete, MonthlyFee, PaymentMethod, FinancialStatus, TechnicalEvaluation } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AthleteAvatar } from '../common/AthleteAvatar';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import {
  User,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  FileText,
  Clock,
  Edit2,
  Trash2,
  MessageCircle,
  Layers,
  Printer,
  ArrowRightLeft,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Download,
  UserMinus,
  Trophy,
  Target,
  Award,
  Star,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { formatDateBR, formatCurrency, formatCPF, formatPhone } from '../../utils/formatters';

interface AthleteDetailPageProps {
  athleteId: string;
  onBack: () => void;
  onEdit: (athlete: Athlete, initialTab?: 'bloco1' | 'bloco2' | 'bloco3' | 'bloco4' | 'bloco5') => void;
}

export const AthleteDetailPage: React.FC<AthleteDetailPageProps> = ({
  athleteId,
  onBack,
  onEdit,
}) => {
  const {
    athletes = [],
    classes = [],
    responsibles = [],
    documents = [],
    historyEvents = [],
    monthlyFees = [],
    evaluations = [],
    changeAthleteClass,
    deleteAthlete,
    cancelAthleteEnrollment,
    addHistoryEvent,
    openPaymentModal,
    deleteMonthlyFee,
    updateMonthlyFee,
    getAthleteMatchHistory,
    addEvaluation,
    updateEvaluation,
    deleteEvaluation,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'dados' | 'financeiro' | 'documentos' | 'historico' | 'jogos' | 'avaliacoes'>('dados');

  // Match stats & history for this athlete
  const matchStats = React.useMemo(() => {
    if (!getAthleteMatchHistory || !athleteId) {
      return { matchesRegistered: 0, participationsCount: 0, goalsCount: 0, history: [] };
    }
    return getAthleteMatchHistory(athleteId);
  }, [getAthleteMatchHistory, athleteId]);

  // Technical Evaluations for this athlete
  const athleteEvaluations = React.useMemo(() => {
    if (!athleteId) return [];
    return (evaluations || [])
      .filter((ev) => ev.athlete_id === athleteId && ev.active !== false)
      .sort(
        (a, b) =>
          new Date(b.evaluation_date || (b as any).date || 0).getTime() -
          new Date(a.evaluation_date || (a as any).date || 0).getTime()
      );
  }, [evaluations, athleteId]);

  const evalAverageGrade = React.useMemo(() => {
    const listWithGrades = athleteEvaluations.filter(
      (ev) => (ev.general_grade !== undefined && ev.general_grade !== null) || (ev as any).grade !== undefined
    );
    if (listWithGrades.length === 0) return null;
    const sum = listWithGrades.reduce(
      (acc, ev) => acc + (ev.general_grade !== undefined && ev.general_grade !== null ? Number(ev.general_grade) : Number((ev as any).grade || 0)),
      0
    );
    return (sum / listWithGrades.length).toFixed(1);
  }, [athleteEvaluations]);

  // Evaluation Form & Modal States
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalToEdit, setEvalToEdit] = useState<TechnicalEvaluation | null>(null);
  const [evalToDelete, setEvalToDelete] = useState<TechnicalEvaluation | null>(null);

  const [evalEvaluatorName, setEvalEvaluatorName] = useState('Prof. Gabriel');
  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [evalPositivePoints, setEvalPositivePoints] = useState('');
  const [evalImprovementPoints, setEvalImprovementPoints] = useState('');
  const [evalObservations, setEvalObservations] = useState('');
  const [evalGrade, setEvalGrade] = useState('8.5');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  const handleOpenNewEval = () => {
    setEvalToEdit(null);
    setEvalEvaluatorName('Prof. Gabriel');
    setEvalDate(new Date().toISOString().split('T')[0]);
    setEvalPositivePoints('');
    setEvalImprovementPoints('');
    setEvalObservations('');
    setEvalGrade('8.5');
    setIsEvalModalOpen(true);
  };

  const handleOpenEditEval = (ev: TechnicalEvaluation) => {
    setEvalToEdit(ev);
    setEvalEvaluatorName(ev.evaluator_name || 'Comissão Técnica');
    setEvalDate(ev.evaluation_date || (ev as any).date || new Date().toISOString().split('T')[0]);
    setEvalPositivePoints(ev.positive_points || (ev as any).strengths || '');
    setEvalImprovementPoints(ev.improvement_points || (ev as any).improvements || '');
    setEvalObservations(ev.observations || (ev as any).notes || '');
    setEvalGrade(
      ev.general_grade !== undefined && ev.general_grade !== null
        ? String(ev.general_grade)
        : (ev as any).grade !== undefined
        ? String((ev as any).grade)
        : ''
    );
    setIsEvalModalOpen(true);
  };

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete) return;
    setIsSubmittingEval(true);
    try {
      const parsedGrade =
        evalGrade.trim() !== '' ? parseFloat(evalGrade.replace(',', '.')) : undefined;

      if (evalToEdit) {
        updateEvaluation(evalToEdit.id, {
          evaluator_name: evalEvaluatorName.trim() || 'Comissão Técnica',
          evaluation_date: evalDate,
          positive_points: evalPositivePoints.trim(),
          improvement_points: evalImprovementPoints.trim(),
          observations: evalObservations.trim() || undefined,
          general_grade: parsedGrade,
          strengths: evalPositivePoints.trim(),
          improvements: evalImprovementPoints.trim(),
          notes: evalObservations.trim() || undefined,
        });
        showToast('Avaliação técnica atualizada com sucesso!', 'success');
      } else {
        addEvaluation({
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          evaluator_name: evalEvaluatorName.trim() || 'Comissão Técnica',
          evaluation_date: evalDate,
          class_id: athlete.current_class_id || athlete.class_id,
          class_name: athleteClass?.name || athlete.class_name || 'Geral',
          category: athlete.category || athleteClass?.category,
          positive_points: evalPositivePoints.trim(),
          improvement_points: evalImprovementPoints.trim(),
          observations: evalObservations.trim() || undefined,
          general_grade: parsedGrade,
          strengths: evalPositivePoints.trim(),
          improvements: evalImprovementPoints.trim(),
          notes: evalObservations.trim() || undefined,
        });
        showToast('Avaliação técnica registrada com sucesso!', 'success');
      }

      setIsEvalModalOpen(false);
      setEvalToEdit(null);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      showToast('Erro ao salvar avaliação técnica.', 'error');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const handleConfirmDeleteEval = () => {
    if (!evalToDelete) return;
    deleteEvaluation(evalToDelete.id);
    setEvalToDelete(null);
  };
  const [isChangingClass, setIsChangingClass] = useState(false);
  const [newClassId, setNewClassId] = useState('');
  const [changeClassReason, setChangeClassReason] = useState('');
  const [isCancelingClass, setIsCancelingClass] = useState(false);
  const [cancelMotive, setCancelMotive] = useState('Incompatibilidade de Horário / Rotina');
  const [cancelDetailNotes, setCancelDetailNotes] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fee Edit & Delete states
  const [feeToDelete, setFeeToDelete] = useState<MonthlyFee | null>(null);
  const [feeToEdit, setFeeToEdit] = useState<MonthlyFee | null>(null);
  const [editFeeAmount, setEditFeeAmount] = useState('');
  const [editFeeDueDate, setEditFeeDueDate] = useState('');
  const [editFeeRefMonth, setEditFeeRefMonth] = useState('');
  const [editFeeStatus, setEditFeeStatus] = useState<FinancialStatus>('A_RECEBER');
  const [editFeePaymentMethod, setEditFeePaymentMethod] = useState<PaymentMethod>('PIX');
  const [editFeePaymentDate, setEditFeePaymentDate] = useState('');
  const [editFeeNotes, setEditFeeNotes] = useState('');
  const [isSubmittingFeeEdit, setIsSubmittingFeeEdit] = useState(false);

  const handleOpenEditFee = (fee: MonthlyFee) => {
    setFeeToEdit(fee);
    setEditFeeAmount(String(fee.final_amount ?? fee.original_amount ?? 180));
    setEditFeeDueDate(fee.due_date || '');
    setEditFeeRefMonth(fee.reference_month || '');
    setEditFeeStatus(fee.status);
    setEditFeePaymentMethod(fee.payment_method || 'PIX');
    setEditFeePaymentDate(fee.payment_date || new Date().toISOString().split('T')[0]);
    setEditFeeNotes(fee.notes || '');
  };

  const handleSaveEditFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeToEdit) return;

    const parsedAmount = parseFloat(editFeeAmount.replace(',', '.')) || 0;
    if (parsedAmount <= 0) {
      showToast('O valor da mensalidade deve ser maior que zero.', 'error');
      return;
    }

    setIsSubmittingFeeEdit(true);
    try {
      updateMonthlyFee(feeToEdit.id, {
        reference_month: editFeeRefMonth,
        due_date: editFeeDueDate,
        final_amount: parsedAmount,
        original_amount: parsedAmount,
        status: editFeeStatus,
        payment_method: editFeeStatus === 'PAGO' ? editFeePaymentMethod : undefined,
        payment_date: editFeeStatus === 'PAGO' ? (editFeePaymentDate || new Date().toISOString().split('T')[0]) : undefined,
        notes: editFeeNotes.trim() || undefined,
      });
      setFeeToEdit(null);
    } catch (err) {
      console.error('Error updating fee:', err);
      showToast('Erro ao atualizar mensalidade.', 'error');
    } finally {
      setIsSubmittingFeeEdit(false);
    }
  };

  const handleConfirmDeleteFee = () => {
    if (!feeToDelete) return;
    deleteMonthlyFee(feeToDelete.id);
    setFeeToDelete(null);
  };

  const athlete = athletes.find((a) => a.id === athleteId);
  if (!athlete) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
          Voltar para lista de atletas
        </Button>
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          Atleta não encontrado.
        </div>
      </div>
    );
  }

  // Resolve Class & Responsible
  const athleteClass = classes.find(
    (c) => c.id === athlete.current_class_id || c.id === athlete.class_id
  );
  const responsible = responsibles.find((r) => r.id === athlete.responsible_id);

  // Calculate age
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const [year, month, day] = birthDate.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() + 1 - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return Math.max(0, age);
  };

  const age = calculateAge(athlete.birth_date);

  // Athlete Documents
  const athleteDocs = (documents || []).filter((d) => d.athlete_id === athlete.id);

  // Athlete History
  const athleteHistory = (historyEvents || [])
    .filter((h) => h.athlete_id === athlete.id)
    .sort(
      (a, b) =>
        new Date(b.created_at || b.event_date).getTime() -
        new Date(a.created_at || a.event_date).getTime()
    );

  // Athlete Fees
  const athleteFees = (monthlyFees || [])
    .filter((f) => f.athlete_id === athlete.id)
    .sort((a, b) => (b.reference_month || '').localeCompare(a.reference_month || ''));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = (doc: { file_name: string; file_url?: string; file_type?: string }) => {
    try {
      if (doc.file_url) {
        if (doc.file_url.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = doc.file_url;
          link.download = doc.file_name || 'documento';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`Download de "${doc.file_name}" concluído!`, 'success');
        } else {
          fetch(doc.file_url)
            .then((res) => res.blob())
            .then((blob) => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = doc.file_name || 'documento';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              showToast(`Download de "${doc.file_name}" concluído!`, 'success');
            })
            .catch(() => {
              const link = document.createElement('a');
              link.href = doc.file_url!;
              link.download = doc.file_name || 'documento';
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              showToast(`Download de "${doc.file_name}" iniciado!`, 'success');
            });
        }
      } else {
        const content = `CENTAURO - CENTRO DE FORMAÇÃO\n\nDocumento: ${doc.file_name}\nTipo: ${doc.file_type || 'Documento Geral'}\nData de Registro: ${new Date().toLocaleDateString('pt-BR')}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name.endsWith('.txt') || doc.file_name.endsWith('.pdf') ? doc.file_name : `${doc.file_name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Download de "${doc.file_name}" gerado com sucesso!`, 'success');
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast('Erro ao realizar download.', 'error');
    }
  };

  const handleConfirmClassChange = () => {
    if (!newClassId) return;
    changeAthleteClass(athlete.id, newClassId, changeClassReason.trim() || undefined);
    setIsChangingClass(false);
    setNewClassId('');
    setChangeClassReason('');
  };

  const handleConfirmCancelEnrollment = () => {
    setIsSubmittingCancel(true);
    try {
      cancelAthleteEnrollment(
        athlete.id,
        cancelDetailNotes.trim() ? `${cancelMotive} - ${cancelDetailNotes.trim()}` : cancelMotive,
        'Coordenação / Secretaria'
      );
      setIsCancelingClass(false);
      setCancelDetailNotes('');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    addHistoryEvent({
      athlete_id: athlete.id,
      event_type: 'ALTERACAO_DADOS',
      description: newNoteText.trim(),
      event_date: new Date().toISOString().split('T')[0],
      registered_by: 'Administração',
    });

    setNewNoteText('');
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteAthlete(athlete.id);
    setIsDeleteModalOpen(false);
    onBack();
  };

  const respPhoneClean =
    responsible?.phone?.replace(/\D/g, '') || athlete.responsible_phone?.replace(/\D/g, '');

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-700 transition-colors px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar para Lista de Atletas</span>
        </button>

        <div className="text-xs text-slate-500 hidden sm:block">
          <span className="font-semibold text-slate-800">Atletas</span> /{' '}
          <span className="text-blue-700 font-bold">{athlete.name}</span>
        </div>
      </div>

      {/* Header Profile Hero Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <AthleteAvatar
              photoUrl={athlete.photo_url}
              name={athlete.name}
              size="xl"
              bordered
              className="w-20 h-20 sm:w-24 sm:h-24 shadow-md bg-white/10"
            />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {athlete.name}
                </h1>
                <Badge
                  variant={
                    athlete.status === 'ATIVO'
                      ? 'success'
                      : athlete.status === 'DESLIGADO'
                      ? 'danger'
                      : 'gray'
                  }
                  size="sm"
                >
                  {athlete.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-blue-200">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-300" />
                  {formatDateBR(athlete.birth_date)} ({age} anos)
                </span>
                {athlete.cpf && (
                  <span className="flex items-center gap-1.5">
                    <Shield size={14} className="text-blue-300" />
                    CPF: {formatCPF(athlete.cpf)}
                  </span>
                )}
                <span className="flex items-center gap-1.5 font-semibold text-white bg-blue-700/60 px-2.5 py-0.5 rounded-lg border border-blue-600/40">
                  <Layers size={14} className="text-blue-200" />
                  {athleteClass
                    ? `${athleteClass.name} (${athleteClass.category})`
                    : athlete.class_name || 'Sem turma vinculada'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t border-white/10 lg:border-t-0">
            <Button
              size="sm"
              variant="white"
              leftIcon={<Edit2 size={15} />}
              onClick={() => onEdit(athlete)}
            >
              Editar Ficha
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              leftIcon={<ArrowRightLeft size={15} />}
              onClick={() => setIsChangingClass(true)}
            >
              Trocar Turma
            </Button>
            {athlete.status === 'ATIVO' && (athlete.current_class_id || athlete.class_id) && (
              <Button
                size="sm"
                variant="outline"
                className="bg-rose-500/20 border-rose-300/40 text-rose-100 hover:bg-rose-500/30"
                leftIcon={<UserMinus size={15} />}
                onClick={() => setIsCancelingClass(true)}
              >
                Cancelar Matrícula
              </Button>
            )}
            <button
              onClick={handlePrint}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-semibold flex items-center gap-1.5 border border-white/20 cursor-pointer"
              title="Imprimir Ficha Completa"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 transition-all text-xs font-semibold border border-rose-400/30 cursor-pointer"
              title="Excluir Atleta"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Change Class Mini Panel */}
      {isChangingClass && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-amber-600" />
              Transferência / Troca de Turma Oficial
            </h4>
            <button
              onClick={() => setIsChangingClass(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nova Turma de Destino *
              </label>
              <select
                value={newClassId}
                onChange={(e) => setNewClassId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-blue-600 cursor-pointer font-medium"
              >
                <option value="">Selecione a nova turma...</option>
                {(classes || [])
                  .filter((c) => c.id !== athlete.current_class_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.category} - {(c.schedule_days || []).join('/')} às {c.schedule_time})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Motivo da Troca (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Adaptação técnica, mudança de horário..."
                value={changeClassReason}
                onChange={(e) => setChangeClassReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              disabled={!newClassId}
              onClick={handleConfirmClassChange}
            >
              Confirmar Transferência
            </Button>
          </div>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {(
          [
            { id: 'dados', label: 'Dados Gerais & Turma', icon: User },
            { id: 'financeiro', label: 'Financeiro & Mensalidades', icon: CreditCard },
            {
              id: 'documentos',
              label: `Documentos & Anexos (${athleteDocs.length})`,
              icon: FileText,
            },
            { id: 'historico', label: 'Histórico & Timeline', icon: Clock },
            {
              id: 'jogos',
              label: `Jogos & Competições (${matchStats.matchesRegistered})`,
              icon: Trophy,
            },
            {
              id: 'avaliacoes',
              label: `Avaliação Técnica (${athleteEvaluations.length})`,
              icon: Award,
            },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Dados Gerais & Responsável */}
      {activeTab === 'dados' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Turma & Treinamento */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers size={16} className="text-blue-600" />
              Vínculo de Turma & Horários de Treino
            </h3>

            {athleteClass ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Turma Oficial:</span>
                  <span className="font-bold text-slate-900">{athleteClass.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Categoria:</span>
                  <span className="font-semibold text-slate-900">{athleteClass.category}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Dias de Treino:</span>
                  <span className="font-semibold text-slate-900">
                    {(athleteClass.schedule_days || []).join(' e ') || 'A definir'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Horário:</span>
                  <span className="font-semibold text-slate-900">{athleteClass.schedule_time}</span>
                </div>
                {athleteClass.coach_name && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Professor / Treinador:</span>
                    <span className="font-semibold text-slate-900">{athleteClass.coach_name}</span>
                  </div>
                )}
                {athleteClass.location && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Local:</span>
                    <span className="font-semibold text-slate-900">{athleteClass.location}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Nenhuma turma vinculada atualmente.
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Data de Matrícula:</span>
              <span className="font-semibold text-slate-800">
                {formatDateBR(athlete.enrollment_date)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Kit de Uniforme Oficial:</span>
              <Badge variant={athlete.uniform_delivered ? 'success' : 'warning'} size="sm">
                {athlete.uniform_delivered ? 'Entregue' : 'Pendente de Entrega'}
              </Badge>
            </div>
          </div>

          {/* Responsável Legal */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User size={16} className="text-blue-600" />
                <span>Responsável Legal</span>
                {responsible && (
                  <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md normal-case">
                    {responsible.relationship || 'Responsável'}
                  </span>
                )}
              </h3>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<Edit2 size={12} />}
                onClick={() => onEdit(athlete, 'bloco3')}
                className="text-blue-700 border-blue-200 hover:bg-blue-50 text-[11px]"
              >
                Editar Responsável
              </Button>
            </div>

            {responsible || athlete.responsible_name ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Nome:</span>
                  <span className="font-bold text-slate-900">
                    {responsible?.name || athlete.responsible_name}
                  </span>
                </div>
                {(responsible?.cpf || athlete.responsible_cpf) && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">CPF:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCPF(responsible?.cpf || athlete.responsible_cpf || '')}
                    </span>
                  </div>
                )}
                {(responsible?.phone || athlete.responsible_phone) && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Telefone / Contato:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {formatPhone(responsible?.phone || athlete.responsible_phone || '')}
                      </span>
                      {respPhoneClean && (
                        <a
                          href={`https://wa.me/55${respPhoneClean}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {responsible?.email && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">E-mail:</span>
                    <a
                      href={`mailto:${responsible.email}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {responsible.email}
                    </a>
                  </div>
                )}
                {(responsible?.address || athlete.address) && (
                  <div className="py-1.5">
                    <span className="text-slate-500 font-medium block mb-1">Endereço Residencial:</span>
                    <span className="font-medium text-slate-800 leading-relaxed block bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      {responsible?.address || athlete.address}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Nenhum responsável legal associado ao atleta.
              </div>
            )}
          </div>

          {/* Endereço & Observações Médicas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 md:col-span-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin size={16} className="text-blue-600" />
              Endereço Residencial do Aluno
            </h4>
            <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
              {athlete.address || 'Endereço não cadastrado'}
            </p>

            {athlete.notes && (
              <div className="pt-2">
                <span className="text-slate-700 block text-xs font-bold mb-1.5">
                  Observações Gerais / Recomendações Médicas:
                </span>
                <p className="text-slate-800 italic bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 leading-relaxed">
                  "{athlete.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Financeiro */}
      {activeTab === 'financeiro' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Condição Cadastral</span>
              <p className="text-base font-black text-slate-900">
                {athlete.financial_condition === 'BOLSA_INTEGRAL'
                  ? 'Bolsa Integral (100% Isento)'
                  : athlete.financial_condition === 'PAGANTE_COM_DESCONTO'
                  ? 'Pagante com Desconto / Bolsa Parcial'
                  : 'Pagante Integral'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Dia de Vencimento</span>
              <p className="text-base font-black text-blue-800">
                Todo dia {athlete.payment_due_day || 10} de cada mês
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Mensalidade Vigente</span>
              <p className="text-base font-black text-emerald-700">
                {formatCurrency(athlete.custom_monthly_fee || 180)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Histórico de Cobranças & Mensalidades
                </h4>
                <p className="text-xs text-slate-500">
                  Lançamentos mensais e controle de adimplência do aluno.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<CreditCard size={15} />}
                onClick={() => openPaymentModal && openPaymentModal({ athlete_id: athlete.id })}
              >
                Registrar Pagamento
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">Mês Ref.</th>
                    <th className="py-2.5 px-3">Vencimento</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Data Pagamento</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {athleteFees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma mensalidade lançada para este atleta até o momento.
                      </td>
                    </tr>
                  ) : (
                    athleteFees.map((fee, idx) => (
                      <tr key={fee.id ? `${fee.id}-${idx}` : `fee-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {fee.reference_month}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatDateBR(fee.due_date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {formatCurrency(fee.final_amount ?? fee.original_amount ?? 180)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              fee.status === 'PAGO'
                                ? 'success'
                                : fee.status === 'EM_ATRASO'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {fee.status === 'PAGO'
                              ? 'PAGO'
                              : fee.status === 'EM_ATRASO'
                              ? 'EM ATRASO'
                              : 'À RECEBER'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {fee.payment_date ? formatDateBR(fee.payment_date) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {fee.status !== 'PAGO' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-[11px] py-0.5 px-2"
                                leftIcon={<CheckCircle size={12} />}
                                onClick={() =>
                                  openPaymentModal &&
                                  openPaymentModal({
                                    feeId: fee.id,
                                    athleteId: athlete.id,
                                    amount: fee.final_amount ?? fee.original_amount,
                                    type: 'MENSALIDADE',
                                  })
                                }
                              >
                                Baixar
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditFee(fee)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Editar mensalidade"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeeToDelete(fee)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Excluir mensalidade"
                            >
                              <Trash2 size={13} />
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
        </div>
      )}

      {/* Tab 3: Documentos */}
      {activeTab === 'documentos' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Documentos & Anexos do Atleta
              </h4>
              <p className="text-xs text-slate-500">
                Documentos oficiais, certidão de nascimento, atestado médico e termos assinados.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FileText size={15} />}
              onClick={() => onEdit(athlete)}
            >
              Gerenciar Anexos
            </Button>
          </div>

          {athleteDocs.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
              <FileText className="mx-auto text-slate-400" size={36} />
              <p className="text-xs font-bold text-slate-700">Nenhum documento anexado ainda</p>
              <p className="text-[11px] text-slate-400">
                Clique em "Editar Ficha" para anexar o RG, CPF ou atestado médico do atleta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {athleteDocs.map((doc, idx) => (
                <div
                  key={doc.id ? `${doc.id}-${idx}` : `doc-${idx}`}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-3 shadow-2xs hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                        {doc.file_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {doc.file_type} {doc.file_size ? `• ${doc.file_size}` : ''}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Enviado em {formatDateBR(doc.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<Download size={13} />}
                      onClick={() => handleDownloadDoc(doc)}
                      className="text-blue-700 border-blue-200 hover:bg-blue-50 text-[11px]"
                    >
                      Baixar
                    </Button>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-50 rounded-xl transition-all"
                        title="Visualizar documento em nova aba"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Histórico & Timeline */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">Histórico de Ocorrências & Eventos</h4>
            <p className="text-xs text-slate-500">
              Registro cronológico de transferências, alterações e notas administrativas.
            </p>
          </div>

          {/* Quick Note Input */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar nova ocorrência ou observação ao histórico do atleta..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 bg-white"
            />
            <Button size="sm" variant="primary" type="submit" disabled={!newNoteText.trim()}>
              Registrar
            </Button>
          </form>

          <div className="space-y-3 pt-2">
            {athleteHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Nenhum evento registrado no histórico até o momento.
              </div>
            ) : (
              athleteHistory.map((item, idx) => (
                <div
                  key={item.id ? `${item.id}-${idx}` : `hist-${idx}`}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800 mt-0.5">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.event_type}</span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateBR(item.event_date || item.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 leading-relaxed">{item.description}</p>
                    {item.registered_by && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Registrado por: {item.registered_by}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Jogos & Competições */}
      {activeTab === 'jogos' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Trophy size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Partidas Convocado</span>
                <span className="text-xl font-black text-slate-900">{matchStats.matchesRegistered}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Presenças em Campo</span>
                <span className="text-xl font-black text-slate-900">{matchStats.participationsCount}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Target size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total de Gols Marcados</span>
                <span className="text-xl font-black text-amber-700">⚽ {matchStats.goalsCount}</span>
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Histórico de Partidas e Atuações</h4>
                <p className="text-xs text-slate-500">
                  Registro de todas as convocações, participação em campo e gols marcados por {athlete.name}.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {matchStats.history.length} {matchStats.history.length === 1 ? 'partida' : 'partidas'}
              </span>
            </div>

            {matchStats.history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Trophy size={36} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-xs">Nenhum jogo registrado para este atleta ainda.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Ao agendar partidas e relacionar {athlete.name} no módulo de Jogos & Competições, o histórico e os gols aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {matchStats.history.map((h) => {
                  const m = h.match;
                  const isCompleted = m.status === 'REALIZADO';
                  const isCancelled = m.status === 'CANCELADO';

                  return (
                    <div
                      key={m.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            CENTAURO{' '}
                            {m.score_ps !== null && m.score_ps !== undefined
                              ? `${m.score_ps} x ${m.score_opponent ?? '-'}`
                              : 'vs'}{' '}
                            {m.opponent}
                          </span>
                          <Badge
                            variant={isCompleted ? 'success' : isCancelled ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {m.status}
                          </Badge>
                          {m.competition_name && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {m.competition_name}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            {formatDateBR(m.match_date)} {m.match_time ? `às ${m.match_time}` : ''}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {m.location || 'Centauro'}
                          </span>
                          {(m.class_name || m.category) && (
                            <>
                              <span>•</span>
                              <span>{m.class_name || `Categoria ${m.category}`}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            h.participated
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {h.participated ? 'Em Campo / Jogou' : 'Relacionado / Banco'}
                        </span>

                        {h.goals > 0 ? (
                          <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs">
                            <span>⚽</span>
                            <span>{h.goals} {h.goals === 1 ? 'gol marcado' : 'gols marcados'}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 px-2 py-1">
                            0 gols
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Avaliação Técnica */}
      {activeTab === 'avaliacoes' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header of Avaliação Técnica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="text-purple-600" size={18} />
                <span>Avaliações Técnicas & Rendimento Esportivo</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento individual de fundamentos, pontos fortes, oportunidades de evolução e notas de {athlete.name}.
              </p>
            </div>

            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus size={15} />}
              onClick={handleOpenNewEval}
            >
              Nova Avaliação
            </Button>
          </div>

          {/* Metrics Summary (if evaluations exist) */}
          {athleteEvaluations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total de Avaliações
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {athleteEvaluations.length}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Star size={20} className="fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Média das Notas
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {evalAverageGrade !== null ? `${evalAverageGrade} / 10` : 'Sem notas'}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Última Avaliação
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {formatDateBR(athleteEvaluations[0]?.evaluation_date || (athleteEvaluations[0] as any)?.date)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Evaluations List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Histórico de Avaliações</h4>
                <p className="text-xs text-slate-500">
                  Registro pedagógico e técnico de evolução esportiva.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {athleteEvaluations.length} {athleteEvaluations.length === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>

            {athleteEvaluations.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <Award size={40} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-xs">
                  Nenhuma avaliação técnica registrada para {athlete.name}.
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Registre as observações de desempenho, pontos fortes, oportunidades de evolução e nota pedagógica do aluno.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Plus size={14} />}
                    onClick={handleOpenNewEval}
                  >
                    Registrar Primeira Avaliação
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {athleteEvaluations.map((ev) => {
                  const rawGrade = ev.general_grade ?? (ev as any).grade;
                  const evalDateFormatted = formatDateBR(ev.evaluation_date || (ev as any).date);
                  const strengths = ev.positive_points || (ev as any).strengths;
                  const improvements = ev.improvement_points || (ev as any).improvements;
                  const notes = ev.observations || (ev as any).notes;

                  return (
                    <div
                      key={ev.id}
                      className="border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-purple-300 transition-all bg-white shadow-2xs space-y-3.5"
                    >
                      {/* Top Header of each evaluation */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Calendar size={14} className="text-purple-600" />
                            {evalDateFormatted}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-600 font-medium">
                            Avaliador: <strong className="text-slate-800">{ev.evaluator_name || 'Comissão Técnica'}</strong>
                          </span>
                          {(ev.class_name || (ev as any).category) && (
                            <>
                              <span className="text-slate-300">•</span>
                              <Badge variant="primary" size="sm">
                                {ev.class_name || (ev as any).category}
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {rawGrade !== undefined && rawGrade !== null && (
                            <div className="px-2.5 py-1 bg-purple-50 text-purple-800 font-black text-xs rounded-xl border border-purple-200 flex items-center gap-1 shadow-2xs">
                              <Star size={13} className="fill-purple-600 text-purple-600" />
                              <span>Nota {rawGrade}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditEval(ev)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar avaliação"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEvalToDelete(ev)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir avaliação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Content Blocks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {strengths && (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs">
                            <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-[11px]">
                              <TrendingUp size={13} className="text-emerald-700" />
                              <span>Pontos Fortes & Destaques:</span>
                            </span>
                            <p className="text-emerald-900 text-xs leading-relaxed whitespace-pre-wrap">
                              {strengths}
                            </p>
                          </div>
                        )}

                        {improvements && (
                          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
                            <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
                              <Target size={13} className="text-amber-700" />
                              <span>Pontos a Desenvolver / Oportunidades:</span>
                            </span>
                            <p className="text-amber-900 text-xs leading-relaxed whitespace-pre-wrap">
                              {improvements}
                            </p>
                          </div>
                        )}
                      </div>

                      {notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                          <span className="font-bold text-slate-700 block text-[11px] mb-0.5">
                            Observações Gerais:
                          </span>
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão de Atleta"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir permanentemente o cadastro do atleta{' '}
            <strong className="text-slate-900 font-bold">{athlete.name}</strong>?
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            Esta ação não pode ser desfeita. O atleta e seus vínculos serão removidos do sistema e do banco de dados.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
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
              Sim, Excluir Atleta
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Fee Modal */}
      {feeToEdit && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingFeeEdit && setFeeToEdit(null)}
          title="Editar Mensalidade"
          description={`Atualize a cobrança do atleta ${athlete.name}`}
          size="md"
        >
          <form onSubmit={handleSaveEditFee} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Mês de Referência *</label>
                <input
                  type="month"
                  required
                  value={editFeeRefMonth}
                  onChange={(e) => setEditFeeRefMonth(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={editFeeDueDate}
                  onChange={(e) => setEditFeeDueDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <DollarSign size={13} className="text-emerald-600" />
                  <span>Valor (R$) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFeeAmount}
                  onChange={(e) => setEditFeeAmount(e.target.value)}
                  className="w-full text-xs font-bold text-emerald-800 border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Status da Mensalidade *</label>
                <select
                  value={editFeeStatus}
                  onChange={(e) => setEditFeeStatus(e.target.value as FinancialStatus)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="A_RECEBER">À Receber</option>
                  <option value="PAGO">Pago (Liquidado)</option>
                  <option value="EM_ATRASO">Em Atraso (Vencido)</option>
                </select>
              </div>
            </div>

            {editFeeStatus === 'PAGO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1">
                    <CreditCard size={13} className="text-emerald-600" />
                    <span>Forma de Pagamento</span>
                  </label>
                  <select
                    value={editFeePaymentMethod}
                    onChange={(e) => setEditFeePaymentMethod(e.target.value as PaymentMethod)}
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
                    value={editFeePaymentDate}
                    onChange={(e) => setEditFeePaymentDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
              <input
                type="text"
                value={editFeeNotes}
                onChange={(e) => setEditFeeNotes(e.target.value)}
                placeholder="Ex: Valor ajustado por motivo contratual"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeeToEdit(null)}
                disabled={isSubmittingFeeEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingFeeEdit}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Fee Modal */}
      {feeToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setFeeToDelete(null)}
          title="Excluir Mensalidade"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold">Deseja realmente apagar esta mensalidade?</p>
                <p className="text-rose-700 mt-1 leading-relaxed">
                  Esta ação removerá permanentemente a mensalidade de competência{' '}
                  <strong>{feeToDelete.reference_month}</strong> no valor de{' '}
                  <strong>{formatCurrency(feeToDelete.final_amount ?? feeToDelete.original_amount ?? 0)}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeeToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDeleteFee}
                leftIcon={<Trash2 size={14} />}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Athlete Class Enrollment Modal */}
      {isCancelingClass && (
        <Modal
          isOpen={true}
          onClose={() => !isSubmittingCancel && setIsCancelingClass(false)}
          title="Cancelar Matrícula na Turma"
          description="Desvinculação da turma oficial mantendo os dados no banco de dados."
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  Desvinculação sem Exclusão do Banco de Dados
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  O atleta <strong>{athlete.name}</strong> será desvinculado da turma{' '}
                  <strong>{athleteClass?.name || athlete.class_name || 'atual'}</strong> e seu status passará para{' '}
                  <strong className="text-amber-950">DESLIGADO</strong>.
                </p>
                <p className="text-amber-900 text-[11px] font-semibold bg-white/80 p-2 rounded-lg border border-amber-200">
                  ✓ O aluno <strong>NÃO será excluído do banco de dados</strong>. Todo histórico esportivo, financeiro, frequências e prontuário documental permanecerão preservados para consultas ou futura rematrícula.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                id="cancel_motive_select"
                label="Motivo do Cancelamento / Desligamento *"
                required
                value={cancelMotive}
                onChange={(e) => setCancelMotive(e.target.value)}
                options={[
                  { value: 'Incompatibilidade de Horário / Rotina', label: 'Incompatibilidade de Horário / Rotina' },
                  { value: 'Mudança de Endereço / Cidade', label: 'Mudança de Endereço / Cidade' },
                  { value: 'Motivos Financeiros / Orçamento Familiar', label: 'Motivos Financeiros / Orçamento Familiar' },
                  { value: 'Problemas de Saúde / Lesão / Afastamento Médico', label: 'Problemas de Saúde / Lesão / Afastamento Médico' },
                  { value: 'Decisão Familiar / Transferência para Outro Esporte', label: 'Decisão Familiar / Transferência para Outro Esporte' },
                  { value: 'Desistência sem Motivo Informado', label: 'Desistência sem Motivo Informado' },
                  { value: 'Outro Motivo', label: 'Outro Motivo' },
                ]}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={cancelDetailNotes}
                  onChange={(e) => setCancelDetailNotes(e.target.value)}
                  placeholder="Ex: Aluno solicitou trancamento temporário."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelingClass(false)}
                disabled={isSubmittingCancel}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<UserMinus size={14} />}
                onClick={handleConfirmCancelEnrollment}
                isLoading={isSubmittingCancel}
              >
                Confirmar Cancelamento da Matrícula
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nova / Editar Avaliação Técnica */}
      <Modal
        isOpen={isEvalModalOpen}
        onClose={() => !isSubmittingEval && setIsEvalModalOpen(false)}
        title={evalToEdit ? 'Editar Avaliação Técnica' : 'Nova Avaliação Técnica'}
        description={`Registre a evolução individual, pontos fortes e metas de ${athlete.name}.`}
        size="md"
      >
        <form onSubmit={handleSaveEvaluation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Professor / Avaliador *"
              required
              placeholder="Ex: Prof. Gabriel"
              value={evalEvaluatorName}
              onChange={(e) => setEvalEvaluatorName(e.target.value)}
            />
            <Input
              type="date"
              label="Data da Avaliação *"
              required
              value={evalDate}
              onChange={(e) => setEvalDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pontos Fortes & Destaques
            </label>
            <textarea
              rows={2}
              value={evalPositivePoints}
              onChange={(e) => setEvalPositivePoints(e.target.value)}
              placeholder="Ex: Excelente condução com perna direita, boa visão de jogo e liderança positiva em campo..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pontos a Desenvolver / Oportunidades
            </label>
            <textarea
              rows={2}
              value={evalImprovementPoints}
              onChange={(e) => setEvalImprovementPoints(e.target.value)}
              placeholder="Ex: Trabalhar finalização com a perna não dominante e recomposição defensiva..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nota / Conceito Geral (0 a 10)"
              type="number"
              step="0.5"
              min="0"
              max="10"
              placeholder="Ex: 8.5"
              value={evalGrade}
              onChange={(e) => setEvalGrade(e.target.value)}
            />
            <Input
              label="Observações Adicionais"
              placeholder="Ex: Indicado para equipe de competição"
              value={evalObservations}
              onChange={(e) => setEvalObservations(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmittingEval}
              onClick={() => setIsEvalModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingEval}
              leftIcon={<CheckCircle size={14} />}
            >
              {evalToEdit ? 'Atualizar Avaliação' : 'Salvar Avaliação'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Exclusão de Avaliação Técnica */}
      {evalToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setEvalToDelete(null)}
          title="Excluir Avaliação Técnica"
          description="Confirmação de exclusão permanente da avaliação do atleta."
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>Tem certeza que deseja excluir esta avaliação técnica?</span>
              </div>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Esta ação removerá permanentemente a avaliação de{' '}
                <strong>{athlete.name}</strong> realizada em{' '}
                <strong>{formatDateBR(evalToDelete.evaluation_date || (evalToDelete as any).date)}</strong> por{' '}
                <strong>{evalToDelete.evaluator_name || 'Comissão Técnica'}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEvalToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={handleConfirmDeleteEval}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
