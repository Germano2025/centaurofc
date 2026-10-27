import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { TrialLead, TrialClass, KanbanStage, LeadSource } from '../../types';
import {
  formatDateBR,
  formatPhone,
  getLeadSubmissionDate,
  getLeadRawSubmissionDate,
  formatTimeAgo,
  formatNonConversionReason,
  normalizeSearchText,
} from '../../utils/formatters';
import { Badge, BadgeVariant } from '../common/Badge';
import { Button } from '../common/Button';
import { StatCard } from '../common/StatCard';
import { LeadFormModal } from './LeadFormModal';
import { TrialClassScheduleModal } from './TrialClassScheduleModal';
import { TrialClassFeedbackModal } from './TrialClassFeedbackModal';
import { EnrollmentModal } from './EnrollmentModal';
import { NonConversionModal } from './NonConversionModal';
import { LeadDetailModal } from './LeadDetailModal';
import { ShareLeadFormModal } from './ShareLeadFormModal';
import { PublicLeadForm } from './PublicLeadForm';
import { ImportModal } from '../common/ImportModal';
import {
  Users,
  Calendar,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Kanban,
  List,
  CalendarDays,
  Phone,
  MessageCircle,
  UserCheck,
  ChevronRight,
  RefreshCw,
  Archive,
  ArrowRight,
  Clock,
  MapPin,
  Eye,
  Share2,
  Globe,
  ExternalLink,
  QrCode,
  GripVertical,
  CalendarClock,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  MessageSquareText,
  UploadCloud,
  Trash2,
  X,
} from 'lucide-react';

export const LeadsModule: React.FC = () => {
  const {
    leads,
    trialClasses,
    classes,
    updateLeadStage,
    reactivateLead,
    markLeadNonConverted,
    setSelectedAthleteId,
    selectedLeadId,
    setSelectedLeadId,
    refreshLeads,
    deleteLead,
    importLeadsBulk,
    addLead,
  } = useApp();

  const { currentUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<TrialLead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshLeads();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Views: 'kanban' | 'list' | 'schedule'
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'schedule'>('kanban');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  // Modals state
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<TrialLead | null>(null);
  const [initialFormStage, setInitialFormStage] = useState<KanbanStage>('NOVO');

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleLead, setScheduleLead] = useState<TrialLead | null>(null);
  const [existingTrialClass, setExistingTrialClass] = useState<TrialClass | null>(null);
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackTrialClass, setFeedbackTrialClass] = useState<TrialClass | null>(null);

  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentLead, setEnrollmentLead] = useState<TrialLead | null>(null);

  const [isNonConversionModalOpen, setIsNonConversionModalOpen] = useState(false);
  const [nonConversionLead, setNonConversionLead] = useState<TrialLead | null>(null);

  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPreviewFormModalOpen, setIsPreviewFormModalOpen] = useState(false);

  // Metrics calculation - Funil Unificado: 4 Colunas
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const novos = leads.filter((l) => l.stage === 'NOVO' || l.stage === 'CONTATO_REALIZADO' || l.stage === 'NOVO_INTERESSADO').length;
    const agendadas = leads.filter(
      (l) => l.stage === 'AULA_AGENDADA' || l.stage === 'AULA_REALIZADA' || l.stage === 'EM_DECISAO' || l.stage === 'AGUARDANDO_DECISAO'
    ).length;
    const matriculados = leads.filter((l) => l.stage === 'MATRICULADO').length;
    const naoConvertidos = leads.filter((l) => l.stage === 'NAO_CONVERTIDO' || l.stage === 'ENCERRADO').length;

    // Conversion rate: matriculados / total
    const conversionRate = totalLeads > 0 ? Math.round((matriculados / totalLeads) * 100) : 0;

    return {
      totalLeads,
      novos,
      agendadas,
      matriculados,
      naoConvertidos,
      conversionRate,
    };
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search term
      if (searchTerm.trim()) {
        const qRaw = searchTerm.trim();
        const qNorm = normalizeSearchText(qRaw);
        const qDigits = qRaw.replace(/\D/g, '');

        const matchAthlete = normalizeSearchText(lead.athlete_name).includes(qNorm);
        const matchResp = normalizeSearchText(lead.responsible_name).includes(qNorm);
        const matchPhone = qDigits.length >= 2 && (lead.responsible_phone || '').replace(/\D/g, '').includes(qDigits);
        const matchNotes = normalizeSearchText(lead.notes).includes(qNorm);

        if (!matchAthlete && !matchResp && !matchPhone && !matchNotes) return false;
      }

      // Class filter
      if (selectedClassFilter && lead.interest_class_id !== selectedClassFilter) {
        return false;
      }

      // Source filter
      if (selectedSourceFilter && lead.source !== selectedSourceFilter) {
        return false;
      }

      // Stage filter (aligned with 4 unified columns)
      if (selectedStageFilter !== 'ALL') {
        if (selectedStageFilter === 'NOVO') {
          if (lead.stage !== 'NOVO' && lead.stage !== 'CONTATO_REALIZADO' && lead.stage !== 'NOVO_INTERESSADO') return false;
        } else if (selectedStageFilter === 'AULA_AGENDADA') {
          if (
            lead.stage !== 'AULA_AGENDADA' &&
            lead.stage !== 'AULA_REALIZADA' &&
            lead.stage !== 'EM_DECISAO' &&
            lead.stage !== 'AGUARDANDO_DECISAO'
          )
            return false;
        } else if (selectedStageFilter === 'MATRICULADO') {
          if (lead.stage !== 'MATRICULADO') return false;
        } else if (selectedStageFilter === 'NAO_CONVERTIDO') {
          if (lead.stage !== 'NAO_CONVERTIDO' && lead.stage !== 'ENCERRADO') return false;
        } else if (lead.stage !== selectedStageFilter) {
          return false;
        }
      }

      return true;
    });
  }, [leads, searchTerm, selectedClassFilter, selectedSourceFilter, selectedStageFilter]);

  // Stage mapping helper
  const stageBadges: Record<KanbanStage, { label: string; variant: BadgeVariant }> = {
    NOVO: { label: 'Novo Contato', variant: 'navy' },
    NOVO_INTERESSADO: { label: 'Novo Contato', variant: 'navy' },
    CONTATO_REALIZADO: { label: 'Novo Contato', variant: 'navy' },
    AULA_AGENDADA: { label: 'Aula Agendada', variant: 'warning' },
    AULA_REALIZADA: { label: 'Aula Agendada', variant: 'warning' },
    EM_DECISAO: { label: 'Aula Agendada', variant: 'warning' },
    AGUARDANDO_DECISAO: { label: 'Aula Agendada', variant: 'warning' },
    MATRICULADO: { label: 'Matriculado', variant: 'success' },
    NAO_CONVERTIDO: { label: 'Arquivado / Não Convertido', variant: 'danger' },
    ENCERRADO: { label: 'Arquivado / Não Convertido', variant: 'gray' },
  };

  // Kanban Columns Definition - Funil Unificado: 4 Colunas Principais
  const kanbanColumns: { stage: KanbanStage; title: string; color: string; desc: string }[] = [
    { stage: 'NOVO', title: '1. Novo Contato', color: 'border-slate-300 bg-slate-50/50', desc: 'Inscrições e contatos recebidos' },
    { stage: 'AULA_AGENDADA', title: '2. Aula Agendada', color: 'border-amber-300 bg-amber-50/30', desc: 'Treino experimental agendado ou realizado' },
    { stage: 'MATRICULADO', title: '3. Matriculado!', color: 'border-emerald-300 bg-emerald-50/30', desc: 'Atleta oficial ativo no CT' },
    { stage: 'NAO_CONVERTIDO', title: '4. Arquivado / Não Convertidos', color: 'border-rose-300 bg-rose-50/30', desc: 'Desistências e contatos encerrados' },
  ];

  const activeKanbanColumns = kanbanColumns;

  // Handlers for modal triggers
  const handleOpenNewLead = (stage: KanbanStage = 'NOVO') => {
    setLeadToEdit(null);
    setInitialFormStage(stage);
    setIsLeadFormOpen(true);
  };

  const handleEditLead = (lead: TrialLead) => {
    setLeadToEdit(lead);
    setIsLeadFormOpen(true);
  };

  const handleOpenSchedule = (lead: TrialLead) => {
    setScheduleLead(lead);
    setExistingTrialClass(null);
    setIsRescheduleMode(false);
    setIsScheduleModalOpen(true);
  };

  const handleOpenReschedule = (tc: TrialClass) => {
    setScheduleLead(null);
    setExistingTrialClass(tc);
    setIsRescheduleMode(true);
    setIsScheduleModalOpen(true);
  };

  const handleOpenFeedback = (tc: TrialClass) => {
    setFeedbackTrialClass(tc);
    setIsFeedbackModalOpen(true);
  };

  const handleOpenEnrollment = (lead: TrialLead) => {
    setEnrollmentLead(lead);
    setIsEnrollmentModalOpen(true);
  };

  const handleOpenEnrollmentById = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setEnrollmentLead(lead);
      setIsEnrollmentModalOpen(true);
    }
  };

  const handleOpenNonConversion = (lead: TrialLead) => {
    setNonConversionLead(lead);
    setIsNonConversionModalOpen(true);
  };

  const handleAdvanceStage = (lead: TrialLead) => {
    const stageFlow: KanbanStage[] = [
      'NOVO',
      'AULA_AGENDADA',
      'MATRICULADO',
    ];

    let currentStage = lead.stage;
    if (currentStage === 'CONTATO_REALIZADO' || currentStage === 'NOVO_INTERESSADO') currentStage = 'NOVO';
    if (currentStage === 'AULA_REALIZADA' || currentStage === 'EM_DECISAO' || currentStage === 'AGUARDANDO_DECISAO') currentStage = 'AULA_AGENDADA';

    const currentIndex = stageFlow.indexOf(currentStage);
    if (currentIndex >= 0 && currentIndex < stageFlow.length - 1) {
      const nextStage = stageFlow[currentIndex + 1];
      if (nextStage === 'MATRICULADO') {
        handleOpenEnrollment(lead);
      } else if (nextStage === 'AULA_AGENDADA') {
        handleOpenSchedule(lead);
      } else {
        updateLeadStage(lead.id, nextStage);
      }
    }
  };

  // Desktop Drag and Drop State and Handler
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumnStage, setDragOverColumnStage] = useState<KanbanStage | null>(null);

  const handleDropLeadToStage = (leadId: string, targetStage: KanbanStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    let currentNormalized = lead.stage;
    if (currentNormalized === 'CONTATO_REALIZADO' || currentNormalized === 'NOVO_INTERESSADO') currentNormalized = 'NOVO';
    if (currentNormalized === 'AULA_REALIZADA' || currentNormalized === 'EM_DECISAO' || currentNormalized === 'AGUARDANDO_DECISAO') currentNormalized = 'AULA_AGENDADA';

    if (currentNormalized === targetStage) return;

    if (targetStage === 'MATRICULADO') {
      handleOpenEnrollment(lead);
      return;
    }

    if (targetStage === 'AULA_AGENDADA') {
      const existing = trialClasses.find(
        (tc) => tc.lead_id === lead.id && tc.status === 'AGENDADA'
      );
      if (!existing) {
        updateLeadStage(lead.id, 'AULA_AGENDADA', 'Movido para Aula Agendada via funil Kanban');
        handleOpenSchedule(lead);
      } else {
        updateLeadStage(lead.id, 'AULA_AGENDADA', 'Movido para Aula Agendada via funil Kanban');
      }
      return;
    }

    if (targetStage === 'NAO_CONVERTIDO') {
      handleOpenNonConversion(lead);
      return;
    }

    updateLeadStage(lead.id, targetStage, `Movido para ${targetStage} via arrasto Kanban`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={26} />
            Módulo de Interessados, Aula Experimental e Matrícula
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Funil unificado: Novo Contato → Aula Agendada → Matriculado → Arquivado/Não Convertidos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-600'} />}
            title="Sincronizar formulários externos e atualizar leads"
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            leftIcon={<UploadCloud size={14} />}
            title="Importar lista de interessados via planilha CSV"
          >
            Importar CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            leftIcon={<Share2 size={15} className="text-blue-600" />}
            className="border-blue-300 bg-blue-50/50 hover:bg-blue-100 text-blue-900 font-bold"
          >
            Link de Inscrição Externa
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenSchedule(leads[0] || null)}
            leftIcon={<Calendar size={15} />}
          >
            Agendar Aula
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewLead('NOVO')}
            leftIcon={<Plus size={16} />}
          >
            Novo Interessado
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards - Funil Unificado: 4 Colunas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total no Funil"
          value={metrics.totalLeads}
          icon={Users}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-700"
          subtitle={`${metrics.novos + metrics.agendadas} em andamento`}
        />
        <StatCard
          title="Novo Contato"
          value={metrics.novos}
          icon={Clock}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="Coluna 1"
        />
        <StatCard
          title="Aula Agendada"
          value={metrics.agendadas}
          icon={Calendar}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="Coluna 2"
        />
        <StatCard
          title="Matriculados"
          value={metrics.matriculados}
          icon={CheckCircle}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="Coluna 3 (Alunos)"
        />
        <StatCard
          title="Arquivados / Não Conv."
          value={metrics.naoConvertidos}
          icon={Archive}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          subtitle="Coluna 4 (Desistências)"
        />
        <StatCard
          title="Conversão"
          value={`${metrics.conversionRate}%`}
          icon={TrendingUp}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-700"
          subtitle={`${metrics.matriculados} de ${metrics.totalLeads}`}
        />
      </div>

      {/* External Public Lead Form Highlight Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <Globe size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Formulário Público de Captação & Aula Experimental</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Link Ativo & Automático
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              Disponibilize o link nas redes sociais, WhatsApp ou recepção do CT Caxangá. Todas as inscrições caem automaticamente em tempo real na coluna <strong>"1. Novo Contato"</strong> com a etiqueta <strong>Formulário Online</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            leftIcon={<Share2 size={14} />}
            onClick={() => setIsShareModalOpen(true)}
          >
            Copiar Link & QR Code
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white"
            leftIcon={<ExternalLink size={14} />}
            onClick={() => {
              setIsPreviewFormModalOpen(true);
            }}
          >
            Abrir Formulário
          </Button>
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por aluno, responsável ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-full hover:bg-slate-200"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Turmas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category})
                </option>
              ))}
            </select>

            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Origens</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="INDICACAO">Indicação</option>
              <option value="PASSANTE">Passante</option>
              <option value="FORMULARIO_EXTERNO">Formulário Site</option>
              <option value="OUTRO">Outros</option>
            </select>

            {/* Stage filter dropdown */}
            <select
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas as Etapas (4 Colunas)</option>
              <option value="NOVO">1. Novo Contato ({metrics.novos})</option>
              <option value="AULA_AGENDADA">2. Aula Agendada ({metrics.agendadas})</option>
              <option value="MATRICULADO">3. Matriculado ({metrics.matriculados})</option>
              <option value="NAO_CONVERTIDO">4. Arquivado / Não Conv. ({metrics.naoConvertidos})</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban size={14} />
                <span>Kanban</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List size={14} />
                <span>Lista</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('schedule')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'schedule'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={14} />
                <span>Agenda Aulas</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: KANBAN BOARD */}
      {/* ======================================================== */}
      {viewMode === 'kanban' && (
        <div className="space-y-2">
          {/* Subtle Desktop Drag & Drop Guidance */}
          <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-500 px-1">
            <div className="flex items-center gap-1.5">
              <GripVertical size={13} className="text-slate-400" />
              <span>
                <strong>Arraste os cartões com o mouse</strong> entre as colunas para avançar ou alterar a etapa do interessado.
              </span>
            </div>
            <span className="text-slate-400">
              Na coluna <strong>Aula Agendada</strong>, use o botão <em>Reagendar</em> para remarcar o treino.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 items-start">
            {kanbanColumns.map((col) => {
              const columnLeads = filteredLeads.filter((l) => {
                if (col.stage === 'NOVO') {
                  return l.stage === 'NOVO' || l.stage === 'CONTATO_REALIZADO' || l.stage === 'NOVO_INTERESSADO';
                }
                if (col.stage === 'AULA_AGENDADA') {
                  return (
                    l.stage === 'AULA_AGENDADA' ||
                    l.stage === 'AULA_REALIZADA' ||
                    l.stage === 'EM_DECISAO' ||
                    l.stage === 'AGUARDANDO_DECISAO'
                  );
                }
                if (col.stage === 'MATRICULADO') {
                  return l.stage === 'MATRICULADO';
                }
                if (col.stage === 'NAO_CONVERTIDO') {
                  return l.stage === 'NAO_CONVERTIDO' || l.stage === 'ENCERRADO';
                }
                return l.stage === col.stage;
              });

              const isOverThisColumn = dragOverColumnStage === col.stage;

              return (
                <div
                  key={col.stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverColumnStage !== col.stage) {
                      setDragOverColumnStage(col.stage);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverColumnStage === col.stage) {
                        setDragOverColumnStage(null);
                      }
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedLeadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
                    setDragOverColumnStage(null);
                    setDraggedLeadId(null);
                    if (droppedLeadId) {
                      handleDropLeadToStage(droppedLeadId, col.stage);
                    }
                  }}
                  className={`rounded-2xl border p-3 flex flex-col min-h-[500px] shadow-2xs transition-all duration-150 ${col.color} ${
                    isOverThisColumn
                      ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/80 border-blue-400 shadow-md'
                      : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 tracking-tight">
                        {col.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{col.desc}</p>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-800 text-[11px] font-bold flex items-center justify-center shadow-2xs">
                      {columnLeads.length}
                    </span>
                  </div>

                  {/* Drop zone indicator when dragging over */}
                  {isOverThisColumn && (
                    <div className="p-2.5 mb-2.5 border-2 border-dashed border-blue-400 bg-blue-100/70 rounded-xl text-center text-xs font-bold text-blue-800 flex items-center justify-center gap-1.5 animate-pulse">
                      <ArrowRight size={13} />
                      <span>Solte aqui para mover para {col.title}</span>
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[700px] pr-0.5">
                    {columnLeads.length > 0 ? (
                      columnLeads.map((lead) => {
                        // Associated trial classes for this lead
                        const leadTrials = trialClasses.filter((tc) => tc.lead_id === lead.id);
                        const completedTrial = leadTrials
                          .filter((tc) => tc.status === 'REALIZADA' || tc.feedback_decision || tc.feedback_notes)
                          .sort((a, b) => (b.class_date || '').localeCompare(a.class_date || ''))[0];
                        const scheduledTrial = leadTrials.find((tc) => tc.status === 'AGENDADA');

                        const isBeingDragged = draggedLeadId === lead.id;

                        return (
                          <div
                            key={lead.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', lead.id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedLeadId(lead.id);
                            }}
                            onDragEnd={() => {
                              setDraggedLeadId(null);
                              setDragOverColumnStage(null);
                            }}
                            className={`bg-white border rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group space-y-2.5 select-none ${
                              isBeingDragged
                                ? 'opacity-40 border-dashed border-blue-400 bg-blue-50/50 scale-[0.98]'
                                : 'border-slate-200 hover:border-blue-300'
                            }`}
                            onClick={() => setDetailLeadId(lead.id)}
                          >
                            {/* Card Top: Drag handle, Name & Origin */}
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-1.5 min-w-0">
                                <GripVertical
                                  size={13}
                                  className="text-slate-300 group-hover:text-slate-500 mt-0.5 shrink-0 transition-colors"
                                  title="Arrastar cartão com o mouse"
                                />
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                    {lead.athlete_name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 line-clamp-1">
                                    Resp: {lead.responsible_name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {lead.source === 'FORMULARIO_EXTERNO' ? (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                    <Globe size={9} />
                                    <span>Form Online</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider shrink-0">
                                    {lead.source}
                                  </span>
                                )}
                                {currentUser?.role === 'ADMINISTRADOR' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLeadToDelete(lead);
                                    }}
                                    className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Excluir interessado (Apenas Administrador)"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Interest Class & Contact */}
                            <div className="space-y-1 text-[11px] text-slate-600">
                              {lead.interest_class_name && (
                                <p className="font-semibold text-blue-800 line-clamp-1">
                                  {lead.interest_class_name}
                                </p>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <Phone size={10} />
                                <span>{formatPhone(lead.responsible_phone)}</span>
                              </div>
                            </div>

                            {/* Data em que o lead preencheu o formulário e entrou no sistema */}
                            <div
                              className="flex items-center justify-between gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-md px-2 py-1"
                              title="Data e hora em que o lead preencheu o formulário e entrou no sistema"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CalendarClock size={11} className="text-blue-600 shrink-0" />
                                <span className="truncate">
                                  Inscrito: <strong className="text-slate-800 font-semibold">{getLeadSubmissionDate(lead)}</strong>
                                </span>
                              </div>
                              {formatTimeAgo(getLeadRawSubmissionDate(lead)) && (
                                <span className="text-[9px] text-slate-400 font-medium shrink-0">
                                  {formatTimeAgo(getLeadRawSubmissionDate(lead))}
                                </span>
                              )}
                            </div>

                            {/* ======================================================== */}
                            {/* STAGE-SPECIFIC TRIAL / FEEDBACK VISIBILITY */}
                            {/* ======================================================== */}

                            {/* 1. AULA AGENDADA: Show completed feedback (if done) or scheduled details (if pending) */}
                            {col.stage === 'AULA_AGENDADA' ? (
                              completedTrial ? (
                                <div
                                  className="p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-200 text-slate-800 space-y-2 shadow-2xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Status & Decision Badges */}
                                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-950">
                                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                      <span>Aula Realizada</span>
                                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                                        {formatDateBR(completedTrial.class_date)}
                                      </span>
                                    </div>

                                    {/* Decision Pill */}
                                    {completedTrial.feedback_decision === 'CONTINUAR' && (
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                        <ThumbsUp size={10} className="text-emerald-700" />
                                        <span>Quer Matricular</span>
                                      </span>
                                    )}
                                    {completedTrial.feedback_decision === 'AINDA_NAO_DECIDIU' && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1 shadow-2xs">
                                        <Clock size={10} className="text-blue-700" />
                                        <span>Em Decisão / Pensando</span>
                                      </span>
                                    )}
                                    {(completedTrial.feedback_decision === 'DESISTIU' || completedTrial.feedback_decision === 'NAO_CONTINUAR') && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 shadow-2xs">
                                        <ThumbsDown size={10} className="text-rose-600" />
                                        <span>Desistiu</span>
                                      </span>
                                    )}
                                    {!completedTrial.feedback_decision && (
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                        Aguardando decisão
                                      </span>
                                    )}
                                  </div>

                                  {completedTrial.class_name && (
                                    <p className="text-[10px] text-slate-600 line-clamp-1">
                                      Turma: <strong className="text-slate-800">{completedTrial.class_name}</strong>
                                      {completedTrial.class_time ? ` (${completedTrial.class_time})` : ''}
                                    </p>
                                  )}

                                  {/* Parecer do Professor / Feedback Text */}
                                  <div className="p-2 rounded-lg bg-white/95 border border-emerald-200/90 shadow-2xs space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                                        <MessageSquareText size={11} className="text-emerald-700" />
                                        Feedback / Parecer da Aula:
                                      </span>
                                      {completedTrial.registered_by && (
                                        <span className="text-slate-400 font-medium text-[9px]">Por: {completedTrial.registered_by}</span>
                                      )}
                                    </div>
                                    {completedTrial.feedback_notes ? (
                                      <p className="text-[11px] text-slate-800 italic leading-relaxed line-clamp-3" title={completedTrial.feedback_notes}>
                                        "{completedTrial.feedback_notes}"
                                      </p>
                                    ) : (
                                      <p className="text-[10px] text-slate-400 italic">
                                        Presença confirmada sem anotações adicionais.
                                      </p>
                                    )}
                                  </div>

                                  {/* Feedback card quick action buttons */}
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFeedback(completedTrial)}
                                      className="flex-1 py-1 px-2 rounded-md bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                      title="Editar avaliação ou parecer da aula experimental"
                                    >
                                      <MessageSquareText size={10} className="text-emerald-700" />
                                      <span>{completedTrial.feedback_notes ? 'Editar Feedback' : 'Registrar Feedback'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEnrollment(lead)}
                                      className="py-1 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                      title="Efetivar matrícula deste interessado"
                                    >
                                      <UserCheck size={10} />
                                      <span>Matricular</span>
                                    </button>
                                  </div>
                                </div>
                              ) : scheduledTrial ? (
                                <div
                                  className="p-2 rounded-lg border bg-amber-50/90 border-amber-200 text-amber-950 text-[11px] space-y-1.5 shadow-2xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between font-semibold">
                                    <div className="flex items-center gap-1">
                                      <Calendar size={12} className="text-amber-700" />
                                      <span>Aula Marcada</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                      {formatDateBR(scheduledTrial.class_date)}
                                      {scheduledTrial.class_time ? ` às ${scheduledTrial.class_time}` : ''}
                                    </span>
                                  </div>

                                  {scheduledTrial.class_name && (
                                    <p className="text-[10px] text-slate-700 line-clamp-1">
                                      Turma: <strong>{scheduledTrial.class_name}</strong>
                                    </p>
                                  )}

                                  {/* Quick actions inside scheduled trial card */}
                                  <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200/70">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReschedule(scheduledTrial)}
                                      className="flex-1 py-1 px-2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                      title="Reagendar data, horário ou turma desta aula"
                                    >
                                      <RefreshCw size={10} className="text-amber-700" />
                                      <span>Reagendar</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenFeedback(scheduledTrial)}
                                      className="py-1 px-2 rounded bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[10px] border border-slate-200 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                      title="Registrar presença e feedback da aula"
                                    >
                                      <CheckCircle size={10} className="text-emerald-600" />
                                      <span>Avaliar</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="p-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 text-center space-y-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <p className="text-[10px] text-amber-800 font-medium">Aguardando marcação da data</p>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSchedule(lead)}
                                    className="w-full py-1 px-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                  >
                                    <Calendar size={11} />
                                    <span>Agendar Aula Agora</span>
                                  </button>
                                </div>
                              )
                            ) : null}

                            {/* 3. NOVO: Compact badge if already scheduled */}
                            {col.stage === 'NOVO' && scheduledTrial && (
                              <div
                                className="p-1.5 rounded-md border bg-blue-50/60 border-blue-200 text-[10px] text-blue-900 flex items-center justify-between"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1">
                                  <Calendar size={11} className="text-blue-600" />
                                  <span>Aula marcada: {formatDateBR(scheduledTrial.class_date)}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReschedule(scheduledTrial)}
                                  className="text-blue-700 hover:underline font-bold"
                                >
                                  Alterar
                                </button>
                              </div>
                            )}

                            {/* 4. MATRICULADO: Converted status + feedback snippet */}
                            {col.stage === 'MATRICULADO' && (
                              <div
                                className="p-2 rounded-lg border bg-emerald-50/80 border-emerald-200 text-emerald-950 text-[10px] space-y-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <div className="flex items-center gap-1 text-emerald-800">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    <span>Matrícula Efetivada</span>
                                  </div>
                                  {lead.converted_athlete_id && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAthleteId(lead.converted_athlete_id!)}
                                      className="text-blue-700 hover:underline font-bold"
                                    >
                                      Ver Atleta
                                    </button>
                                  )}
                                </div>
                                {completedTrial?.feedback_notes && (
                                  <p className="italic text-slate-600 line-clamp-1 text-[10px]" title={completedTrial.feedback_notes}>
                                    "{completedTrial.feedback_notes}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* 5. NAO CONVERTIDO: reason & notes */}
                            {(col.stage === 'NAO_CONVERTIDO' || lead.stage === 'NAO_CONVERTIDO' || lead.stage === 'ENCERRADO') && (
                              <div
                                className="p-2 rounded-lg border bg-rose-50/80 border-rose-200 text-rose-950 text-[10px] space-y-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-1 font-bold text-rose-800">
                                  <Archive size={11} className="text-rose-600" />
                                  <span>Arquivado / Não Convertido</span>
                                </div>
                                {lead.non_conversion_reason && (
                                  <p className="text-slate-600 text-[10px]">
                                    Motivo: <strong>{formatNonConversionReason(lead.non_conversion_reason)}</strong>
                                  </p>
                                )}
                                {lead.non_conversion_notes && (
                                  <p className="italic text-slate-500 line-clamp-2 text-[10px]" title={lead.non_conversion_notes}>
                                    "{lead.non_conversion_notes}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Card Actions Footer */}
                            <div
                              className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 text-[10px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setDetailLeadId(lead.id)}
                                className="text-slate-500 hover:text-slate-800 font-semibold p-1 hover:bg-slate-50 rounded flex items-center gap-1"
                                title="Ver ficha completa"
                              >
                                <Eye size={13} />
                                <span>Ficha</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {lead.stage !== 'MATRICULADO' && lead.stage !== 'NAO_CONVERTIDO' && (
                                  <>
                                    {/* Action to schedule if in NOVO stage without scheduled class */}
                                    {col.stage === 'NOVO' && !scheduledTrial && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenSchedule(lead)}
                                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold"
                                        title="Agendar aula experimental"
                                      >
                                        + Aula
                                      </button>
                                    )}

                                    {/* Dedicated Reagendar button when in Aula Agendada column */}
                                    {col.stage === 'AULA_AGENDADA' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (scheduledTrial) {
                                            handleOpenReschedule(scheduledTrial);
                                          } else {
                                            handleOpenSchedule(lead);
                                          }
                                        }}
                                        className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center gap-1 transition-colors"
                                        title="Reagendar aula experimental"
                                      >
                                        <RefreshCw size={10} />
                                        <span>Reagendar</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEnrollment(lead)}
                                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-2xs"
                                      title="Efetivar Matrícula"
                                    >
                                      <UserCheck size={11} />
                                      <span>Matricular</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleAdvanceStage(lead)}
                                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                                      title="Avançar etapa no funil"
                                    >
                                      <ArrowRight size={12} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenNonConversion(lead)}
                                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Arquivar / Registrar Não Conversão"
                                    >
                                      <Archive size={12} />
                                    </button>
                                  </>
                                )}

                                {(lead.stage === 'NAO_CONVERTIDO' || lead.stage === 'ENCERRADO') && (
                                  <button
                                    type="button"
                                    onClick={() => reactivateLead(lead.id, 'NOVO', 'Reativado de volta para o funil')}
                                    className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 border border-blue-200 transition-colors shadow-2xs"
                                    title="Reativar interessado de volta para o funil principal"
                                  >
                                    <RefreshCw size={10} />
                                    <span>Reativar</span>
                                  </button>
                                )}

                                {lead.stage === 'MATRICULADO' && (
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle size={12} /> Atleta Ativo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-28 flex flex-col items-center justify-center text-slate-400 text-center p-2 rounded-xl border border-dashed border-slate-200/80 bg-white/60">
                        <p className="text-[11px] font-medium">Nenhum interessado</p>
                        <button
                          type="button"
                          onClick={() => handleOpenNewLead(col.stage)}
                          className="mt-1 text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          <Plus size={10} /> Adicionar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: LIST / TABLE VIEW */}
      {/* ======================================================== */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Aluno / Idade</th>
                  <th className="py-3 px-4">Responsável & Contato</th>
                  <th className="py-3 px-4">Turma Pretendida</th>
                  <th className="py-3 px-4">Data de Inscrição</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Etapa no Funil</th>
                  <th className="py-3 px-4">Aula / Feedback</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => {
                    const leadTrials = trialClasses.filter((tc) => tc.lead_id === lead.id);
                    const completedTrial = leadTrials
                      .filter((tc) => tc.status === 'REALIZADA' || tc.feedback_decision || tc.feedback_notes)
                      .sort((a, b) => (b.class_date || '').localeCompare(a.class_date || ''))[0];
                    const scheduledTrial = leadTrials.find((tc) => tc.status === 'AGENDADA');
                    const activeTrial = scheduledTrial || completedTrial || leadTrials[0];

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setDetailLeadId(lead.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 text-xs">{lead.athlete_name}</p>
                          <p className="text-[11px] text-slate-400">
                            Nasc: {formatDateBR(lead.athlete_birth_date)}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{lead.responsible_name}</p>
                          <p className="text-[11px] text-slate-500">{formatPhone(lead.responsible_phone)}</p>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-blue-800">
                            {lead.interest_class_name || 'A definir'}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-xs">
                            <CalendarClock size={13} className="text-blue-600 shrink-0" />
                            <span>{getLeadSubmissionDate(lead)}</span>
                          </div>
                          {formatTimeAgo(getLeadRawSubmissionDate(lead)) && (
                            <p className="text-[10px] text-slate-400 mt-0.5 pl-4">
                              {formatTimeAgo(getLeadRawSubmissionDate(lead))}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {lead.source === 'FORMULARIO_EXTERNO' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                              <Globe size={11} />
                              <span>Form Online</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {lead.source}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={stageBadges[lead.stage]?.variant || 'default'}>
                            {stageBadges[lead.stage]?.label || lead.stage}
                          </Badge>
                        </td>

                        <td className="py-3 px-4">
                          {completedTrial && (completedTrial.status === 'REALIZADA' || completedTrial.feedback_notes || completedTrial.feedback_decision) ? (
                            <div className="space-y-1 max-w-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-700" />
                                  <span>Realizada: {formatDateBR(completedTrial.class_date)}</span>
                                </span>
                                {completedTrial.feedback_decision === 'CONTINUAR' && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 inline-flex items-center gap-1">
                                    <ThumbsUp size={9} />
                                    <span>Quer Matricular</span>
                                  </span>
                                )}
                                {completedTrial.feedback_decision === 'AINDA_NAO_DECIDIU' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                    <Clock size={9} />
                                    <span>Pensando</span>
                                  </span>
                                )}
                                {(completedTrial.feedback_decision === 'DESISTIU' || completedTrial.feedback_decision === 'NAO_CONTINUAR') && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                    <ThumbsDown size={9} />
                                    <span>Desistiu</span>
                                  </span>
                                )}
                              </div>
                              {completedTrial.feedback_notes && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-600 italic" title={completedTrial.feedback_notes}>
                                  <MessageSquareText size={11} className="text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[200px]">"{completedTrial.feedback_notes}"</span>
                                </div>
                              )}
                            </div>
                          ) : scheduledTrial ? (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                                <Calendar size={11} className="text-amber-700" />
                                <span>Agendada: {formatDateBR(scheduledTrial.class_date)}{scheduledTrial.class_time ? ` às ${scheduledTrial.class_time}` : ''}</span>
                              </span>
                              {scheduledTrial.class_name && (
                                <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{scheduledTrial.class_name}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Nenhuma aula</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {completedTrial && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenFeedback(completedTrial)}
                                title="Ver ou editar feedback da aula"
                              >
                                Feedback
                              </Button>
                            )}

                            {scheduledTrial && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReschedule(scheduledTrial)}
                                title="Reagendar aula experimental"
                              >
                                Reagendar
                              </Button>
                            )}

                            {lead.stage !== 'MATRICULADO' && lead.stage !== 'NAO_CONVERTIDO' && (
                              <>
                                {!scheduledTrial && !completedTrial && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenSchedule(lead)}
                                  >
                                    Aula
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => handleOpenEnrollment(lead)}
                                >
                                  Matricular
                                </Button>
                              </>
                            )}

                            {(lead.stage === 'NAO_CONVERTIDO' || lead.stage === 'ENCERRADO') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={() => reactivateLead(lead.id, 'NOVO', 'Reativado de volta para o funil')}
                                leftIcon={<RefreshCw size={12} />}
                              >
                                Reativar
                              </Button>
                            )}

                            {lead.stage === 'MATRICULADO' && lead.converted_athlete_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAthleteId(lead.converted_athlete_id!)}
                              >
                                Ver Atleta
                              </Button>
                            )}

                            {currentUser?.role === 'ADMINISTRADOR' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1.5"
                                onClick={() => setLeadToDelete(lead)}
                                title="Excluir interessado (Apenas Administrador)"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Nenhum interessado encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: TRIAL CLASSES AGENDA */}
      {/* ======================================================== */}
      {viewMode === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-600" />
              Agenda de Aulas Experimentais Marcadas
            </h3>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenSchedule(leads[0] || null)}
              leftIcon={<Plus size={15} />}
            >
              Nova Aula Experimental
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trialClasses.length > 0 ? (
              trialClasses.map((tc) => {
                const isPast = new Date(tc.class_date) < new Date();

                return (
                  <div
                    key={tc.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <Calendar size={15} />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{formatDateBR(tc.class_date)}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{tc.class_time}</p>
                        </div>
                      </div>

                      <Badge
                        variant={
                          tc.status === 'REALIZADA'
                            ? 'success'
                            : tc.status === 'AGENDADA'
                            ? 'warning'
                            : tc.status === 'REMARCADA'
                            ? 'default'
                            : 'danger'
                        }
                      >
                        {tc.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-800">{tc.athlete_name}</p>
                      <p className="text-blue-700 font-semibold">{tc.class_name}</p>
                      <p className="text-slate-500 text-[11px] flex items-center gap-1">
                        <MapPin size={12} />
                        {tc.location || 'Campo Principal'}
                      </p>
                    </div>

                    {tc.feedback_decision && (
                      <div className="p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="font-bold text-slate-700">Decisão: </span>
                        <span className="text-blue-700 font-semibold">{tc.feedback_decision}</span>
                        {tc.feedback_notes && (
                          <p className="text-[11px] text-slate-600 mt-1 italic">"{tc.feedback_notes}"</p>
                        )}
                      </div>
                    )}

                    {tc.notes && (
                      <p className="text-[11px] text-slate-500 italic">Obs: {tc.notes}</p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {tc.status === 'AGENDADA' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReschedule(tc)}
                            leftIcon={<RefreshCw size={13} />}
                          >
                            Remarcar
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenFeedback(tc)}
                            leftIcon={<CheckCircle size={13} />}
                          >
                            Presença & Feedback
                          </Button>
                        </>
                      )}

                      {tc.status === 'REALIZADA' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleOpenEnrollmentById(tc.lead_id)}
                          leftIcon={<UserCheck size={13} />}
                        >
                          Matricular
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                Nenhuma aula experimental registrada no momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}
      <LeadFormModal
        isOpen={isLeadFormOpen}
        onClose={() => setIsLeadFormOpen(false)}
        leadToEdit={leadToEdit}
        initialStage={initialFormStage}
      />

      <TrialClassScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        lead={scheduleLead}
        existingTrialClass={existingTrialClass}
        isReschedule={isRescheduleMode}
      />

      <TrialClassFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        trialClass={feedbackTrialClass}
        onOpenEnrollment={handleOpenEnrollmentById}
      />

      <EnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        lead={enrollmentLead}
        onEnrollmentComplete={(athleteId) => {
          setSelectedAthleteId(athleteId);
        }}
      />

      <NonConversionModal
        isOpen={isNonConversionModalOpen}
        onClose={() => setIsNonConversionModalOpen(false)}
        lead={nonConversionLead}
      />

      <ShareLeadFormModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onOpenFormInApp={() => {
          setIsPreviewFormModalOpen(true);
        }}
      />

      <LeadDetailModal
        isOpen={!!detailLeadId}
        onClose={() => setDetailLeadId(null)}
        leadId={detailLeadId}
        onEditLead={(l) => {
          setDetailLeadId(null);
          handleEditLead(l);
        }}
        onScheduleClass={(l) => {
          setDetailLeadId(null);
          handleOpenSchedule(l);
        }}
        onRescheduleClass={(tc) => {
          setDetailLeadId(null);
          handleOpenReschedule(tc);
        }}
        onFeedbackClass={(tc) => {
          setDetailLeadId(null);
          handleOpenFeedback(tc);
        }}
        onEnroll={(l) => {
          setDetailLeadId(null);
          handleOpenEnrollment(l);
        }}
        onMarkNonConverted={(l) => {
          setDetailLeadId(null);
          handleOpenNonConversion(l);
        }}
        onReactivate={(l) => {
          // Reactivate directly with target stage
          updateLeadStage(l.id, 'CONTATO_REALIZADO', 'Reativado pelo perfil');
        }}
      />

      {isImportModalOpen && (
        <ImportModal
          isOpen={true}
          type="leads"
          onClose={() => setIsImportModalOpen(false)}
          onImportLeads={importLeadsBulk}
        />
      )}

      {/* Confirmation Modal for Admin Deletion */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-5 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Excluir Interessado</h3>
                <p className="text-xs text-rose-600 font-semibold">Ação restrita a Administrador</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4 leading-relaxed">
              Tem certeza que deseja excluir o interessado <strong>{leadToDelete.athlete_name}</strong>?
              Esta ação apagará permanentemente o cadastro, agendamentos e histórico vinculado, não podendo ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLeadToDelete(null)}
                disabled={isDeletingLead}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={async () => {
                  if (!leadToDelete) return;
                  setIsDeletingLead(true);
                  try {
                    await deleteLead(leadToDelete.id);
                    setLeadToDelete(null);
                  } finally {
                    setIsDeletingLead(false);
                  }
                }}
                isLoading={isDeletingLead}
                leftIcon={<Trash2 size={14} />}
              >
                Sim, Excluir Definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Pré-visualização do Formulário Externo para a Coordenação */}
      {isPreviewFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-100">
                Pré-visualização do Formulário Externo de Captação
              </span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                (Visão exata do responsável ao abrir o link público compartilhado)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewFormModalOpen(false)}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Fechar Pré-visualização</span>
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-100">
            <PublicLeadForm
              onLeadAdded={(lead) => {
                addLead(lead, 'Formulário Online');
                setIsPreviewFormModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
