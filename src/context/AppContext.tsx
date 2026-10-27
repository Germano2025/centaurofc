import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  SoccerClass,
  Responsible,
  Athlete,
  MonthlyFee,
  ExtraRevenue,
  TrainingSession,
  AttendanceRecord,
  AbsenceJustification,
  TrialLead,
  TrialClass,
  KanbanStage,
  NonConversionReason,
  LeadHistoryItem,
  TrialClassStatus,
  TrialFeedbackDecision,
  SportEvent,
  GameMatch,
  MatchParticipant,
  MatchGoal,
  MatchStatus,
  MatchResult,
  SportEventType,
  TechnicalEvaluation,
  NavigationModule,
  AppNotification,
  AthleteHistoryEvent,
  AthleteDocument,
  FinancialStatus,
  FinancialCondition,
  DiscountType,
  PaymentMethod,
  Negotiation,
  NegotiationInstallment,
} from '../types';
import {
  initialClasses,
  initialResponsibles,
  initialAthletes,
  initialMonthlyFees,
  initialExtraRevenues,
  initialNegotiations,
  initialTrainingSessions,
  initialAttendances,
  initialAbsenceJustifications,
  initialLeads,
  initialTrialClasses,
  initialEvents,
  initialMatches,
  initialMatchParticipants,
  initialMatchGoals,
  initialEvaluations,
  initialHistoryEvents,
  initialDocuments,
} from '../lib/mockData';
import { cleanDigits, formatCurrency, formatDateBR } from '../utils/formatters';
import {
  calculateAthleteFeeDetails,
  formatCompetence,
  getExtraRevenueCategoryLabel,
  getPaymentMethodLabel,
} from '../utils/financialUtils';
import { getAthletesWithWeeklyAbsences } from '../utils/attendanceUtils';
import { checkMatchDuplicate } from '../utils/gameUtils';
import {
  supabase,
  isSupabaseConfigured,
  syncAthleteToSupabase,
  syncClassToSupabase,
  syncResponsibleToSupabase,
  syncMonthlyFeeToSupabase,
  syncDocumentToSupabase,
  syncHistoryEventToSupabase,
} from '../lib/supabase';
import {
  playNewLeadChime,
  getLeadsBroadcastChannel,
  broadcastNewLead,
  saveLeadToServer,
  fetchServerLeads,
  syncLeadsToServer,
  fetchServerTrialClasses,
  saveTrialClassToServer,
  deleteLeadFromServer,
  deleteTrialClassFromServer,
} from '../utils/leadsSync';
import {
  saveAthleteToServer,
  updateAthleteOnServer,
  deleteAthleteFromServer,
  fetchServerAthletes,
  syncAthletesToServer,
  saveResponsibleToServer,
  fetchServerResponsibles,
  saveClassToServer,
  updateClassOnServer,
  deleteClassFromServer,
  fetchServerClasses,
  saveMonthlyFeeToServer,
  updateMonthlyFeeOnServer,
  fetchServerMonthlyFees,
  syncMonthlyFeesToServer,
  saveAttendanceToServer,
  fetchServerAttendances,
  saveTrainingSessionToServer,
  fetchServerTrainingSessions,
  saveDocumentToServer,
  deleteDocumentFromServer,
  fetchServerDocuments,
  saveHistoryEventToServer,
  fetchServerHistoryEvents,
  saveExtraRevenueToServer,
  deleteExtraRevenueFromServer,
  fetchServerExtraRevenues,
  saveNegotiationToServer,
  updateNegotiationOnServer,
  fetchServerNegotiations,
} from '../utils/athletesSync';

export type PeriodFilter = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'custom';

interface AppContextType {
  activeModule: NavigationModule;
  setActiveModule: (module: NavigationModule) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (period: PeriodFilter) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;

  // Data Collections
  classes: SoccerClass[];
  responsibles: Responsible[];
  athletes: Athlete[];
  monthlyFees: MonthlyFee[];
  extraRevenues: ExtraRevenue[];
  negotiations: Negotiation[];
  trainingSessions: TrainingSession[];
  attendances: AttendanceRecord[];
  absenceJustifications: AbsenceJustification[];
  leads: TrialLead[];
  trialClasses: TrialClass[];
  events: SportEvent[];
  matches: GameMatch[];
  matchParticipants: MatchParticipant[];
  matchGoals: MatchGoal[];
  evaluations: TechnicalEvaluation[];
  historyEvents: AthleteHistoryEvent[];
  documents: AthleteDocument[];

  // CRUD & Business Logic Functions
  addAthlete: (
    athleteData: Omit<Athlete, 'id' | 'created_at'>,
    responsibleData?: Omit<Responsible, 'id' | 'created_at'>
  ) => { athlete: Athlete; isDuplicateWarning?: boolean };
  updateAthlete: (athleteId: string, updates: Partial<Athlete>) => void;
  deleteAthlete: (athleteId: string) => void;
  changeAthleteClass: (athleteId: string, newClassId: string, reason?: string, registeredBy?: string) => void;
  dischargeAthlete: (athleteId: string, reason?: string, registeredBy?: string) => void;
  cancelAthleteEnrollment: (athleteId: string, reason?: string, registeredBy?: string) => void;
  reEnrollAthlete: (athleteId: string, newClassId?: string, notes?: string, registeredBy?: string) => void;
  
  // Responsible CRUD
  addResponsible: (resp: Omit<Responsible, 'id' | 'created_at'>) => Responsible;
  updateResponsible: (respId: string, updates: Partial<Responsible>) => void;

  // Document Operations
  addDocument: (doc: Omit<AthleteDocument, 'id' | 'uploaded_at'>) => void;
  removeDocument: (docId: string) => void;

  // History Operations
  addHistoryEvent: (event: Omit<AthleteHistoryEvent, 'id' | 'created_at'>) => void;

  // Duplicate Check Helpers
  checkDuplicateAthlete: (cpf?: string, name?: string, birthDate?: string, excludeAthleteId?: string) => Athlete | null;
  checkDuplicateResponsible: (cpf?: string, name?: string, phone?: string, excludeRespId?: string) => Responsible | null;

  // Global search & Quick action triggers
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  isQuickActionOpen: boolean;
  setIsQuickActionOpen: (open: boolean) => void;
  selectedAthleteId: string | null;
  setSelectedAthleteId: (id: string | null) => void;
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;

  // Financial Modal & Quick Actions
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  paymentModalPrefill: {
    feeId?: string;
    revenueId?: string;
    athleteId?: string;
    referenceMonth?: string;
    amount?: number;
    type?: 'MENSALIDADE' | 'EXTRA';
    description?: string;
  } | null;
  openPaymentModal: (prefill?: {
    feeId?: string;
    revenueId?: string;
    athleteId?: string;
    referenceMonth?: string;
    amount?: number;
    type?: 'MENSALIDADE' | 'EXTRA';
    description?: string;
  }) => void;

  // Financial Operations
  registerMonthlyFeePayment: (
    feeId: string,
    paymentMethod: PaymentMethod,
    paymentDate: string,
    cardFeeAmount?: number,
    notes?: string,
    registeredBy?: string
  ) => void;
  createMonthlyFee: (feeData: Omit<MonthlyFee, 'id' | 'created_at'>) => MonthlyFee;
  updateMonthlyFee: (feeId: string, updates: Partial<MonthlyFee>) => void;
  deleteMonthlyFee: (feeId: string) => void;
  generateMonthlyFeesForCompetence: (referenceMonth: string, registeredBy?: string) => { generatedCount: number; skippedCount: number };
  createExtraRevenue: (revenueData: Omit<ExtraRevenue, 'id' | 'created_at'>) => ExtraRevenue;
  updateExtraRevenue: (revenueId: string, updates: Partial<ExtraRevenue>) => void;
  deleteExtraRevenue: (revenueId: string) => void;
  createNegotiation: (params: {
    athleteId: string;
    monthlyFeeIds: string[];
    originalAmount: number;
    discountAmount: number;
    negotiatedAmount: number;
    installmentsCount: number;
    firstDueDate: string;
    notes?: string;
    registeredBy?: string;
  }) => Negotiation;
  payNegotiationInstallment: (
    negotiationId: string,
    installmentId: string,
    paymentMethod: PaymentMethod,
    paymentDate: string,
    cardFeeAmount?: number,
    notes?: string,
    registeredBy?: string
  ) => void;
  updateAthleteFinancialCondition: (
    athleteId: string,
    updates: {
      financial_condition: FinancialCondition;
      custom_monthly_fee?: number;
      discount_type: DiscountType;
      discount_value?: number;
      payment_due_day: number;
      punctuality_discount_enabled?: boolean;
      punctuality_discount_value?: number;
      punctuality_limit_day?: number;
      effectiveDate?: string;
      notes?: string;
      registeredBy?: string;
    }
  ) => void;
  checkAthleteDebts: (athleteId: string) => {
    hasDebts: boolean;
    overdueCount: number;
    overdueTotal: number;
    activeNegotiationsCount: number;
    activeNegotiationsBalance: number;
  };

  // Class CRUD operations
  addClass: (classData: Omit<SoccerClass, 'id' | 'created_at'>) => SoccerClass;
  updateClass: (classId: string, updates: Partial<SoccerClass>) => void;
  toggleClassStatus: (classId: string) => void;
  deleteClass: (classId: string, unenrollAthletes?: boolean) => { success: boolean; message: string };

  // Training & Attendance Operations
  selectedTrainingId: string | null;
  setSelectedTrainingId: (id: string | null) => void;
  addTrainingSession: (sessionData: Omit<TrainingSession, 'id' | 'created_at'>) => TrainingSession;
  updateTrainingSession: (sessionId: string, updates: Partial<TrainingSession>) => void;
  cancelTrainingSession: (sessionId: string, reason: string, rescheduleDate?: string, rescheduleTime?: string) => void;
  saveAttendanceRecords: (
    trainingId: string,
    records: {
      athleteId: string;
      athleteMainClassId?: string;
      status: 'PRESENTE' | 'AUSENTE' | 'NAO_REGISTRADO';
      isGuest?: boolean;
      notes?: string;
      justificationId?: string;
    }[]
  ) => void;
  addAbsenceJustification: (justification: Omit<AbsenceJustification, 'id' | 'created_at'>) => AbsenceJustification;
  removeAbsenceJustification: (justificationId: string) => void;

  // Leads & Trial Classes Operations (Phase 6)
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  refreshLeads: () => Promise<void>;
  checkDuplicateLead: (cpf?: string, name?: string, phone?: string, excludeLeadId?: string) => TrialLead | null;
  addLead: (
    leadData: Omit<TrialLead, 'id' | 'created_at' | 'timeline'>,
    registeredBy?: string
  ) => { lead: TrialLead; isDuplicate?: boolean; duplicateAthlete?: Athlete | null; duplicateLead?: TrialLead | null };
  updateLead: (leadId: string, updates: Partial<TrialLead>, reason?: string, registeredBy?: string) => void;
  updateLeadStage: (leadId: string, newStage: KanbanStage, notes?: string, registeredBy?: string) => void;
  markLeadNonConverted: (leadId: string, reason: NonConversionReason | string, notes?: string, registeredBy?: string) => void;
  reactivateLead: (leadId: string, targetStage?: KanbanStage, notes?: string, registeredBy?: string) => void;
  deleteLead: (leadId: string) => Promise<boolean>;
  deleteTrialClass: (trialClassId: string) => Promise<boolean>;
  addLeadTimelineEvent: (leadId: string, actionType: LeadHistoryItem['action_type'], title: string, description: string, registeredBy?: string) => void;
  scheduleTrialClass: (params: {
    leadId: string;
    classId: string;
    classDate: string;
    classTime: string;
    location?: string;
    notes?: string;
    registeredBy?: string;
    rescheduledFromId?: string;
  }) => { trialClass: TrialClass; warning?: string };
  rescheduleTrialClass: (
    trialClassId: string,
    params: {
      newDate: string;
      newTime: string;
      newClassId?: string;
      reason?: string;
      registeredBy?: string;
    }
  ) => { newTrialClass: TrialClass; originalTrialClass: TrialClass; warning?: string };
  updateTrialClassStatus: (
    trialClassId: string,
    status: TrialClassStatus,
    options?: {
      cancellationReason?: string;
      feedbackDecision?: TrialFeedbackDecision;
      feedbackNotes?: string;
      notes?: string;
      registeredBy?: string;
    }
  ) => void;
  enrollLeadAsAthlete: (params: {
    leadId: string;
    classId: string;
    enrollmentDate: string;
    financialCondition: FinancialCondition;
    customMonthlyFee?: number;
    discountType?: DiscountType;
    discountValue?: number;
    paymentDueDay: number;
    uniformDelivered?: boolean;
    uniformFee?: number;
    uniformPaid?: boolean;
    uniformPaymentMethod?: PaymentMethod;
    uniformCardFeeAmount?: number;
    firstMonthlyFeePaid?: boolean;
    firstMonthlyFeePaymentMethod?: PaymentMethod;
    firstMonthlyFeeCardFeeAmount?: number;
    photoUrl?: string;
    athleteCpf?: string;
    athleteRg?: string;
    athleteBirthDate?: string;
    athleteName?: string;
    responsibleName?: string;
    responsibleCpf?: string;
    responsiblePhone?: string;
    responsibleEmail?: string;
    responsibleRelationship?: string;
    address?: string;
    documents?: Array<{ name: string; document_type: string; file_url?: string; file_size?: string; notes?: string }>;
    notes?: string;
    registeredBy?: string;
  }) => { athlete: Athlete; lead: TrialLead };

  // Fase 7: Módulo de Jogos e Participações Esportivas
  addEvent: (eventData: Omit<SportEvent, 'id' | 'created_at'>) => SportEvent;
  updateEvent: (eventId: string, updates: Partial<SportEvent>) => void;
  deleteEvent: (eventId: string) => { success: boolean; message?: string };
  addMatch: (matchData: Omit<GameMatch, 'id' | 'created_at'>) => { match: GameMatch; isDuplicateWarning?: boolean };
  updateMatch: (matchId: string, updates: Partial<GameMatch>) => void;
  deleteMatch: (matchId: string) => void;
  cancelMatch: (matchId: string, reason?: string) => void;
  setMatchScore: (matchId: string, score_ps: number | null, score_opponent: number | null) => void;
  addMatchParticipant: (matchId: string, athleteId: string, participated?: boolean) => { success: boolean; message?: string };
  toggleMatchParticipant: (participantId: string) => void;
  removeMatchParticipant: (participantId: string) => void;
  setMatchGoal: (matchId: string, athleteId: string, goalsCount: number) => { success: boolean; message?: string };
  removeMatchGoal: (matchId: string, athleteId: string) => void;
  syncMatchRosterAndGoals: (
    matchId: string,
    roster: Array<{ athleteId: string; participated: boolean; goals: number }>
  ) => void;
  getMatchGoalsTotal: (matchId: string) => number;
  getAthleteMatchHistory: (athleteId: string) => {
    matchesRegistered: number;
    participationsCount: number;
    goalsCount: number;
    history: Array<{
      match: GameMatch;
      event?: SportEvent;
      participated: boolean;
      goals: number;
    }>;
  };

  // Fase 8: Módulo de Avaliações e Acompanhamento do Atleta
  addEvaluation: (
    evalData: Omit<TechnicalEvaluation, 'id' | 'created_at'>,
    registeredBy?: string
  ) => TechnicalEvaluation;
  updateEvaluation: (
    evalId: string,
    updates: Partial<TechnicalEvaluation>,
    updatedBy?: string
  ) => void;
  inactivateEvaluation: (
    evalId: string,
    inactivatedBy?: string
  ) => void;
  deleteEvaluation: (evalId: string) => void;
  getAthleteEvaluations: (
    athleteId: string,
    includeInactive?: boolean
  ) => TechnicalEvaluation[];

  // Notification Toast & Central de Notificações
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Importação & Gestão de Dados Reais
  importAthletesBulk: (
    items: Array<{
      athlete: Omit<Athlete, 'id' | 'created_at'>;
      responsible: Omit<Responsible, 'id' | 'created_at'>;
    }>
  ) => Promise<{ count: number; errors: string[] }>;
  importLeadsBulk: (
    items: Array<Omit<TrialLead, 'id' | 'created_at'>>
  ) => Promise<{ count: number; errors: string[] }>;
  clearDemoData: (options?: { keepClasses?: boolean }) => Promise<{ success: boolean; message: string }>;
  restoreDemoData: () => Promise<void>;

  // Dashboard Aggregated Metrics
  dashboardMetrics: {
    totalActiveAthletes: number;
    newAthletesPeriod: number;
    dischargedAthletes: number;
    scholarshipAthletes: number;
    payingAthletes: number;
    totalClasses: number;
    overcapacityClasses: SoccerClass[];
    overallAttendanceRate: number;
    totalAttendances: number;
    presentAttendances: number;
    athletesWithWeeklyAbsences: { athlete: Athlete; absenceCount: number }[];
    totalReceived: number;
    totalToReceive: number;
    totalOverdue: number;
    totalExtraRevenue: number;
    totalExpectedRevenue: number;
    matchesPlayed: number;
    matchesWon: number;
    matchesDrawn: number;
    matchesLost: number;
    goalsScored: number;
    totalLeads: number;
    newLeadsCount: number;
    scheduledTrialClassesCount: number;
    completedTrialClassesCount: number;
    decisionLeadsCount: number;
    enrolledLeadsCount: number;
    nonConvertedLeadsCount: number;
    leadConversionRate: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current_month');
  const [customStartDate, setCustomStartDate] = useState('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState('2026-08-31');

  // Persistence in localStorage
  // Persistence in localStorage
  const [classes, setClasses] = useState<SoccerClass[]>(() => {
    const saved = localStorage.getItem('ps_classes');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return initialClasses || [];
  });

  const sortAthletesAlphabetically = (list: Athlete[]): Athlete[] => {
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  };

  const sortResponsiblesAlphabetically = (list: Responsible[]): Responsible[] => {
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  };

  const [responsibles, setResponsibles] = useState<Responsible[]>(() => {
    const saved = localStorage.getItem('ps_responsibles');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sortResponsiblesAlphabetically(parsed);
      } catch {}
    }
    return [];
  });

  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem('ps_athletes');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sortAthletesAlphabetically(parsed);
      } catch {}
    }
    return [];
  });

  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>(() => {
    const saved = localStorage.getItem('ps_fees');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [extraRevenues, setExtraRevenues] = useState<ExtraRevenue[]>(() => {
    const saved = localStorage.getItem('ps_extra_revenues');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            sale_date: item.sale_date || item.payment_date || new Date().toISOString().substring(0, 10),
            payment_date: item.payment_date || item.sale_date || new Date().toISOString().substring(0, 10),
          }));
        }
      } catch {}
    }
    return [];
  });

  const [negotiations, setNegotiations] = useState<Negotiation[]>(() => {
    const saved = localStorage.getItem('ps_negotiations');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>(() => {
    const saved = localStorage.getItem('ps_trainings');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('ps_attendances');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [absenceJustifications, setAbsenceJustifications] = useState<AbsenceJustification[]>(() => {
    const saved = localStorage.getItem('ps_justifications');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [leads, setLeads] = useState<TrialLead[]>(() => {
    const saved = localStorage.getItem('ps_leads');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [trialClasses, setTrialClasses] = useState<TrialClass[]>(() => {
    const saved = localStorage.getItem('ps_trial_classes');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [events, setEvents] = useState<SportEvent[]>(() => {
    const saved = localStorage.getItem('ps_events');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [matches, setMatches] = useState<GameMatch[]>(() => {
    const normalizeMatchList = (list: any[]): GameMatch[] => {
      const clsList = initialClasses || [];
      return list.map((m) => {
        const targetClass = clsList.find((c) => c.id === m.class_id || c.category === m.category || c.name === m.class_name);
        return {
          ...m,
          match_date: m.match_date || m.date || new Date().toISOString().split('T')[0],
          match_time: m.match_time || m.time || '09:00',
          class_id: m.class_id || targetClass?.id || 'c-1',
          class_name: m.class_name || targetClass?.name || 'Turma Oficial',
          category: m.category || targetClass?.category || 'Sub-11',
        };
      });
    };

    const saved = localStorage.getItem('ps_matches');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return normalizeMatchList(parsed);
      } catch {}
    }
    return [];
  });

  const [matchParticipants, setMatchParticipants] = useState<MatchParticipant[]>(() => {
    const saved = localStorage.getItem('ps_match_participants');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [matchGoals, setMatchGoals] = useState<MatchGoal[]>(() => {
    const saved = localStorage.getItem('ps_match_goals');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [evaluations, setEvaluations] = useState<TechnicalEvaluation[]>(() => {
    const saved = localStorage.getItem('ps_evaluations');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const generateUniqueHistoryId = () =>
    `h-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.floor(Math.random() * 10000)}`;

  const [historyEvents, setHistoryEvents] = useState<AthleteHistoryEvent[]>(() => {
    const saved = localStorage.getItem('ps_history_events');
    let list: AthleteHistoryEvent[] = [];
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }

    const seen = new Set<string>();
    return list.map((item, idx) => {
      let finalId = item.id;
      if (!finalId || seen.has(finalId)) {
        finalId = `h-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 8)}`;
      }
      seen.add(finalId);
      return { ...item, id: finalId };
    });
  });

  const [documents, setDocuments] = useState<AthleteDocument[]>(() => {
    const saved = localStorage.getItem('ps_documents');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // Modals & Selection
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);

  // Financial Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalPrefill, setPaymentModalPrefill] = useState<{
    feeId?: string;
    revenueId?: string;
    athleteId?: string;
    referenceMonth?: string;
    amount?: number;
    type?: 'MENSALIDADE' | 'EXTRA';
    description?: string;
  } | null>(null);

  const openPaymentModal = (prefill?: {
    feeId?: string;
    revenueId?: string;
    athleteId?: string;
    referenceMonth?: string;
    amount?: number;
    type?: 'MENSALIDADE' | 'EXTRA';
    description?: string;
  }) => {
    setPaymentModalPrefill(prefill || null);
    setIsPaymentModalOpen(true);
  };

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Central de Notificações no Cabeçalho
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('ps_app_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ps_app_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Registro de IDs e chaves de leads já notificados para garantir alerta único
  const notifiedLeadKeysRef = React.useRef<Set<string>>((() => {
    const set = new Set<string>();
    try {
      const saved = localStorage.getItem('ps_notified_lead_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((k: string) => set.add(k));
        }
      }
    } catch {}
    return set;
  })());

  const saveNotifiedLeadKeys = () => {
    try {
      localStorage.setItem(
        'ps_notified_lead_keys',
        JSON.stringify(Array.from(notifiedLeadKeysRef.current))
      );
    } catch {}
  };

  // Função central: notifica exatamente UMA ÚNICA VEZ e adiciona à Central de Notificações
  const notifyNewLeadOnce = (lead: TrialLead) => {
    if (!lead || !lead.id) return;
    const idKey = lead.id;
    const nameClean = (lead.athlete_name || '').toLowerCase().trim();
    const phoneClean = (lead.responsible_phone || '').replace(/\D/g, '');
    const signature = `${idKey}__${nameClean}__${phoneClean}`;
    const namePhone = `${nameClean}__${phoneClean}`;

    // Se já notificado por ID, assinatura ou par (nome+telefone), não repetir alerta sonoro/toast!
    if (
      notifiedLeadKeysRef.current.has(idKey) ||
      notifiedLeadKeysRef.current.has(signature) ||
      (namePhone.length > 5 && notifiedLeadKeysRef.current.has(namePhone))
    ) {
      return;
    }

    // Marca imediatamente para não disparar novamente em outros eventos simultâneos
    notifiedLeadKeysRef.current.add(idKey);
    notifiedLeadKeysRef.current.add(signature);
    if (namePhone.length > 5) notifiedLeadKeysRef.current.add(namePhone);
    saveNotifiedLeadKeys();

    // 1. Toca o aviso sonoro uma vez
    playNewLeadChime();

    // 2. Exibe o toast temporário uma vez
    showToast(`🔔 Novo interessado: ${lead.athlete_name} via Formulário Externo!`, 'info');

    // 3. Registra na Central de Notificações para consulta no sino
    addNotification({
      type: 'LEAD',
      title: 'Novo Interessado no Funil',
      message: `${lead.athlete_name} (${lead.responsible_name || 'Responsável'}) preencheu o formulário externo de interessados.`,
      linkModule: 'interessados',
      referenceId: lead.id,
    });
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ps_classes', JSON.stringify(classes));
  }, [classes]);
  useEffect(() => {
    localStorage.setItem('ps_responsibles', JSON.stringify(responsibles));
  }, [responsibles]);
  useEffect(() => {
    localStorage.setItem('ps_athletes', JSON.stringify(athletes));
  }, [athletes]);
  useEffect(() => {
    localStorage.setItem('ps_fees', JSON.stringify(monthlyFees));
  }, [monthlyFees]);
  useEffect(() => {
    localStorage.setItem('ps_extra_revenues', JSON.stringify(extraRevenues));
  }, [extraRevenues]);
  useEffect(() => {
    localStorage.setItem('ps_negotiations', JSON.stringify(negotiations));
  }, [negotiations]);
  useEffect(() => {
    localStorage.setItem('ps_leads', JSON.stringify(leads));
  }, [leads]);
  useEffect(() => {
    localStorage.setItem('ps_trial_classes', JSON.stringify(trialClasses));
  }, [trialClasses]);

  // Função central para recarregar leads do servidor e sincronizar
  const refreshLeads = async () => {
    try {
      const res = await fetchServerLeads();
      const serverLeads = Array.isArray(res) ? res : (res as any)?.leads || [];
      if (serverLeads && Array.isArray(serverLeads)) {
        const cleanServerLeads = serverLeads.filter(
          (l: TrialLead) => !['l-1', 'l-2', 'l-3', 'l-4', 'l-5', 'l-6'].includes(l.id)
        );

        setLeads((prev) => {
          const map = new Map<string, TrialLead>();
          for (const p of prev) {
            if (p && p.id) map.set(p.id, p);
          }

          const newlyDiscovered: TrialLead[] = [];

          for (const sl of cleanServerLeads) {
            if (!sl || !sl.id) continue;

            // Harmonizar leads locais que possuam mesmo nome e telefone para não duplicar
            const slName = (sl.athlete_name || '').toLowerCase().trim();
            const slPhone = (sl.responsible_phone || '').replace(/\D/g, '');
            if (slName && slPhone) {
              for (const [existingId, existingLead] of map.entries()) {
                const eName = (existingLead.athlete_name || '').toLowerCase().trim();
                const ePhone = (existingLead.responsible_phone || '').replace(/\D/g, '');
                if (eName === slName && ePhone === slPhone && existingId !== sl.id) {
                  map.delete(existingId);
                }
              }
            }

            if (!map.has(sl.id)) {
              newlyDiscovered.push(sl);
            }
            map.set(sl.id, { ...(map.get(sl.id) || {}), ...sl });
          }

          // Notifica somente os recém-descobertos que ainda não foram notificados
          if (prev.length > 0 && newlyDiscovered.length > 0) {
            for (const n of newlyDiscovered) {
              notifyNewLeadOnce(n);
            }
          }

          const combined = Array.from(map.values());
          combined.sort(
            (a, b) =>
              new Date(b.created_at || b.entry_date || 0).getTime() -
              new Date(a.created_at || a.entry_date || 0).getTime()
          );

          localStorage.setItem('ps_leads', JSON.stringify(combined));
          return combined;
        });
      }
    } catch (err) {
      console.warn('Erro ao atualizar leads do servidor:', err);
    }
  };

  // Sincronização em tempo real (Servidor Express + BroadcastChannel + LocalStorage + Eventos)
  useEffect(() => {
    let isMounted = true;

    // Pré-carrega leads existentes na lista de notificados para evitar alertas na inicialização
    initialLeads.forEach((l) => {
      if (l && l.id) {
        notifiedLeadKeysRef.current.add(l.id);
        const np = `${(l.athlete_name || '').toLowerCase().trim()}__${(l.responsible_phone || '').replace(/\D/g, '')}`;
        if (np.length > 5) notifiedLeadKeysRef.current.add(np);
      }
    });
    leads.forEach((l) => {
      if (l && l.id) {
        notifiedLeadKeysRef.current.add(l.id);
        const np = `${(l.athlete_name || '').toLowerCase().trim()}__${(l.responsible_phone || '').replace(/\D/g, '')}`;
        if (np.length > 5) notifiedLeadKeysRef.current.add(np);
      }
    });
    saveNotifiedLeadKeys();

    // 1. Carga inicial de leads do servidor
    fetchServerLeads().then((serverList) => {
      if (!isMounted) return;
      const list = Array.isArray(serverList) ? serverList : (serverList as any)?.leads || [];
      if (list && Array.isArray(list)) {
        const cleanList = list.filter(
          (l: TrialLead) => !['l-1', 'l-2', 'l-3', 'l-4', 'l-5', 'l-6'].includes(l.id)
        );
        if (cleanList.length > 0) {
          // Marca leads já presentes no servidor para não alertar retroativamente
          cleanList.forEach((sl: TrialLead) => {
            if (sl && sl.id) {
              notifiedLeadKeysRef.current.add(sl.id);
              const np = `${(sl.athlete_name || '').toLowerCase().trim()}__${(sl.responsible_phone || '').replace(/\D/g, '')}`;
              if (np.length > 5) notifiedLeadKeysRef.current.add(np);
            }
          });
          saveNotifiedLeadKeys();

          setLeads((prev) => {
            const map = new Map<string, TrialLead>();
            for (const p of prev) {
              if (p.id) map.set(p.id, p);
            }
            for (const sl of cleanList) {
              map.set(sl.id, sl);
            }
            // Deduplicate by composite key
            const seenKeys = new Set<string>();
            const combined: TrialLead[] = [];
            for (const lead of Array.from(map.values())) {
              const nameKey = (lead.athlete_name || '').toLowerCase().trim();
              const phoneKey = (lead.responsible_phone || '').replace(/\D/g, '');
              const key = `${nameKey}__${phoneKey}`;
              if (nameKey && phoneKey && seenKeys.has(key)) {
                continue;
              }
              if (nameKey && phoneKey) seenKeys.add(key);
              combined.push(lead);
            }
            combined.sort(
              (a, b) => new Date(b.created_at || b.entry_date || 0).getTime() - new Date(a.created_at || a.entry_date || 0).getTime()
            );
            localStorage.setItem('ps_leads', JSON.stringify(combined));
            return combined;
          });
        }
      }
    });

    // 1b. Carga inicial de aulas experimentais do servidor
    fetchServerTrialClasses().then((serverClasses) => {
      if (!isMounted) return;
      const list = Array.isArray(serverClasses) ? serverClasses : (serverClasses as any)?.trialClasses || [];
      if (list && Array.isArray(list)) {
        const cleanTrialClasses = list.filter(
          (tc: TrialClass) => !['tc-1', 'tc-2', 'tc-3'].includes(tc.id)
        );
        if (cleanTrialClasses.length > 0) {
          setTrialClasses(cleanTrialClasses);
          localStorage.setItem('ps_trial_classes', JSON.stringify(cleanTrialClasses));
        }
      }
    });

    // 1c. Carga inicial de atletas do servidor
    fetchServerAthletes().then((serverAthletes) => {
      if (!isMounted) return;
      if (serverAthletes && Array.isArray(serverAthletes) && serverAthletes.length > 0) {
        setAthletes((prev) => {
          const map = new Map<string, Athlete>();
          for (const a of prev) {
            if (a.id) map.set(a.id, a);
          }
          for (const sa of serverAthletes) {
            if (sa.id) {
              const current = map.get(sa.id);
              map.set(sa.id, current ? { ...sa, ...current } : sa);
            }
          }
          return sortAthletesAlphabetically(Array.from(map.values()));
        });
      }
    });

    // 1d. Carga inicial de responsáveis do servidor
    fetchServerResponsibles().then((serverResp) => {
      if (!isMounted) return;
      if (serverResp && Array.isArray(serverResp) && serverResp.length > 0) {
        setResponsibles((prev) => {
          const map = new Map<string, Responsible>();
          for (const r of prev) {
            if (r.id) map.set(r.id, r);
          }
          for (const sr of serverResp) {
            if (sr.id) {
              const current = map.get(sr.id);
              map.set(sr.id, current ? { ...sr, ...current } : sr);
            }
          }
          return sortResponsiblesAlphabetically(Array.from(map.values()));
        });
      }
    });

    // 1e. Carga inicial de turmas do servidor
    fetchServerClasses().then((serverClassesList) => {
      if (!isMounted) return;
      if (serverClassesList && Array.isArray(serverClassesList) && serverClassesList.length > 0) {
        setClasses((prev) => {
          const map = new Map<string, SoccerClass>();
          for (const c of prev) {
            if (c.id) map.set(c.id, c);
          }
          for (const sc of serverClassesList) {
            if (sc.id) {
              const current = map.get(sc.id);
              map.set(sc.id, current ? { ...sc, ...current } : sc);
            }
          }
          return Array.from(map.values());
        });
      }
    });

    // 1f. Carga inicial de mensalidades do servidor
    fetchServerMonthlyFees().then((serverFeesList) => {
      if (!isMounted) return;
      if (serverFeesList && Array.isArray(serverFeesList) && serverFeesList.length > 0) {
        setMonthlyFees((prev) => {
          const map = new Map<string, MonthlyFee>();
          for (const f of prev) {
            if (f.id) map.set(f.id, f);
          }
          for (const sf of serverFeesList) {
            if (sf.id) {
              const current = map.get(sf.id);
              map.set(sf.id, current ? { ...sf, ...current } : sf);
            }
          }
          return Array.from(map.values());
        });
      }
    });

    // 1g. Carga inicial de documentos do servidor
    fetchServerDocuments().then((serverDocsList) => {
      if (!isMounted) return;
      if (serverDocsList && Array.isArray(serverDocsList) && serverDocsList.length > 0) {
        setDocuments((prev) => {
          const map = new Map<string, AthleteDocument>();
          for (const d of prev) {
            if (d.id) map.set(d.id, d);
          }
          for (const sd of serverDocsList) {
            if (sd.id) {
              const current = map.get(sd.id);
              map.set(sd.id, current ? { ...sd, ...current } : sd);
            }
          }
          return Array.from(map.values());
        });
      }
    });

    // 1h. Carga inicial de histórico do servidor
    fetchServerHistoryEvents().then((serverHistoryList) => {
      if (!isMounted) return;
      if (serverHistoryList && Array.isArray(serverHistoryList) && serverHistoryList.length > 0) {
        setHistoryEvents((prev) => {
          const map = new Map<string, AthleteHistoryEvent>();
          for (const h of prev) {
            if (h.id) map.set(h.id, h);
          }
          for (const sh of serverHistoryList) {
            if (sh.id) {
              const current = map.get(sh.id);
              map.set(sh.id, current ? { ...sh, ...current } : sh);
            }
          }
          return Array.from(map.values());
        });
      }
    });

    // 2. Polling inteligente a cada 4 segundos para captar formulários externos
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshLeads();
      }
    }, 4000);

    // 3. Checagem imediata ao focar na janela do navegador ou alternar visibilidade
    const handleFocus = () => refreshLeads();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshLeads();
      }
    };

    // 4. BroadcastChannel para sincronização instantânea entre abas
    const channel = getLeadsBroadcastChannel();
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_LEAD' && event.data.lead) {
          const newLead = event.data.lead as TrialLead;
          setLeads((prev) => {
            if (prev.some((l) => l.id === newLead.id)) return prev;
            return [newLead, ...prev];
          });
          notifyNewLeadOnce(newLead);
        }
      };
    }

    // 5. Storage Event fallback
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ps_leads' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLeads((prev) => {
              const map = new Map<string, TrialLead>();
              for (const l of prev) map.set(l.id, l);
              for (const pl of parsed) {
                if (!map.has(pl.id)) {
                  map.set(pl.id, pl);
                  notifyNewLeadOnce(pl);
                }
              }
              return Array.from(map.values());
            });
          }
        } catch {}
      }
    };

    // 6. CustomEvent para atualizações locais na mesma aba
    const handleCustomLead = (e: Event) => {
      const customEvent = e as CustomEvent<TrialLead>;
      if (customEvent.detail) {
        const newLead = customEvent.detail;
        setLeads((prev) => {
          if (prev.some((l) => l.id === newLead.id)) return prev;
          return [newLead, ...prev];
        });
        notifyNewLeadOnce(newLead);
      }
    };

    window.addEventListener('focus', handleFocus);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ps_lead_created', handleCustomLead);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ps_lead_created', handleCustomLead);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('ps_trial_classes', JSON.stringify(trialClasses));
  }, [trialClasses]);
  useEffect(() => {
    localStorage.setItem('ps_events', JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    localStorage.setItem('ps_matches', JSON.stringify(matches));
  }, [matches]);
  useEffect(() => {
    localStorage.setItem('ps_match_participants', JSON.stringify(matchParticipants));
  }, [matchParticipants]);
  useEffect(() => {
    localStorage.setItem('ps_match_goals', JSON.stringify(matchGoals));
  }, [matchGoals]);
  useEffect(() => {
    localStorage.setItem('ps_evaluations', JSON.stringify(evaluations));
  }, [evaluations]);
  useEffect(() => {
    localStorage.setItem('ps_history_events', JSON.stringify(historyEvents));
  }, [historyEvents]);
  useEffect(() => {
    localStorage.setItem('ps_documents', JSON.stringify(documents));
  }, [documents]);

  // Duplicate Check Helpers
  const checkDuplicateAthlete = (
    cpf?: string,
    name?: string,
    birthDate?: string,
    excludeAthleteId?: string
  ): Athlete | null => {
    const cleanCpf = cleanDigits(cpf);
    const normalizedName = (name || '').trim().toLowerCase();

    for (const a of athletes) {
      if (excludeAthleteId && a.id === excludeAthleteId) continue;
      
      // Check CPF match if CPF is given
      if (cleanCpf && cleanCpf.length >= 11) {
        if (cleanDigits(a.cpf) === cleanCpf) {
          return a;
        }
      }

      // Check Name + BirthDate
      if (normalizedName && birthDate) {
        if (a.name.trim().toLowerCase() === normalizedName && a.birth_date === birthDate) {
          return a;
        }
      }
    }
    return null;
  };

  const checkDuplicateResponsible = (
    cpf?: string,
    name?: string,
    phone?: string,
    excludeRespId?: string
  ): Responsible | null => {
    const cleanCpf = cleanDigits(cpf);
    const cleanPhone = cleanDigits(phone);
    const normalizedName = (name || '').trim().toLowerCase();

    for (const r of responsibles) {
      if (excludeRespId && r.id === excludeRespId) continue;

      if (cleanCpf && cleanCpf.length >= 11) {
        if (cleanDigits(r.cpf) === cleanCpf) {
          return r;
        }
      }

      if (normalizedName && cleanPhone && cleanPhone.length >= 8) {
        if (r.name.trim().toLowerCase() === normalizedName && cleanDigits(r.phone) === cleanPhone) {
          return r;
        }
      }
    }
    return null;
  };

  // Add or Link Responsible
  const addResponsible = (respData: Omit<Responsible, 'id' | 'created_at'>): Responsible => {
    // Check if matching responsible already exists
    const existing = checkDuplicateResponsible(respData.cpf, respData.name, respData.phone);
    if (existing) {
      return existing;
    }

    const newResp: Responsible = {
      ...respData,
      id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    };

    setResponsibles((prev) => [newResp, ...prev]);
    saveResponsibleToServer(newResp).catch(() => {});
    syncResponsibleToSupabase(newResp).catch(() => {});
    return newResp;
  };

  const updateResponsible = (respId: string, updates: Partial<Responsible>) => {
    setResponsibles((prev) =>
      prev.map((r) => {
        if (r.id === respId) {
          const updated = { ...r, ...updates, updated_at: new Date().toISOString() };
          saveResponsibleToServer(updated).catch(() => {});
          syncResponsibleToSupabase(updated).catch(() => {});
          return updated;
        }
        return r;
      })
    );

    // Sync denormalized responsible info on linked athletes
    if (updates.name || updates.phone) {
      setAthletes((prev) =>
        prev.map((a) => {
          if (a.responsible_id === respId) {
            return {
              ...a,
              responsible_name: updates.name || a.responsible_name,
              responsible_phone: updates.phone || a.responsible_phone,
            };
          }
          return a;
        })
      );
    }

    showToast('Dados do responsável atualizados com sucesso.', 'success');
  };

  // Add Athlete
  const addAthlete = (
    athleteData: Omit<Athlete, 'id' | 'created_at'>,
    responsibleData?: Omit<Responsible, 'id' | 'created_at'>
  ) => {
    // 1. Resolve Class
    const targetClassId = athleteData.current_class_id || (athleteData as any).class_id;
    const targetClass = classes.find((c) => c.id === targetClassId);

    // 2. Resolve Responsible
    let finalResponsibleId = athleteData.responsible_id;
    let finalRespName = (athleteData as any).responsible_name;
    let finalRespPhone = (athleteData as any).responsible_phone;

    if (!finalResponsibleId && responsibleData) {
      const createdResp = addResponsible(responsibleData);
      finalResponsibleId = createdResp.id;
      finalRespName = createdResp.name;
      finalRespPhone = createdResp.phone;
      saveResponsibleToServer(createdResp).catch(() => {});
    } else if (finalResponsibleId) {
      const foundResp = responsibles.find((r) => r.id === finalResponsibleId);
      if (foundResp) {
        finalRespName = foundResp.name;
        finalRespPhone = foundResp.phone;
      }
    }

    const newAthleteId = `a-${Date.now()}`;
    const newAthlete: Athlete = {
      ...athleteData,
      id: newAthleteId,
      current_class_id: targetClassId || '',
      class_id: targetClassId || '',
      class_name: targetClass?.name || 'Turma Definida',
      category: targetClass?.category || 'Geral',
      responsible_id: finalResponsibleId,
      responsible_name: finalRespName,
      responsible_phone: finalRespPhone,
      created_at: new Date().toISOString(),
    };

    setAthletes((prev) => sortAthletesAlphabetically([...prev, newAthlete]));

    // Persist to Server Database (Cloud SQL & local cache)
    saveAthleteToServer(newAthlete).catch((err) => {
      console.warn('[SYNC] Could not post athlete to server API:', err);
    });

    // Sync to Supabase Database
    syncAthleteToSupabase(newAthlete).catch((err) => {
      console.warn('[SUPABASE] Could not sync athlete to Supabase:', err);
    });

    // Record initial enrollment history event
    const className = targetClass?.name || 'Turma Definida';
    const enrollmentEvent: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: newAthleteId,
      event_type: 'MATRICULA',
      description: `Matrícula inicial realizada com sucesso na turma ${className}.`,
      new_value: className,
      event_date: newAthlete.enrollment_date || new Date().toISOString().split('T')[0],
      registered_by: 'Administração',
      created_at: new Date().toISOString(),
    };

    setHistoryEvents((prev) => [enrollmentEvent, ...prev]);
    showToast('Atleta cadastrado com sucesso!', 'success');

    return { athlete: newAthlete };
  };

  // Update Athlete
  const updateAthlete = (athleteId: string, updates: Partial<Athlete>) => {
    let additional: Partial<Athlete> = {};
    const targetClassId = updates.current_class_id || (updates as any).class_id;
    if (targetClassId) {
      const cls = classes.find((c) => c.id === targetClassId);
      if (cls) {
        additional.class_id = cls.id;
        additional.class_name = cls.name;
        additional.category = cls.category;
      }
    }
    if (updates.responsible_id) {
      const resp = responsibles.find((r) => r.id === updates.responsible_id);
      if (resp) {
        additional.responsible_name = resp.name;
        additional.responsible_phone = resp.phone;
      }
    }

    const mergedUpdates = { ...updates, ...additional };

    let updatedFullAthlete: Athlete | null = null;
    setAthletes((prev) =>
      prev.map((a) => {
        if (a.id === athleteId) {
          updatedFullAthlete = { ...a, ...mergedUpdates };
          return updatedFullAthlete;
        }
        return a;
      })
    );

    // Persist updates to server
    updateAthleteOnServer(athleteId, mergedUpdates).catch((err) => {
      console.warn('[SYNC] Could not update athlete on server API:', err);
    });

    // Sync updates to Supabase
    if (updatedFullAthlete) {
      syncAthleteToSupabase(updatedFullAthlete).catch(() => {});
    }

    showToast('Dados do atleta atualizados com sucesso.', 'success');
  };

  // Delete Athlete
  const deleteAthlete = (athleteId: string) => {
    setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    if (selectedAthleteId === athleteId) {
      setSelectedAthleteId(null);
    }
    deleteAthleteFromServer(athleteId).catch((err) => {
      console.warn('[SYNC] Could not delete athlete on server API:', err);
    });

    // Delete from Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('athletes').delete().eq('id', athleteId).then(() => {});
    }

    showToast('Atleta excluído com sucesso.', 'info');
  };

  // Change Athlete Class (Preserves all history & records event)
  const changeAthleteClass = (
    athleteId: string,
    newClassId: string,
    reason?: string,
    registeredBy: string = 'Comissão Técnica / Secretaria'
  ) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) return;

    const oldClass = classes.find((c) => c.id === athlete.current_class_id);
    const newClass = classes.find((c) => c.id === newClassId);

    const oldClassName = oldClass?.name || 'Turma Anterior';
    const newClassName = newClass?.name || 'Nova Turma';

    // Update athlete's current class without touching attendance or history
    setAthletes((prev) =>
      prev.map((a) =>
        a.id === athleteId
          ? {
              ...a,
              current_class_id: newClassId,
              class_id: newClassId,
              class_name: newClassName,
              category: newClass?.category || a.category,
            }
          : a
      )
    );

    // Persist to server
    updateAthleteOnServer(athleteId, {
      current_class_id: newClassId,
      class_id: newClassId,
      class_name: newClassName,
      category: newClass?.category,
    }).catch(() => {});

    // Register history event
    const historyEvent: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: athleteId,
      event_type: 'TROCA_TURMA',
      description: `Troca de turma efetuada de "${oldClassName}" para "${newClassName}".${reason ? ` Motivo: ${reason}` : ''}`,
      old_value: oldClassName,
      new_value: newClassName,
      event_date: new Date().toISOString().split('T')[0],
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    setHistoryEvents((prev) => [historyEvent, ...prev]);
    showToast(`Turma alterada para ${newClassName} com sucesso!`, 'success');
  };

  // Discharge Athlete (Does not delete, changes status to DESLIGADO and records event)
  const dischargeAthlete = (
    athleteId: string,
    reason?: string,
    registeredBy: string = 'Administração'
  ) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) return;

    setAthletes((prev) =>
      prev.map((a) => (a.id === athleteId ? { ...a, status: 'DESLIGADO' } : a))
    );

    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: athleteId,
      event_type: 'DESLIGAMENTO',
      description: `Atleta desligado do Centro de Treinamento.${reason ? ` Motivo: ${reason}` : ''}`,
      event_date: new Date().toISOString().split('T')[0],
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    setHistoryEvents((prev) => [event, ...prev]);
    showToast('Atleta desligado. Cadastro preservado para histórico e futura rematrícula.', 'info');
  };

  // Cancel Athlete Class Enrollment (Removes athlete from class without deleting from database)
  const cancelAthleteEnrollment = (
    athleteId: string,
    reason?: string,
    registeredBy: string = 'Coordenação / Secretaria'
  ) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) return;

    const currentClass = classes.find((c) => c.id === athlete.current_class_id || c.id === athlete.class_id);
    const className = currentClass?.name || athlete.class_name || 'Turma';

    const updates: Partial<Athlete> = {
      status: 'DESLIGADO',
      current_class_id: '',
      class_id: '',
      class_name: '',
    };

    setAthletes((prev) =>
      prev.map((a) => (a.id === athleteId ? { ...a, ...updates } : a))
    );

    updateAthleteOnServer(athleteId, updates).catch(() => {});

    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: athleteId,
      event_type: 'DESLIGAMENTO',
      description: `Matrícula cancelada na turma "${className}". Aluno desvinculado e mantido no banco de dados.${reason ? ` Motivo: ${reason}` : ''}`,
      old_value: className,
      new_value: 'Desvinculado (Cadastro Preservado no Banco)',
      event_date: new Date().toISOString().split('T')[0],
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    setHistoryEvents((prev) => [event, ...prev]);
    showToast(`Matrícula de ${athlete.name} cancelada com sucesso. Cadastro mantido no banco de dados.`, 'info');
  };

  // Re-Enroll Athlete
  const reEnrollAthlete = (
    athleteId: string,
    newClassId?: string,
    notes?: string,
    registeredBy: string = 'Secretaria'
  ) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) return;

    const targetClassId = newClassId || athlete.current_class_id;
    const targetClass = classes.find((c) => c.id === targetClassId);
    const className = targetClass?.name || 'Turma Ativa';

    setAthletes((prev) =>
      prev.map((a) =>
        a.id === athleteId
          ? {
              ...a,
              status: 'ATIVO',
              current_class_id: targetClassId,
            }
          : a
      )
    );

    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: athleteId,
      event_type: 'REMATRICULA',
      description: `Rematrícula realizada com sucesso na turma ${className}.${notes ? ` Observações: ${notes}` : ''}`,
      new_value: className,
      event_date: new Date().toISOString().split('T')[0],
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    setHistoryEvents((prev) => [event, ...prev]);
    showToast(`Atleta rematriculado com sucesso na turma ${className}!`, 'success');
  };

  // Add Document
  const addDocument = (docData: Omit<AthleteDocument, 'id' | 'uploaded_at'>) => {
    const newDoc: AthleteDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
      uploaded_at: new Date().toISOString(),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    saveDocumentToServer(newDoc).catch(() => {});
    syncDocumentToSupabase(newDoc).catch(() => {});

    // Record history event
    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: docData.athlete_id,
      event_type: 'DOCUMENTO_ANEXADO',
      description: `Documento anexado: "${docData.file_name}" (${docData.file_type}).`,
      event_date: new Date().toISOString().split('T')[0],
      registered_by: 'Secretaria',
      created_at: new Date().toISOString(),
    };
    setHistoryEvents((prev) => [event, ...prev]);
    saveHistoryEventToServer(event).catch(() => {});
    syncHistoryEventToSupabase(event).catch(() => {});

    showToast('Documento anexado com sucesso!', 'success');
  };

  const removeDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    deleteDocumentFromServer(docId).catch(() => {});
    if (isSupabaseConfigured && supabase) {
      supabase.from('athlete_documents').delete().eq('id', docId).then(() => {});
    }
    showToast('Documento removido.', 'info');
  };

  const addHistoryEvent = (eventData: Omit<AthleteHistoryEvent, 'id' | 'created_at'>) => {
    const newEvent: AthleteHistoryEvent = {
      ...eventData,
      id: generateUniqueHistoryId(),
      created_at: new Date().toISOString(),
    };
    setHistoryEvents((prev) => [newEvent, ...prev]);
    saveHistoryEventToServer(newEvent).catch(() => {});
    syncHistoryEventToSupabase(newEvent).catch(() => {});
  };

  // =========================================================================
  // FASE 6: INTERESSADOS, AULA EXPERIMENTAL E MATRÍCULA
  // =========================================================================

  const checkDuplicateLead = (
    cpf?: string,
    name?: string,
    phone?: string,
    excludeLeadId?: string
  ): TrialLead | null => {
    const cleanCpfVal = cleanDigits(cpf);
    const cleanPhoneVal = cleanDigits(phone);
    const normName = (name || '').trim().toLowerCase();

    for (const l of leads) {
      if (excludeLeadId && l.id === excludeLeadId) continue;

      if (cleanCpfVal && cleanCpfVal.length >= 11) {
        if (cleanDigits(l.athlete_cpf) === cleanCpfVal || cleanDigits(l.responsible_cpf) === cleanCpfVal) {
          return l;
        }
      }

      if (normName && cleanPhoneVal && cleanPhoneVal.length >= 8) {
        if (
          (l.athlete_name.trim().toLowerCase() === normName || l.responsible_name.trim().toLowerCase() === normName) &&
          cleanDigits(l.responsible_phone) === cleanPhoneVal
        ) {
          return l;
        }
      }

      if (normName && l.athlete_name.trim().toLowerCase() === normName && l.stage !== 'NAO_CONVERTIDO') {
        return l;
      }
    }
    return null;
  };

  const addLead = (
    leadData: Omit<TrialLead, 'id' | 'created_at' | 'timeline'> & {
      id?: string;
      timeline?: LeadHistoryItem[];
      created_at?: string;
    },
    registeredBy: string = 'Recepção / Sistema'
  ) => {
    // Duplicate check
    const dupAthlete = checkDuplicateAthlete(leadData.athlete_cpf, leadData.athlete_name, leadData.athlete_birth_date);
    const dupLead = checkDuplicateLead(leadData.athlete_cpf, leadData.athlete_name, leadData.responsible_phone, leadData.id);
    const isDuplicate = !!(dupAthlete || dupLead);

    const newLeadId = leadData.id || `l-${Date.now()}`;
    const entryDate = leadData.entry_date || new Date().toISOString().split('T')[0];

    const isExternal = leadData.source === 'FORMULARIO_EXTERNO';
    const initialTimelineEvent: LeadHistoryItem =
      leadData.timeline && leadData.timeline.length > 0
        ? leadData.timeline[0]
        : {
            id: `lt-${Date.now()}-1`,
            lead_id: newLeadId,
            action_type: isExternal ? 'FORMULARIO_RECEBIDO' : 'CRIACAO',
            title: isExternal ? 'Formulário Online Recebido' : 'Interessado Cadastrado',
            description: isExternal
              ? `Inscrição externa recebida para ${leadData.athlete_name}. Origem: Formulário de Captação.`
              : `Cadastro inicial de interessado realizado por ${registeredBy}. Origem: ${leadData.source || 'Não especificada'}.`,
            new_stage: leadData.stage || 'NOVO',
            registered_by: registeredBy,
            created_at: new Date().toISOString(),
          };

    const newLead: TrialLead = {
      ...leadData,
      id: newLeadId,
      entry_date: entryDate,
      last_activity_date: entryDate,
      timeline: leadData.timeline && leadData.timeline.length > 0 ? leadData.timeline : [initialTimelineEvent],
      created_at: leadData.created_at || new Date().toISOString(),
    };

    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);

    // Registrar chave para evitar repetição de alertas no polling posterior
    notifiedLeadKeysRef.current.add(newLead.id);
    const np = `${(newLead.athlete_name || '').toLowerCase().trim()}__${(newLead.responsible_phone || '').replace(/\D/g, '')}`;
    if (np.length > 5) notifiedLeadKeysRef.current.add(np);
    saveNotifiedLeadKeys();

    // Salvar no servidor Express persistente e propagar entre abas
    saveLeadToServer(newLead).catch((err) => console.warn('Erro ao salvar no servidor:', err));
    broadcastNewLead(newLead);

    if (isDuplicate) {
      showToast(`Atenção: Possível duplicidade identificada para ${newLead.athlete_name}. Registro criado com alerta.`, 'info');
    } else {
      showToast(`Interessado ${newLead.athlete_name} cadastrado com sucesso!`, 'success');
    }

    return {
      lead: newLead,
      isDuplicate,
      duplicateAthlete: dupAthlete,
      duplicateLead: dupLead,
    };
  };

  const updateLead = (
    leadId: string,
    updates: Partial<TrialLead>,
    reason?: string,
    registeredBy: string = 'Coordenação'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedLeadObj: TrialLead | null = null;
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;

        const updatedLead = {
          ...lead,
          ...updates,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        };
        updatedLeadObj = updatedLead;
        return updatedLead;
      })
    );
    if (updatedLeadObj) {
      saveLeadToServer(updatedLeadObj).catch((err) => console.warn('Erro ao salvar no servidor:', err));
    }
    showToast('Dados do interessado atualizados com sucesso.', 'success');
  };

  const addLeadTimelineEvent = (
    leadId: string,
    actionType: LeadHistoryItem['action_type'],
    title: string,
    description: string,
    registeredBy: string = 'Coordenação'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const newEvent: LeadHistoryItem = {
      id: `lt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      lead_id: leadId,
      action_type: actionType,
      title,
      description,
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    let updatedLeadObj: TrialLead | null = null;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const updated = {
          ...l,
          last_activity_date: today,
          timeline: [newEvent, ...(l.timeline || [])],
        };
        updatedLeadObj = updated;
        return updated;
      })
    );
    if (updatedLeadObj) {
      saveLeadToServer(updatedLeadObj).catch((err) => console.warn('Erro ao salvar no servidor:', err));
    }
  };

  const updateLeadStage = (
    leadId: string,
    newStage: KanbanStage,
    notes?: string,
    registeredBy: string = 'Coordenação'
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const previousStage = lead.stage;
    if (previousStage === newStage) return;

    const today = new Date().toISOString().split('T')[0];
    const stageLabels: Record<KanbanStage, string> = {
      NOVO: 'Novo Contato',
      NOVO_INTERESSADO: 'Novo Contato',
      CONTATO_REALIZADO: 'Novo Contato',
      AULA_AGENDADA: 'Aula Agendada',
      AULA_REALIZADA: 'Aula Agendada',
      EM_DECISAO: 'Aula Agendada',
      AGUARDANDO_DECISAO: 'Aula Agendada',
      MATRICULADO: 'Matriculado',
      NAO_CONVERTIDO: 'Arquivado / Não Convertido',
      ENCERRADO: 'Arquivado / Não Convertido',
    };

    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: leadId,
      action_type: 'MUDANCA_ETAPA',
      title: `Mudança de Etapa: ${stageLabels[newStage] || newStage}`,
      description: `Lead avançou de "${stageLabels[previousStage] || previousStage}" para "${stageLabels[newStage] || newStage}".${notes ? ` Obs: ${notes}` : ''}`,
      previous_stage: previousStage,
      new_stage: newStage,
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    const updatedLead: TrialLead = {
      ...lead,
      stage: newStage,
      last_activity_date: today,
      timeline: [timelineItem, ...(lead.timeline || [])],
    };

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? updatedLead : l))
    );

    saveLeadToServer(updatedLead).catch((err) =>
      console.warn('Erro ao salvar no servidor:', err)
    );

    showToast(`Etapa alterada para "${stageLabels[newStage] || newStage}"!`, 'success');
  };

  const markLeadNonConverted = (
    leadId: string,
    reason: NonConversionReason | string,
    notes?: string,
    registeredBy: string = 'Coordenação'
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const reasonLabels: Record<string, string> = {
      DESISTENCIA: 'Desistência do Responsável',
      SEM_INTERESSE: 'Sem Interesse / Não Respondeu',
      VALOR: 'Valor da Mensalidade',
      HORARIO: 'Choque de Horários',
      OUTRA_ESCOLINHA: 'Optou por outra escolinha',
      NAO_INFORMADO: 'Não informado',
      OUTRO: 'Outro motivo',
    };

    const reasonText = reasonLabels[reason] || reason;
    const today = new Date().toISOString().split('T')[0];

    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: leadId,
      action_type: 'NAO_CONVERTIDO',
      title: `Não Convertido - ${reasonText}`,
      description: `Interessado arquivado como não convertido. Motivo: ${reasonText}.${notes ? ` Detalhes: ${notes}` : ''}`,
      previous_stage: lead.stage,
      new_stage: 'NAO_CONVERTIDO',
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    const updatedLead: TrialLead = {
      ...lead,
      stage: 'NAO_CONVERTIDO',
      non_conversion_reason: reason,
      non_conversion_notes: notes,
      last_activity_date: today,
      timeline: [timelineItem, ...(lead.timeline || [])],
    };

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? updatedLead : l))
    );

    saveLeadToServer(updatedLead).catch((err) =>
      console.warn('Erro ao salvar no servidor:', err)
    );

    showToast(`Interessado marcado como Não Convertido (${reasonText}).`, 'info');
  };

  const reactivateLead = (
    leadId: string,
    targetStage: KanbanStage = 'NOVO',
    notes?: string,
    registeredBy: string = 'Coordenação'
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const today = new Date().toISOString().split('T')[0];
    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: leadId,
      action_type: 'REATIVADO',
      title: 'Interessado Reativado',
      description: `Lead reativado no funil na etapa "${targetStage}".${notes ? ` Motivo da reabertura: ${notes}` : ''} Todo o histórico anterior foi preservado.`,
      previous_stage: lead.stage,
      new_stage: targetStage,
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    const updatedLead: TrialLead = {
      ...lead,
      stage: targetStage,
      non_conversion_reason: undefined,
      non_conversion_notes: undefined,
      last_activity_date: today,
      timeline: [timelineItem, ...(lead.timeline || [])],
    };

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? updatedLead : l))
    );

    saveLeadToServer(updatedLead).catch((err) =>
      console.warn('Erro ao salvar no servidor:', err)
    );

    showToast('Interessado reativado com sucesso com histórico preservado!', 'success');
  };

  const deleteLead = async (leadId: string): Promise<boolean> => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setTrialClasses((prev) => prev.filter((tc) => tc.lead_id !== leadId));
    try {
      await deleteLeadFromServer(leadId);
    } catch (err) {
      console.warn('Erro ao excluir interessado no servidor:', err);
    }
    showToast('Interessado excluído com sucesso.', 'info');
    return true;
  };

  const deleteTrialClass = async (trialClassId: string): Promise<boolean> => {
    setTrialClasses((prev) => prev.filter((tc) => tc.id !== trialClassId));
    try {
      await deleteTrialClassFromServer(trialClassId);
    } catch (err) {
      console.warn('Erro ao excluir aula experimental no servidor:', err);
    }
    showToast('Aula experimental excluída com sucesso.', 'info');
    return true;
  };

  const scheduleTrialClass = (params: {
    leadId: string;
    classId: string;
    classDate: string;
    classTime: string;
    location?: string;
    notes?: string;
    registeredBy?: string;
    rescheduledFromId?: string;
  }) => {
    const targetClass = classes.find((c) => c.id === params.classId);
    const targetLead = leads.find((l) => l.id === params.leadId);

    const className = targetClass?.name || 'Turma Selecionada';
    const coachOrLoc = params.location || targetClass?.location || 'Campo Principal';

    // Check capacity warning (30 is recommended max)
    const currentOccupants = athletes.filter(
      (a) => a.current_class_id === params.classId && a.status === 'ATIVO'
    ).length;
    let warning: string | undefined;
    if (targetClass && currentOccupants >= targetClass.capacity_recommended) {
      warning = `Aviso: A turma ${className} já atingiu a capacidade recomendada (${currentOccupants}/${targetClass.capacity_recommended} atletas). A aula experimental pode gerar sobrecarga.`;
    }

    const newTrialId = `tc-${Date.now()}`;
    const newTrialClass: TrialClass = {
      id: newTrialId,
      lead_id: params.leadId,
      athlete_name: targetLead?.athlete_name || 'Atleta Interessado',
      class_id: params.classId,
      class_name: className,
      class_date: params.classDate,
      class_time: params.classTime,
      location: coachOrLoc,
      status: 'AGENDADA',
      attended: false,
      rescheduled_from_id: params.rescheduledFromId,
      notes: params.notes,
      registered_by: params.registeredBy || 'Coordenação',
      created_at: new Date().toISOString(),
    };

    setTrialClasses((prev) => [newTrialClass, ...prev]);
    saveTrialClassToServer(newTrialClass).catch(() => {});

    // Update lead stage and timeline
    const today = new Date().toISOString().split('T')[0];
    const formattedDate = params.classDate.split('-').reverse().join('/');
    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: params.leadId,
      action_type: 'AULA_AGENDADA',
      title: `Aula Experimental Agendada - ${className}`,
      description: `Aula agendada para ${formattedDate} às ${params.classTime} (${className} - ${coachOrLoc}).${params.notes ? ` Obs: ${params.notes}` : ''}`,
      new_stage: 'AULA_AGENDADA',
      registered_by: params.registeredBy || 'Coordenação',
      created_at: new Date().toISOString(),
    };

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== params.leadId) return l;
        const nextStage: KanbanStage =
          l.stage === 'NOVO' || l.stage === 'CONTATO_REALIZADO' ? 'AULA_AGENDADA' : l.stage;

        return {
          ...l,
          stage: nextStage,
          interest_class_id: params.classId,
          interest_class_name: className,
          last_activity_date: today,
          timeline: [timelineItem, ...(l.timeline || [])],
        };
      })
    );

    showToast(`Aula experimental agendada para ${formattedDate} às ${params.classTime}!`, 'success');
    return { trialClass: newTrialClass, warning };
  };

  const rescheduleTrialClass = (
    trialClassId: string,
    params: {
      newDate: string;
      newTime: string;
      newClassId?: string;
      reason?: string;
      registeredBy?: string;
    }
  ) => {
    const existing = trialClasses.find((tc) => tc.id === trialClassId);
    if (!existing) {
      throw new Error('Aula experimental não encontrada');
    }

    const targetClassId = params.newClassId || existing.class_id;
    const targetClass = classes.find((c) => c.id === targetClassId);
    const className = targetClass?.name || existing.class_name || 'Turma';

    const newTrialId = `tc-${Date.now()}`;
    const oldFormattedDate = existing.class_date.split('-').reverse().join('/');
    const newFormattedDate = params.newDate.split('-').reverse().join('/');

    // 1. Mark existing trial class as REMARCADA (DO NOT DELETE!)
    const updatedOriginal: TrialClass = {
      ...existing,
      status: 'REMARCADA',
      rescheduled_to_id: newTrialId,
      notes: `${existing.notes ? `${existing.notes} | ` : ''}Remarcada para ${newFormattedDate} às ${params.newTime}.${params.reason ? ` Motivo: ${params.reason}` : ''}`,
      updated_at: new Date().toISOString(),
    };

    // 2. Create the new AGENDADA trial class
    const newTrialClass: TrialClass = {
      id: newTrialId,
      lead_id: existing.lead_id,
      athlete_name: existing.athlete_name,
      class_id: targetClassId,
      class_name: className,
      class_date: params.newDate,
      class_time: params.newTime,
      location: existing.location,
      status: 'AGENDADA',
      attended: false,
      rescheduled_from_id: trialClassId,
      notes: params.reason ? `Remarcação de ${oldFormattedDate}. Motivo: ${params.reason}` : `Remarcação de ${oldFormattedDate}`,
      registered_by: params.registeredBy || 'Coordenação',
      created_at: new Date().toISOString(),
    };

    setTrialClasses((prev) => [
      newTrialClass,
      ...prev.map((tc) => (tc.id === trialClassId ? updatedOriginal : tc)),
    ]);
    saveTrialClassToServer(updatedOriginal).catch(() => {});
    saveTrialClassToServer(newTrialClass).catch(() => {});

    // 3. Register in lead timeline
    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: existing.lead_id,
      action_type: 'AULA_REMARCADA',
      title: `Aula Remarcada: de ${oldFormattedDate} para ${newFormattedDate}`,
      description: `Aula que ocorreria em ${oldFormattedDate} foi remarcada para ${newFormattedDate} às ${params.newTime} (${className}).${params.reason ? ` Motivo: ${params.reason}` : ''}`,
      registered_by: params.registeredBy || 'Coordenação',
      created_at: new Date().toISOString(),
    };

    const today = new Date().toISOString().split('T')[0];
    setLeads((prev) =>
      prev.map((l) =>
        l.id === existing.lead_id
          ? {
              ...l,
              last_activity_date: today,
              timeline: [timelineItem, ...(l.timeline || [])],
            }
          : l
      )
    );

    showToast(`Aula experimental remarcada para ${newFormattedDate} com histórico preservado!`, 'success');
    return { newTrialClass, originalTrialClass: updatedOriginal };
  };

  const updateTrialClassStatus = (
    trialClassId: string,
    status: TrialClassStatus,
    options?: {
      cancellationReason?: string;
      feedbackDecision?: TrialFeedbackDecision;
      feedbackNotes?: string;
      notes?: string;
      registeredBy?: string;
    }
  ) => {
    const trialClass = trialClasses.find((tc) => tc.id === trialClassId);
    if (!trialClass) return;

    const registeredBy = options?.registeredBy || 'Coordenação';
    const today = new Date().toISOString().split('T')[0];
    const formattedDate = trialClass.class_date.split('-').reverse().join('/');

    const updatedTrial: TrialClass = {
      ...trialClass,
      status,
      attended: status === 'REALIZADA',
      cancellation_reason: options?.cancellationReason || trialClass.cancellation_reason,
      feedback_decision: options?.feedbackDecision || trialClass.feedback_decision,
      feedback_notes: options?.feedbackNotes || trialClass.feedback_notes,
      notes: options?.notes || trialClass.notes,
      updated_at: new Date().toISOString(),
    };

    setTrialClasses((prev) =>
      prev.map((tc) => (tc.id === trialClassId ? updatedTrial : tc))
    );
    saveTrialClassToServer(updatedTrial).catch(() => {});

    // Build timeline item & evaluate stage advancement
    let actionType: LeadHistoryItem['action_type'] = 'MUDANCA_ETAPA';
    let title = `Status da Aula: ${status}`;
    let desc = `Aula experimental de ${formattedDate} (${trialClass.class_name}) marcada como ${status}.`;

    if (status === 'REALIZADA') {
      actionType = 'AULA_REALIZADA';
      title = 'Aula Experimental Realizada';
      desc = `Atleta compareceu ao treino experimental em ${formattedDate}. Feedback: ${options?.feedbackDecision || 'Aguardando decisão'}.${options?.feedbackNotes ? ` Notas: ${options.feedbackNotes}` : ''}`;
    } else if (status === 'NAO_COMPARECEU') {
      actionType = 'NAO_COMPARECEU';
      title = 'Não Compareceu à Aula Experimental';
      desc = `Atleta não compareceu na data ${formattedDate}. Registro mantido para reagendamento.`;
    } else if (status === 'CANCELADA') {
      actionType = 'AULA_CANCELADA';
      title = 'Aula Experimental Cancelada';
      desc = `Aula de ${formattedDate} foi cancelada.${options?.cancellationReason ? ` Motivo: ${options.cancellationReason}` : ''}`;
    }

    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: trialClass.lead_id,
      action_type: actionType,
      title,
      description: desc,
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== trialClass.lead_id) return l;

        let nextStage: KanbanStage = l.stage;
        if (status === 'REALIZADA') {
          nextStage = 'EM_DECISAO';
        }

        return {
          ...l,
          stage: nextStage,
          last_activity_date: today,
          timeline: [timelineItem, ...(l.timeline || [])],
        };
      })
    );

    showToast(`Status da aula atualizado para ${status}!`, 'success');
  };

  const enrollLeadAsAthlete = (params: {
    leadId: string;
    classId: string;
    enrollmentDate: string;
    financialCondition: FinancialCondition;
    customMonthlyFee?: number;
    discountType?: DiscountType;
    discountValue?: number;
    paymentDueDay: number;
    uniformDelivered?: boolean;
    uniformFee?: number;
    uniformPaid?: boolean;
    uniformPaymentMethod?: PaymentMethod;
    uniformCardFeeAmount?: number;
    firstMonthlyFeePaid?: boolean;
    firstMonthlyFeePaymentMethod?: PaymentMethod;
    firstMonthlyFeeCardFeeAmount?: number;
    photoUrl?: string;
    athleteCpf?: string;
    athleteRg?: string;
    athleteBirthDate?: string;
    athleteName?: string;
    responsibleName?: string;
    responsibleCpf?: string;
    responsiblePhone?: string;
    responsibleEmail?: string;
    responsibleRelationship?: string;
    address?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressComplement?: string;
    addressNeighborhood?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
    documents?: Array<{ name: string; document_type: string; file_url?: string; file_size?: string; notes?: string }>;
    notes?: string;
    registeredBy?: string;
  }) => {
    const lead = leads.find((l) => l.id === params.leadId);
    if (!lead) {
      throw new Error('Interessado não encontrado');
    }

    const registeredBy = params.registeredBy || 'Secretaria / Recepção';
    const finalAthleteName = (params.athleteName || lead.athlete_name).trim();
    const finalBirthDate = params.athleteBirthDate || lead.athlete_birth_date;
    const finalAthleteCpf = params.athleteCpf || lead.athlete_cpf || '';
    const finalAthleteRg = params.athleteRg || lead.athlete_rg || '';
    const finalRespName = (params.responsibleName || lead.responsible_name).trim();
    const finalRespPhone = params.responsiblePhone || lead.responsible_phone;
    const finalRespCpf = params.responsibleCpf || lead.responsible_cpf || '';
    const finalRespEmail = params.responsibleEmail || lead.responsible_email || '';
    const finalRelationship = params.responsibleRelationship || lead.responsible_relationship || 'Pai/Mãe';
    const finalAddress = params.address || lead.address || '';
    const finalStreet = params.addressStreet || lead.address_street;
    const finalNumber = params.addressNumber || lead.address_number;
    const finalComplement = params.addressComplement || lead.address_complement;
    const finalNeighborhood = params.addressNeighborhood || lead.address_neighborhood;
    const finalCity = params.addressCity || lead.address_city;
    const finalState = params.addressState || lead.address_state;
    const finalZip = params.addressZip || lead.address_zip;

    // 1. Resolve Responsible (check duplicate or create)
    let responsibleId = '';
    const existingResp = checkDuplicateResponsible(finalRespCpf, finalRespName, finalRespPhone);
    if (existingResp) {
      responsibleId = existingResp.id;
    } else {
      const newResp = addResponsible({
        name: finalRespName,
        cpf: finalRespCpf,
        phone: finalRespPhone,
        email: finalRespEmail,
        address: finalAddress,
        address_street: finalStreet,
        address_number: finalNumber,
        address_complement: finalComplement,
        address_neighborhood: finalNeighborhood,
        address_city: finalCity,
        address_state: finalState,
        address_zip: finalZip,
        relationship: finalRelationship,
      });
      responsibleId = newResp.id;
    }

    // 2. Check if athlete already exists to prevent duplication
    const existingAthlete = checkDuplicateAthlete(finalAthleteCpf, finalAthleteName, finalBirthDate);
    let finalAthlete: Athlete;

    const targetClass = classes.find((c) => c.id === params.classId);
    const className = targetClass?.name || 'Turma Definida';

    if (existingAthlete) {
      // Re-activate and update existing athlete
      finalAthlete = {
        ...existingAthlete,
        status: 'ATIVO',
        current_class_id: params.classId,
        class_id: params.classId,
        class_name: targetClass?.name || 'Turma Definida',
        category: targetClass?.category || 'Geral',
        enrollment_date: params.enrollmentDate,
        financial_condition: params.financialCondition,
        custom_monthly_fee: params.customMonthlyFee,
        discount_type: params.discountType || null,
        discount_value: params.discountValue || 0,
        payment_due_day: params.paymentDueDay,
        uniform_delivered: params.uniformDelivered ?? true,
        photo_url: params.photoUrl || existingAthlete.photo_url,
        notes: params.notes || existingAthlete.notes,
        responsible_id: responsibleId,
        responsible_name: finalRespName,
        responsible_phone: finalRespPhone,
      };

      setAthletes((prev) =>
        prev.map((a) => (a.id === existingAthlete.id ? finalAthlete : a))
      );
      updateAthleteOnServer(finalAthlete.id, finalAthlete).catch(() => {});

      const event: AthleteHistoryEvent = {
        id: generateUniqueHistoryId(),
        athlete_id: existingAthlete.id,
        event_type: 'REMATRICULA',
        description: `Matrícula reativada a partir do Módulo de Interessados na turma ${className}. Condição: ${params.financialCondition}. Vencimento: dia ${params.paymentDueDay}.`,
        event_date: params.enrollmentDate,
        registered_by: registeredBy,
        created_at: new Date().toISOString(),
      };
      setHistoryEvents((prev) => [event, ...prev]);
    } else {
      // Create new Athlete
      const newAthleteId = `a-${Date.now()}`;
      finalAthlete = {
        id: newAthleteId,
        name: finalAthleteName,
        birth_date: finalBirthDate,
        cpf: finalAthleteCpf,
        rg: finalAthleteRg,
        phone: finalRespPhone,
        address: finalAddress,
        address_street: finalStreet,
        address_number: finalNumber,
        address_complement: finalComplement,
        address_neighborhood: finalNeighborhood,
        address_city: finalCity,
        address_state: finalState,
        address_zip: finalZip,
        photo_url: params.photoUrl || '',
        responsible_id: responsibleId,
        responsible_name: finalRespName,
        responsible_phone: finalRespPhone,
        current_class_id: params.classId,
        class_id: params.classId,
        class_name: targetClass?.name || 'Turma Definida',
        category: targetClass?.category || 'Geral',
        status: 'ATIVO',
        enrollment_date: params.enrollmentDate,
        financial_condition: params.financialCondition,
        custom_monthly_fee: params.customMonthlyFee,
        discount_type: params.discountType || null,
        discount_value: params.discountValue || 0,
        payment_due_day: params.paymentDueDay,
        uniform_delivered: params.uniformDelivered ?? true,
        notes: params.notes || lead.notes,
        created_at: new Date().toISOString(),
      };

      setAthletes((prev) => sortAthletesAlphabetically([...prev, finalAthlete]));
      saveAthleteToServer(finalAthlete).catch(() => {});

      const event: AthleteHistoryEvent = {
        id: generateUniqueHistoryId(),
        athlete_id: newAthleteId,
        event_type: 'MATRICULA',
        description: `Matrícula inicial efetivada a partir de Interessado/Aula Experimental na turma ${className}. Vencimento: dia ${params.paymentDueDay}. Condição: ${params.financialCondition}.`,
        new_value: className,
        event_date: params.enrollmentDate,
        registered_by: registeredBy,
        created_at: new Date().toISOString(),
      };
      setHistoryEvents((prev) => [event, ...prev]);
    }

    // 3. Integrate Financial: Uniform Revenue
    const uniformFee = params.uniformFee || 0;
    if (uniformFee > 0) {
      const uniformRevenue: ExtraRevenue = {
        id: `rev-${Date.now()}`,
        athlete_id: finalAthlete.id,
        category: 'UNIFORME',
        description: `Uniforme Oficial de Treino - Matrícula ${finalAthlete.name}`,
        amount: uniformFee,
        sale_date: params.enrollmentDate,
        payment_date: params.uniformPaid ? params.enrollmentDate : undefined,
        payment_method: params.uniformPaymentMethod || 'PIX',
        card_fee_amount: params.uniformCardFeeAmount || 0,
        notes: `Uniforme oficial obrigatório registrado na matrícula (${params.uniformPaid ? 'Pago' : 'Pendente'}).${params.uniformDelivered ? ' Entregue ao responsável.' : ' Aguardando entrega de tamanho.'} Registrado por: ${registeredBy}`,
        created_at: new Date().toISOString(),
      };
      setExtraRevenues((prev) => [uniformRevenue, ...prev]);
    }

    // 4. Integrate Financial: First Monthly Fee (if paid on spot)
    if (params.firstMonthlyFeePaid && params.financialCondition !== 'BOLSA_INTEGRAL') {
      const refMonth = params.enrollmentDate.substring(0, 7); // e.g. "2026-08"
      const baseFee = params.customMonthlyFee || 180;
      let disc = 0;
      if (params.discountType === 'FIXO') {
        disc = params.discountValue || 0;
      } else if (params.discountType === 'PERCENTUAL') {
        disc = (baseFee * (params.discountValue || 0)) / 100;
      }
      const finalAmount = Math.max(0, baseFee - disc);

      const feeDueDayStr = String(params.paymentDueDay).padStart(2, '0');
      const feeDueDate = `${refMonth}-${feeDueDayStr}`;

      const firstFee: MonthlyFee = {
        id: `f-${Date.now()}`,
        athlete_id: finalAthlete.id,
        reference_month: refMonth,
        original_amount: baseFee,
        discount_amount: disc,
        card_fee_amount: params.firstMonthlyFeeCardFeeAmount || 0,
        final_amount: finalAmount,
        due_date: feeDueDate,
        payment_date: params.enrollmentDate,
        payment_method: params.firstMonthlyFeePaymentMethod || 'PIX',
        status: 'PAGO',
        notes: `1ª mensalidade quitada antecipadamente no ato da matrícula. Registrado por: ${registeredBy}`,
        created_at: new Date().toISOString(),
      };
      setMonthlyFees((prev) => [firstFee, ...prev]);
    }

    // 5. Add any attached documents
    if (params.documents && params.documents.length > 0) {
      params.documents.forEach((doc, idx) => {
        addDocument({
          athlete_id: finalAthlete.id,
          file_name: doc.name,
          file_type: doc.document_type as any,
          file_size: doc.file_size || '1.0 MB',
          file_url: doc.file_url || 'https://example.com/docs/doc.pdf',
          notes: doc.notes || 'Documento anexado durante a matrícula',
        });
      });
    }

    // 6. Update Lead to MATRICULADO
    const today = new Date().toISOString().split('T')[0];
    const timelineItem: LeadHistoryItem = {
      id: `lt-${Date.now()}`,
      lead_id: lead.id,
      action_type: 'MATRICULA_EFETIVADA',
      title: 'Matrícula Efetivada no Centauro',
      description: `Conversão realizada com sucesso! Atleta ativo criado com ID ${finalAthlete.id} na turma ${className}. Vencimento: dia ${params.paymentDueDay}.${uniformFee > 0 ? ` Uniforme: R$ ${uniformFee} (${params.uniformPaid ? 'Pago' : 'Pendente'}).` : ''}`,
      previous_stage: lead.stage,
      new_stage: 'MATRICULADO',
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };

    const updatedLead: TrialLead = {
      ...lead,
      stage: 'MATRICULADO',
      converted_athlete_id: finalAthlete.id,
      conversion_date: params.enrollmentDate,
      last_activity_date: today,
      timeline: [timelineItem, ...(lead.timeline || [])],
      updated_at: new Date().toISOString(),
    };

    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? updatedLead : l))
    );

    showToast(`Matrícula de ${finalAthlete.name} efetivada com sucesso no Centauro!`, 'success');
    addNotification({
      type: 'ENROLLMENT',
      title: 'Matrícula Efetivada',
      message: `${finalAthlete.name} foi matriculado(a) com sucesso na turma ${className}.`,
      linkModule: 'atletas',
      referenceId: finalAthlete.id,
    });
    return { athlete: finalAthlete, lead: updatedLead };
  };

  // Class Management Operations
  const addClass = (classData: Omit<SoccerClass, 'id' | 'created_at'>): SoccerClass => {
    const newClass: SoccerClass = {
      ...classData,
      id: `c-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setClasses((prev) => [...prev, newClass]);
    saveClassToServer(newClass).catch(() => {});
    syncClassToSupabase(newClass).catch(() => {});
    showToast(`Turma "${newClass.name}" criada com sucesso!`, 'success');
    return newClass;
  };

  const updateClass = (classId: string, updates: Partial<SoccerClass>) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id === classId) {
          const updated = { ...c, ...updates };
          syncClassToSupabase(updated).catch(() => {});
          return updated;
        }
        return c;
      })
    );
    updateClassOnServer(classId, updates).catch(() => {});
    showToast('Turma atualizada com sucesso!', 'success');
  };

  const toggleClassStatus = (classId: string) => {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id === classId) {
          const newStatus = !c.active;
          const updated = { ...c, active: newStatus };
          updateClassOnServer(classId, { active: newStatus }).catch(() => {});
          syncClassToSupabase(updated).catch(() => {});
          showToast(`Turma "${c.name}" ${newStatus ? 'ativada' : 'inativada'} com sucesso.`, 'info');
          return updated;
        }
        return c;
      })
    );
  };

  const deleteClass = (
    classId: string,
    unenrollAthletes: boolean = false
  ): { success: boolean; message: string } => {
    const targetClass = classes.find((c) => c.id === classId);
    const className = targetClass?.name || 'Turma';
    const classAthletes = athletes.filter((a) => a.current_class_id === classId || a.class_id === classId);

    if (classAthletes.length > 0 && !unenrollAthletes) {
      const message = `Esta turma possui ${classAthletes.length} atleta(s) matriculado(s). Desvincule os atletas ou confirme a exclusão com desvinculação automática.`;
      showToast(message, 'info');
      return { success: false, message };
    }

    if (classAthletes.length > 0 && unenrollAthletes) {
      // Unenroll all athletes from this class without removing them from database!
      setAthletes((prev) =>
        prev.map((a) => {
          if (a.current_class_id === classId || a.class_id === classId) {
            const updated = { ...a, current_class_id: '', class_id: '', class_name: '' };
            updateAthleteOnServer(a.id, { current_class_id: '', class_id: '', class_name: '' }).catch(() => {});
            return updated;
          }
          return a;
        })
      );
    }

    setClasses((prev) => prev.filter((c) => c.id !== classId));
    deleteClassFromServer(classId).catch(() => {});
    if (isSupabaseConfigured && supabase) {
      supabase.from('soccer_classes').delete().eq('id', classId).then(() => {});
    }
    showToast(`Turma "${className}" excluída com sucesso.`, 'success');
    return { success: true, message: 'Turma excluída com sucesso.' };
  };

  const addTrainingSession = (sessionData: Omit<TrainingSession, 'id' | 'created_at'>): TrainingSession => {
    const targetClass = classes.find((c) => c.id === sessionData.class_id);
    const newSession: TrainingSession = {
      ...sessionData,
      id: `tr-${Date.now()}`,
      class_name: targetClass?.name || 'Turma',
      status: sessionData.status || 'REALIZADO',
      created_at: new Date().toISOString(),
    };
    setTrainingSessions((prev) => [newSession, ...prev]);
    saveTrainingSessionToServer(newSession).catch(() => {});
    showToast(
      sessionData.training_type === 'EXTRA'
        ? `Treino extra para ${newSession.class_name} registrado!`
        : `Sessão de treino registrada com sucesso!`,
      'success'
    );
    return newSession;
  };

  const updateTrainingSession = (sessionId: string, updates: Partial<TrainingSession>) => {
    setTrainingSessions((prev) =>
      prev.map((t) => (t.id === sessionId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );
    showToast('Informações do treino atualizadas com sucesso!', 'success');
  };

  const cancelTrainingSession = (
    sessionId: string,
    reason: string,
    rescheduleDate?: string,
    rescheduleTime?: string
  ) => {
    const targetSession = trainingSessions.find((t) => t.id === sessionId);
    if (!targetSession) return;

    if (rescheduleDate) {
      // Mark original as REMARCADO
      setTrainingSessions((prev) =>
        prev.map((t) =>
          t.id === sessionId
            ? {
                ...t,
                status: 'REMARCADO',
                cancellation_reason: `${reason} (Remarcado para ${rescheduleDate}${rescheduleTime ? ` às ${rescheduleTime}` : ''})`,
                updated_at: new Date().toISOString(),
              }
            : t
        )
      );

      // Create new session on rescheduled date
      const rescheduledSession: TrainingSession = {
        id: `tr-${Date.now()}`,
        class_id: targetSession.class_id,
        class_name: targetSession.class_name,
        training_date: rescheduleDate,
        training_time: rescheduleTime || targetSession.training_time,
        location: targetSession.location,
        training_type: targetSession.training_type,
        status: 'AGENDADO',
        coach_name: targetSession.coach_name,
        notes: `Treino remarcado (original: ${targetSession.training_date}). Motivo: ${reason}`,
        created_at: new Date().toISOString(),
      };
      setTrainingSessions((prev) => [rescheduledSession, ...prev]);
      showToast('Treino remarcado com sucesso! Nova sessão criada no calendário.', 'success');
    } else {
      // Just CANCELADO
      setTrainingSessions((prev) =>
        prev.map((t) =>
          t.id === sessionId
            ? {
                ...t,
                status: 'CANCELADO',
                cancellation_reason: reason,
                updated_at: new Date().toISOString(),
              }
            : t
        )
      );
      showToast('Treino cancelado. Nenhuma falta será gerada para os atletas.', 'info');
    }
  };

  const saveAttendanceRecords = (
    trainingId: string,
    records: {
      athleteId: string;
      athleteMainClassId?: string;
      status: 'PRESENTE' | 'AUSENTE' | 'NAO_REGISTRADO';
      isGuest?: boolean;
      notes?: string;
      justificationId?: string;
    }[]
  ) => {
    const training = trainingSessions.find((t) => t.id === trainingId);
    const trainingClassId = training?.class_id || '';

    // Filter out previous records for this training
    setAttendances((prev) => {
      const otherRecords = prev.filter((a) => a.training_id !== trainingId);
      const newRecords: AttendanceRecord[] = records
        .filter((r) => r.status !== 'NAO_REGISTRADO') // only store evaluated attendances
        .map((r) => {
          const existing = prev.find((a) => a.training_id === trainingId && a.athlete_id === r.athleteId);
          return {
            id: existing?.id || `att-${Date.now()}-${r.athleteId}`,
            training_id: trainingId,
            athlete_id: r.athleteId,
            training_class_id: trainingClassId,
            athlete_main_class_id: r.athleteMainClassId,
            status: r.status,
            present: r.status === 'PRESENTE',
            is_guest: r.isGuest || false,
            notes: r.notes || existing?.notes,
            justification_id: r.justificationId || existing?.justification_id,
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });
      return [...otherRecords, ...newRecords];
    });

    // Mark training session status as REALIZADO if it was AGENDADO
    if (training && training.status === 'AGENDADO') {
      setTrainingSessions((prev) =>
        prev.map((t) => (t.id === trainingId ? { ...t, status: 'REALIZADO' } : t))
      );
    }

    showToast('Presença salva com sucesso.', 'success');
  };

  const addAbsenceJustification = (
    justificationData: Omit<AbsenceJustification, 'id' | 'created_at'>
  ): AbsenceJustification => {
    const newJustification: AbsenceJustification = {
      ...justificationData,
      id: `j-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    setAbsenceJustifications((prev) => [newJustification, ...prev]);

    // Link justification_id to matching attendance if exists
    if (justificationData.training_id || justificationData.absence_date) {
      setAttendances((prev) =>
        prev.map((att) => {
          const matchTraining = justificationData.training_id && att.training_id === justificationData.training_id;
          if (att.athlete_id === justificationData.athlete_id && (matchTraining || !justificationData.training_id)) {
            return {
              ...att,
              justification_id: newJustification.id,
            };
          }
          return att;
        })
      );
    }

    showToast('Justificativa de falta registrada com sucesso.', 'success');
    return newJustification;
  };

  const removeAbsenceJustification = (justificationId: string) => {
    setAbsenceJustifications((prev) => prev.filter((j) => j.id !== justificationId));
    setAttendances((prev) =>
      prev.map((att) => (att.justification_id === justificationId ? { ...att, justification_id: undefined } : att))
    );
    showToast('Justificativa removida.', 'info');
  };

  // ==========================================
  // FINANCIAL OPERATIONS & BUSINESS LOGIC
  // ==========================================

  const registerMonthlyFeePayment = (
    feeId: string,
    paymentMethod: PaymentMethod,
    paymentDate: string,
    cardFeeAmount: number = 0,
    notes?: string,
    registeredBy: string = 'Financeiro / Secretaria'
  ) => {
    const fee = monthlyFees.find((f) => f.id === feeId);
    if (!fee) return;

    if (fee.status === 'PAGO') {
      showToast('Esta mensalidade já está registrada como PAGA.', 'info');
      return;
    }

    const athlete = athletes.find((a) => a.id === fee.athlete_id);
    const athleteName = athlete?.name || 'Atleta';
    const updatedFinalAmount = fee.original_amount - fee.discount_amount + (cardFeeAmount || 0);

    setMonthlyFees((prev) =>
      prev.map((f) =>
        f.id === feeId
          ? {
              ...f,
              status: 'PAGO',
              payment_method: paymentMethod,
              payment_date: paymentDate,
              card_fee_amount: cardFeeAmount || 0,
              final_amount: updatedFinalAmount,
              notes: notes ? `${f.notes ? f.notes + ' | ' : ''}${notes}` : f.notes,
            }
          : f
      )
    );

    // Record Athlete History Event
    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: fee.athlete_id,
      event_type: 'PAGAMENTO_REGISTRADO',
      description: `Pagamento da mensalidade ${formatCompetence(fee.reference_month)} recebido no valor de ${formatCurrency(updatedFinalAmount)} (${getPaymentMethodLabel(paymentMethod)}).${notes ? ` Obs: ${notes}` : ''}`,
      event_date: paymentDate,
      registered_by: registeredBy,
      created_at: new Date().toISOString(),
    };
    setHistoryEvents((prev) => [event, ...prev]);

    updateMonthlyFeeOnServer(feeId, {
      status: 'PAGO',
      payment_method: paymentMethod,
      payment_date: paymentDate,
      card_fee_amount: cardFeeAmount || 0,
      final_amount: updatedFinalAmount,
      notes: notes ? `${fee.notes ? fee.notes + ' | ' : ''}${notes}` : fee.notes,
    }).catch(() => {});
    saveHistoryEventToServer(event).catch(() => {});

    showToast(`Pagamento de ${athleteName} confirmado com sucesso!`, 'success');
    addNotification({
      type: 'PAYMENT',
      title: 'Pagamento Confirmado',
      message: `Mensalidade ${formatCompetence(fee.reference_month)} de ${athleteName} (${formatCurrency(updatedFinalAmount)}) recebida.`,
      linkModule: 'financeiro',
      referenceId: feeId,
    });
  };

  const createMonthlyFee = (feeData: Omit<MonthlyFee, 'id' | 'created_at'>): MonthlyFee => {
    const newFee: MonthlyFee = {
      ...feeData,
      id: `f-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setMonthlyFees((prev) => [...prev, newFee]);
    saveMonthlyFeeToServer(newFee).catch(() => {});
    syncMonthlyFeeToSupabase(newFee).catch(() => {});
    showToast('Mensalidade cadastrada com sucesso!', 'success');
    return newFee;
  };

  const updateMonthlyFee = (feeId: string, updates: Partial<MonthlyFee>) => {
    setMonthlyFees((prev) =>
      prev.map((f) => {
        if (f.id === feeId) {
          const updated = { ...f, ...updates };
          syncMonthlyFeeToSupabase(updated).catch(() => {});
          return updated;
        }
        return f;
      })
    );
    updateMonthlyFeeOnServer(feeId, updates).catch(() => {});
    showToast('Mensalidade atualizada com sucesso.', 'info');
  };

  const deleteMonthlyFee = (feeId: string) => {
    const fee = monthlyFees.find((f) => f.id === feeId);
    setMonthlyFees((prev) => prev.filter((f) => f.id !== feeId));

    fetch(`/api/monthly-fees/${feeId}`, { method: 'DELETE' }).catch((err) =>
      console.warn('Delete monthly fee server warning:', err)
    );

    if (isSupabaseConfigured && supabase) {
      supabase.from('monthly_fees').delete().eq('id', feeId).then(() => {});
    }

    if (fee && fee.athlete_id) {
      const event: AthleteHistoryEvent = {
        id: generateUniqueHistoryId(),
        athlete_id: fee.athlete_id,
        event_type: 'ALTERACAO_DADOS',
        description: `Mensalidade de competência ${fee.reference_month} (${formatCurrency(fee.final_amount ?? fee.original_amount ?? 0)}) foi excluída do sistema.`,
        event_date: new Date().toISOString().split('T')[0],
        registered_by: 'Coordenação Financeira',
        created_at: new Date().toISOString(),
      };
      setHistoryEvents((prev) => [event, ...prev]);
      saveHistoryEventToServer(event).catch(() => {});
    }

    showToast('Cobrança / Mensalidade excluída com sucesso.', 'info');
  };

  const generateMonthlyFeesForCompetence = (
    referenceMonth: string,
    registeredBy: string = 'Coordenação Financeira'
  ): { generatedCount: number; skippedCount: number } => {
    const todayStr = new Date().toISOString().split('T')[0];
    let generated = 0;
    let skipped = 0;
    const newFees: MonthlyFee[] = [];

    for (const athlete of athletes) {
      // 1. Never generate fees for discharged athletes after discharge
      if (athlete.status === 'DESLIGADO') {
        skipped++;
        continue;
      }

      // 2. Skip if athlete already has a fee for this reference month
      const alreadyExists = monthlyFees.some(
        (f) => f.athlete_id === athlete.id && f.reference_month === referenceMonth
      );
      if (alreadyExists) {
        skipped++;
        continue;
      }

      // 3. Compute athlete individual due date
      const dueDay = athlete.payment_due_day || 10;
      const dueDayPadded = String(dueDay).padStart(2, '0');
      const dueDate = `${referenceMonth}-${dueDayPadded}`;

      // 4. Calculate fee details based on condition & discount rules
      const feeDetails = calculateAthleteFeeDetails(athlete, 180);

      // 5. Determine initial status
      let initialStatus: FinancialStatus = 'A_RECEBER';
      let paymentDate: string | undefined = undefined;

      if (athlete.financial_condition === 'BOLSA_INTEGRAL') {
        initialStatus = 'PAGO';
        paymentDate = `${referenceMonth}-01`;
      } else if (dueDate < todayStr) {
        initialStatus = 'EM_ATRASO';
      }

      const newFee: MonthlyFee = {
        id: `f-${Date.now()}-${athlete.id}`,
        athlete_id: athlete.id,
        reference_month: referenceMonth,
        original_amount: feeDetails.baseAmount,
        discount_amount: feeDetails.discountAmount,
        card_fee_amount: 0,
        final_amount: feeDetails.finalAmount,
        due_date: dueDate,
        payment_date: paymentDate,
        status: initialStatus,
        notes:
          athlete.financial_condition === 'BOLSA_INTEGRAL'
            ? 'Bolsa Integral (Isento)'
            : feeDetails.discountLabel !== 'Sem desconto'
            ? feeDetails.discountLabel
            : undefined,
        created_at: new Date().toISOString(),
      };

      newFees.push(newFee);
      generated++;
    }

    if (newFees.length > 0) {
      setMonthlyFees((prev) => [...prev, ...newFees]);
      for (const fee of newFees) {
        saveMonthlyFeeToServer(fee).catch(() => {});
        syncMonthlyFeeToSupabase(fee).catch(() => {});
      }
    }

    showToast(
      `Geração de ${formatCompetence(referenceMonth)}: ${generated} mensalidades geradas, ${skipped} desconsideradas/já existentes.`,
      'success'
    );

    return { generatedCount: generated, skippedCount: skipped };
  };

  const createExtraRevenue = (revenueData: Omit<ExtraRevenue, 'id' | 'created_at'>): ExtraRevenue => {
    const today = new Date().toISOString().substring(0, 10);
    const saleDate = revenueData.sale_date || today;
    const isPaid = revenueData.status === 'PAGO';
    const paymentDate = isPaid ? (revenueData.payment_date || today) : revenueData.payment_date;
    const dueDate = revenueData.due_date || saleDate;

    const newRevenue: ExtraRevenue = {
      ...revenueData,
      sale_date: saleDate,
      due_date: dueDate,
      payment_date: paymentDate,
      status: revenueData.status || (isPaid ? 'PAGO' : 'A_RECEBER'),
      id: `er-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setExtraRevenues((prev) => [newRevenue, ...prev]);
    saveExtraRevenueToServer(newRevenue).catch(() => {});

    if (revenueData.athlete_id) {
      const catLabel = getExtraRevenueCategoryLabel(revenueData.category);
      const event: AthleteHistoryEvent = {
        id: generateUniqueHistoryId(),
        athlete_id: revenueData.athlete_id,
        event_type: isPaid ? 'PAGAMENTO_REGISTRADO' : 'COBRANCA_CRIADA',
        description: isPaid
          ? `Receita extra registrada: "${revenueData.description}" (${catLabel}) no valor de ${formatCurrency(revenueData.amount)} (${getPaymentMethodLabel(revenueData.payment_method)}).`
          : `Cobrança individual lançada: "${revenueData.description}" (${catLabel}) no valor de ${formatCurrency(revenueData.amount)} (Vencimento: ${formatDateBR(dueDate)}).`,
        event_date: isPaid ? (paymentDate || today) : dueDate,
        registered_by: 'Financeiro / Secretaria',
        created_at: new Date().toISOString(),
      };
      setHistoryEvents((prev) => [event, ...prev]);
      saveHistoryEventToServer(event).catch(() => {});
    }

    showToast(isPaid ? 'Receita extra registrada com sucesso!' : 'Cobrança individual gerada com sucesso!', 'success');
    return newRevenue;
  };

  const deleteExtraRevenue = (revenueId: string) => {
    setExtraRevenues((prev) => prev.filter((r) => r.id !== revenueId));
    deleteExtraRevenueFromServer(revenueId).catch(() => {});
    showToast('Receita extra removida.', 'info');
  };

  const updateExtraRevenue = (revenueId: string, updates: Partial<ExtraRevenue>) => {
    setExtraRevenues((prev) =>
      prev.map((r) => (r.id === revenueId ? { ...r, ...updates } : r))
    );
    fetch(`/api/extra-revenues/${revenueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
    showToast('Receita extra atualizada com sucesso.', 'info');
  };

  const createNegotiation = (params: {
    athleteId: string;
    monthlyFeeIds: string[];
    originalAmount: number;
    discountAmount: number;
    negotiatedAmount: number;
    installmentsCount: number;
    firstDueDate: string;
    notes?: string;
    registeredBy?: string;
  }): Negotiation => {
    const negotiationId = `neg-${Date.now()}`;
    const athlete = athletes.find((a) => a.id === params.athleteId);
    const athleteName = athlete?.name || 'Atleta';

    const installmentValue = Math.round((params.negotiatedAmount / params.installmentsCount) * 100) / 100;
    const installments: NegotiationInstallment[] = [];
    const [firstYear, firstMonth, firstDay] = params.firstDueDate.split('-').map(Number);

    for (let i = 0; i < params.installmentsCount; i++) {
      const installmentDate = new Date(firstYear, firstMonth - 1 + i, firstDay);
      const instDueStr = installmentDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      installments.push({
        id: `inst-${negotiationId}-${i + 1}`,
        negotiation_id: negotiationId,
        installment_number: i + 1,
        total_installments: params.installmentsCount,
        amount:
          i === params.installmentsCount - 1
            ? Math.round((params.negotiatedAmount - installmentValue * (params.installmentsCount - 1)) * 100) / 100
            : installmentValue,
        due_date: instDueStr,
        status: instDueStr < todayStr ? 'EM_ATRASO' : 'A_RECEBER',
      });
    }

    const newNegotiation: Negotiation = {
      id: negotiationId,
      athlete_id: params.athleteId,
      monthly_fee_ids: params.monthlyFeeIds,
      original_amount: params.originalAmount,
      discount_amount: params.discountAmount,
      negotiated_amount: params.negotiatedAmount,
      total_amount: params.negotiatedAmount,
      installments_count: params.installmentsCount,
      installments,
      status: 'EM_ANDAMENTO',
      negotiation_date: new Date().toISOString().split('T')[0],
      notes: params.notes,
      registered_by: params.registeredBy || 'Coordenação Financeira',
      created_at: new Date().toISOString(),
    };

    // Mark original monthly fees as NEGOCIADO (preserving original records without deleting!)
    setMonthlyFees((prev) =>
      prev.map((f) =>
        params.monthlyFeeIds.includes(f.id)
          ? {
              ...f,
              status: 'NEGOCIADO',
              negotiation_id: negotiationId,
              notes: `${f.notes ? f.notes + ' | ' : ''}Débito incluído na Negociação #${negotiationId}`,
            }
          : f
      )
    );

    setNegotiations((prev) => [newNegotiation, ...prev]);
    saveNegotiationToServer(newNegotiation).catch(() => {});

    // Record History Event
    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: params.athleteId,
      event_type: 'NEGOCIACAO_CRIADA',
      description: `Negociação de débitos criada: ${params.monthlyFeeIds.length} mensalidade(s) totalizando ${formatCurrency(params.originalAmount)}, negociadas por ${formatCurrency(params.negotiatedAmount)} em ${params.installmentsCount}x de ${formatCurrency(installmentValue)}.${params.notes ? ` Obs: ${params.notes}` : ''}`,
      event_date: new Date().toISOString().split('T')[0],
      registered_by: params.registeredBy || 'Coordenação Financeira',
      created_at: new Date().toISOString(),
    };
    setHistoryEvents((prev) => [event, ...prev]);
    saveHistoryEventToServer(event).catch(() => {});

    showToast(`Negociação para ${athleteName} criada em ${params.installmentsCount} parcelas!`, 'success');
    return newNegotiation;
  };

  const payNegotiationInstallment = (
    negotiationId: string,
    installmentId: string,
    paymentMethod: PaymentMethod,
    paymentDate: string,
    cardFeeAmount: number = 0,
    notes?: string,
    registeredBy: string = 'Financeiro'
  ) => {
    setNegotiations((prev) =>
      prev.map((neg) => {
        if (neg.id !== negotiationId) return neg;

        const updatedInstallments = neg.installments.map((inst) =>
          inst.id === installmentId
            ? {
                ...inst,
                status: 'PAGO' as const,
                payment_date: paymentDate,
                payment_method: paymentMethod,
                card_fee_amount: cardFeeAmount || 0,
                notes: notes || inst.notes,
              }
            : inst
        );

        const allPaid = updatedInstallments.every((inst) => inst.status === 'PAGO');

        return {
          ...neg,
          installments: updatedInstallments,
          status: allPaid ? ('QUITADA' as const) : ('EM_ANDAMENTO' as const),
        };
      })
    );

    const neg = negotiations.find((n) => n.id === negotiationId);
    if (neg) {
      const inst = neg.installments.find((i) => i.id === installmentId);
      const amountPaid = (inst?.amount || 0) + (cardFeeAmount || 0);
      const event: AthleteHistoryEvent = {
        id: generateUniqueHistoryId(),
        athlete_id: neg.athlete_id,
        event_type: 'PAGAMENTO_REGISTRADO',
        description: `Parcela ${inst?.installment_number}/${inst?.total_installments} de negociação quitada no valor de ${formatCurrency(amountPaid)} (${getPaymentMethodLabel(paymentMethod)}).`,
        event_date: paymentDate,
        registered_by: registeredBy,
        created_at: new Date().toISOString(),
      };
      setHistoryEvents((prev) => [event, ...prev]);
    }

    showToast('Parcela de negociação quitada com sucesso!', 'success');
  };

  const updateAthleteFinancialCondition = (
    athleteId: string,
    updates: {
      financial_condition: FinancialCondition;
      custom_monthly_fee?: number;
      discount_type: DiscountType;
      discount_value?: number;
      payment_due_day: number;
      punctuality_discount_enabled?: boolean;
      punctuality_discount_value?: number;
      punctuality_limit_day?: number;
      effectiveDate?: string;
      notes?: string;
      registeredBy?: string;
    }
  ) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) return;

    const oldCond = athlete.financial_condition;

    setAthletes((prev) =>
      prev.map((a) =>
        a.id === athleteId
          ? {
              ...a,
              financial_condition: updates.financial_condition,
              custom_monthly_fee: updates.custom_monthly_fee,
              discount_type: updates.discount_type,
              discount_value: updates.discount_value,
              payment_due_day: updates.payment_due_day,
              punctuality_discount_enabled: updates.punctuality_discount_enabled,
              punctuality_discount_value: updates.punctuality_discount_value,
              punctuality_limit_day: updates.punctuality_limit_day,
            }
          : a
      )
    );

    const event: AthleteHistoryEvent = {
      id: generateUniqueHistoryId(),
      athlete_id: athleteId,
      event_type: 'ALTERACAO_CONDICAO_FINANCEIRA',
      description: `Condição financeira alterada de ${oldCond} para ${updates.financial_condition} (Vencimento: dia ${updates.payment_due_day}).${updates.notes ? ` Obs: ${updates.notes}` : ''}`,
      old_value: oldCond,
      new_value: updates.financial_condition,
      event_date: updates.effectiveDate || new Date().toISOString().split('T')[0],
      registered_by: updates.registeredBy || 'Administração / Financeiro',
      created_at: new Date().toISOString(),
    };

    setHistoryEvents((prev) => [event, ...prev]);
    showToast('Condição financeira do atleta atualizada com sucesso!', 'success');
  };

  const checkAthleteDebts = (athleteId: string) => {
    const overdueFees = monthlyFees.filter(
      (f) => f.athlete_id === athleteId && f.status === 'EM_ATRASO'
    );
    const overdueTotal = overdueFees.reduce((acc, curr) => acc + curr.final_amount, 0);

    const athleteNegotiations = negotiations.filter(
      (n) => n.athlete_id === athleteId && n.status === 'EM_ANDAMENTO'
    );
    const activeNegotiationsBalance = athleteNegotiations.reduce((acc, neg) => {
      const unpaidInstallments = neg.installments.filter((i) => i.status !== 'PAGO');
      return acc + unpaidInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    }, 0);

    return {
      hasDebts: overdueFees.length > 0 || activeNegotiationsBalance > 0,
      overdueCount: overdueFees.length,
      overdueTotal,
      activeNegotiationsCount: athleteNegotiations.length,
      activeNegotiationsBalance,
    };
  };

  // --- FASE 7: EVENTOS E JOGOS ---
  const addEvent = (eventData: Omit<SportEvent, 'id' | 'created_at'>): SportEvent => {
    const newEvent: SportEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setEvents((prev) => [newEvent, ...prev]);
    showToast('Evento criado com sucesso.', 'success');
    return newEvent;
  };

  const updateEvent = (eventId: string, updates: Partial<SportEvent>) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? { ...evt, ...updates, updated_at: new Date().toISOString() }
          : evt
      )
    );
    showToast('Evento atualizado com sucesso.', 'success');
  };

  const deleteEvent = (eventId: string): { success: boolean; message?: string } => {
    const linkedMatches = matches.filter((m) => m.event_id === eventId);
    if (linkedMatches.length > 0) {
      showToast(
        `Não é possível excluir o evento pois existem ${linkedMatches.length} jogos vinculados a ele.`,
        'error'
      );
      return {
        success: false,
        message: `Existem ${linkedMatches.length} jogos vinculados a este evento.`,
      };
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('Evento excluído com sucesso.', 'info');
    return { success: true };
  };

  const addMatch = (
    matchData: Omit<GameMatch, 'id' | 'created_at'>
  ): { match: GameMatch; isDuplicateWarning?: boolean } => {
    const isDuplicate = checkMatchDuplicate(matches, {
      match_date: matchData.match_date,
      class_id: matchData.class_id,
      opponent: matchData.opponent,
      event_id: matchData.event_id,
    });

    const targetClass = classes.find((c) => c.id === matchData.class_id);

    const newMatch: GameMatch = {
      ...matchData,
      id: `m-${Date.now()}`,
      class_name: matchData.class_name || targetClass?.name || 'Turma Oficial',
      category: matchData.category || targetClass?.category || 'Sub-11',
      status: matchData.status || 'AGENDADO',
      created_at: new Date().toISOString(),
    };

    setMatches((prev) => [newMatch, ...prev]);

    if (isDuplicate) {
      showToast('Aviso: Já existe um jogo semelhante cadastrado nesta data, turma e adversário.', 'info');
    } else {
      showToast('Jogo cadastrado com sucesso.', 'success');
    }

    return { match: newMatch, isDuplicateWarning: isDuplicate };
  };

  const updateMatch = (matchId: string, updates: Partial<GameMatch>) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, ...updates, updated_at: new Date().toISOString() }
          : m
      )
    );
    showToast('Jogo atualizado com sucesso.', 'success');
  };

  const deleteMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setMatchParticipants((prev) => prev.filter((p) => p.match_id !== matchId));
    setMatchGoals((prev) => prev.filter((g) => g.match_id !== matchId));
    showToast('Partida excluída com sucesso.', 'info');
  };

  const cancelMatch = (matchId: string, reason?: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              status: 'CANCELADO',
              cancellation_reason: reason || 'Partida cancelada',
              updated_at: new Date().toISOString(),
            }
          : m
      )
    );
    showToast('Jogo cancelado com sucesso.', 'info');
  };

  const setMatchScore = (
    matchId: string,
    score_ps: number | null,
    score_opponent: number | null
  ) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              score_ps,
              score_opponent,
              status: m.status === 'CANCELADO' ? 'CANCELADO' : 'REALIZADO',
              updated_at: new Date().toISOString(),
            }
          : m
      )
    );
    showToast('Resultado atualizado.', 'success');
  };

  const addMatchParticipant = (
    matchId: string,
    athleteId: string,
    participated: boolean = true
  ): { success: boolean; message?: string } => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) {
      return { success: false, message: 'Atleta não encontrado.' };
    }

    const existing = matchParticipants.find(
      (mp) => mp.match_id === matchId && mp.athlete_id === athleteId
    );
    if (existing) {
      return { success: false, message: 'Atleta já adicionado a este jogo.' };
    }

    const athleteClass = classes.find((c) => c.id === athlete.current_class_id);

    const newParticipant: MatchParticipant = {
      id: `mp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      match_id: matchId,
      athlete_id: athlete.id,
      athlete_name: athlete.name,
      athlete_main_class_id: athlete.current_class_id,
      athlete_main_class_name: athleteClass?.name,
      participated,
      created_at: new Date().toISOString(),
    };

    setMatchParticipants((prev) => [...prev, newParticipant]);
    showToast(`${athlete.name} adicionado ao jogo.`, 'success');
    return { success: true };
  };

  const toggleMatchParticipant = (participantId: string) => {
    setMatchParticipants((prev) =>
      prev.map((p) => {
        if (p.id === participantId) {
          const nextState = !p.participated;
          if (!nextState) {
            setMatchGoals((goals) =>
              goals.filter(
                (g) => !(g.match_id === p.match_id && g.athlete_id === p.athlete_id)
              )
            );
          }
          return { ...p, participated: nextState };
        }
        return p;
      })
    );
  };

  const removeMatchParticipant = (participantId: string) => {
    const participant = matchParticipants.find((p) => p.id === participantId);
    if (participant) {
      setMatchGoals((goals) =>
        goals.filter(
          (g) => !(g.match_id === participant.match_id && g.athlete_id === participant.athlete_id)
        )
      );
    }
    setMatchParticipants((prev) => prev.filter((p) => p.id !== participantId));
    showToast('Participante removido do jogo.', 'info');
  };

  const setMatchGoal = (
    matchId: string,
    athleteId: string,
    goalsCount: number
  ): { success: boolean; message?: string } => {
    const participant = matchParticipants.find(
      (p) => p.match_id === matchId && p.athlete_id === athleteId && p.participated
    );

    if (!participant) {
      const msg = 'Não é permitido registrar gol para atleta não participante.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    const athlete = athletes.find((a) => a.id === athleteId);
    const athleteName = athlete?.name || participant.athlete_name || 'Atleta';

    if (goalsCount <= 0) {
      setMatchGoals((prev) =>
        prev.filter((g) => !(g.match_id === matchId && g.athlete_id === athleteId))
      );
      showToast(`Gols removidos para ${athleteName}.`, 'info');
      return { success: true };
    }

    setMatchGoals((prev) => {
      const existing = prev.find(
        (g) => g.match_id === matchId && g.athlete_id === athleteId
      );
      if (existing) {
        return prev.map((g) =>
          g.id === existing.id ? { ...g, goals_count: goalsCount } : g
        );
      }
      const newGoal: MatchGoal = {
        id: `mg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        match_id: matchId,
        athlete_id: athleteId,
        athlete_name: athleteName,
        goals_count: goalsCount,
        created_at: new Date().toISOString(),
      };
      return [...prev, newGoal];
    });

    showToast(`Gol(s) registrado(s) para ${athleteName}.`, 'success');
    return { success: true };
  };

  const removeMatchGoal = (matchId: string, athleteId: string) => {
    setMatchGoals((prev) =>
      prev.filter((g) => !(g.match_id === matchId && g.athlete_id === athleteId))
    );
  };

  const getMatchGoalsTotal = (matchId: string): number => {
    return matchGoals
      .filter((g) => g.match_id === matchId)
      .reduce((sum, g) => sum + g.goals_count, 0);
  };

  const syncMatchRosterAndGoals = (
    matchId: string,
    roster: Array<{ athleteId: string; participated: boolean; goals: number }>
  ) => {
    // 1. Atualizar participantes
    setMatchParticipants((prev) => {
      const others = prev.filter((p) => p.match_id !== matchId);
      const newParticipants: MatchParticipant[] = roster.map((r, i) => {
        const athlete = athletes.find((a) => a.id === r.athleteId);
        const athleteClass = classes.find((c) => c.id === athlete?.current_class_id);
        return {
          id: `mp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          match_id: matchId,
          athlete_id: r.athleteId,
          athlete_name: athlete?.name || 'Atleta',
          athlete_main_class_id: athlete?.current_class_id,
          athlete_main_class_name: athleteClass?.name,
          participated: r.participated,
          created_at: new Date().toISOString(),
        };
      });
      return [...others, ...newParticipants];
    });

    // 2. Atualizar gols dos atletas
    setMatchGoals((prev) => {
      const others = prev.filter((g) => g.match_id !== matchId);
      const newGoals: MatchGoal[] = roster
        .filter((r) => r.goals > 0)
        .map((r, i) => {
          const athlete = athletes.find((a) => a.id === r.athleteId);
          return {
            id: `mg-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            match_id: matchId,
            athlete_id: r.athleteId,
            athlete_name: athlete?.name || 'Atleta',
            goals_count: r.goals,
            created_at: new Date().toISOString(),
          };
        });
      return [...others, ...newGoals];
    });
  };

  const getAthleteMatchHistory = (athleteId: string) => {
    const athleteParticipations = matchParticipants.filter(
      (mp) => mp.athlete_id === athleteId
    );

    const history = athleteParticipations
      .map((p) => {
        const match = matches.find((m) => m.id === p.match_id);
        if (!match) return null;
        const event = events.find((e) => e.id === match.event_id);
        const goalEntry = matchGoals.find(
          (g) => g.match_id === match.id && g.athlete_id === athleteId
        );
        return {
          match,
          event,
          participated: p.participated,
          goals: goalEntry ? goalEntry.goals_count : 0,
        };
      })
      .filter(Boolean) as Array<{
        match: GameMatch;
        event?: SportEvent;
        participated: boolean;
        goals: number;
      }>;

    history.sort(
      (a, b) => new Date(b.match.match_date).getTime() - new Date(a.match.match_date).getTime()
    );

    const matchesRegistered = history.length;
    const participationsCount = history.filter(
      (h) => h.participated && h.match.status !== 'CANCELADO'
    ).length;
    const goalsCount = history.reduce((sum, h) => {
      if (h.match.status === 'CANCELADO') return sum;
      return sum + h.goals;
    }, 0);

    return {
      matchesRegistered,
      participationsCount,
      goalsCount,
      history,
    };
  };

  // Fase 8: Módulo de Avaliações e Acompanhamento do Atleta
  const addEvaluation = (
    evalData: Omit<TechnicalEvaluation, 'id' | 'created_at'>,
    registeredBy?: string
  ): TechnicalEvaluation => {
    const athlete = athletes.find((a) => a.id === evalData.athlete_id);
    const athleteClass = classes.find((c) => c.id === (evalData.class_id || athlete?.current_class_id));

    const positive_points = (evalData.positive_points || evalData.strengths || '').trim();
    const improvement_points = (evalData.improvement_points || evalData.improvements || '').trim();
    const observations = (evalData.observations || evalData.notes || '').trim();

    const newEval: TechnicalEvaluation = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      athlete_id: evalData.athlete_id,
      athlete_name: evalData.athlete_name || athlete?.name || 'Atleta',
      evaluator_id: evalData.evaluator_id,
      evaluator_name: evalData.evaluator_name || registeredBy || 'Comissão Técnica',
      evaluation_date: evalData.evaluation_date,
      class_id: evalData.class_id || athlete?.current_class_id,
      class_name: evalData.class_name || athleteClass?.name,
      positive_points,
      improvement_points,
      observations: observations || undefined,
      strengths: positive_points,
      improvements: improvement_points,
      notes: observations || undefined,
      active: evalData.active !== undefined ? evalData.active : true,
      created_by: registeredBy || evalData.evaluator_name,
      created_at: new Date().toISOString(),
    };

    setEvaluations((prev) => [newEval, ...prev]);

    // Add athlete history timeline event
    addHistoryEvent({
      athlete_id: evalData.athlete_id,
      event_type: 'AVALIACAO_REALIZADA',
      description: `Avaliação qualitativa individual realizada por ${newEval.evaluator_name}.`,
      event_date: newEval.evaluation_date,
      registered_by: registeredBy || newEval.evaluator_name,
    });

    // Supabase background sync if configured
    if (isSupabaseConfigured && supabase) {
      Promise.resolve(
        supabase.from('evaluations').insert([
          {
            id: newEval.id,
            athlete_id: newEval.athlete_id,
            evaluator_id: newEval.evaluator_id,
            evaluator_name: newEval.evaluator_name,
            evaluation_date: newEval.evaluation_date,
            class_id: newEval.class_id,
            positive_points: newEval.positive_points,
            improvement_points: newEval.improvement_points,
            observations: newEval.observations,
            active: newEval.active,
            created_by: newEval.created_by,
            created_at: newEval.created_at,
          },
        ])
      )
        .then(({ error }: any) => {
          if (error) console.warn('Supabase evaluation sync notice:', error.message);
        })
        .catch((err: any) => console.warn('Supabase evaluation sync error:', err));
    }

    showToast('Avaliação registrada com sucesso.', 'success');
    return newEval;
  };

  const updateEvaluation = (
    evalId: string,
    updates: Partial<TechnicalEvaluation>,
    updatedBy?: string
  ) => {
    setEvaluations((prev) =>
      prev.map((ev) => {
        if (ev.id === evalId) {
          const positive_points =
            updates.positive_points !== undefined
              ? updates.positive_points
              : updates.strengths !== undefined
              ? updates.strengths
              : ev.positive_points;

          const improvement_points =
            updates.improvement_points !== undefined
              ? updates.improvement_points
              : updates.improvements !== undefined
              ? updates.improvements
              : ev.improvement_points;

          const observations =
            updates.observations !== undefined
              ? updates.observations
              : updates.notes !== undefined
              ? updates.notes
              : ev.observations;

          const updatedItem: TechnicalEvaluation = {
            ...ev,
            ...updates,
            positive_points,
            improvement_points,
            observations,
            strengths: positive_points,
            improvements: improvement_points,
            notes: observations,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || ev.updated_by,
          };

          // Supabase sync if configured
          if (isSupabaseConfigured && supabase) {
            Promise.resolve(
              supabase
                .from('evaluations')
                .update({
                  positive_points: updatedItem.positive_points,
                  improvement_points: updatedItem.improvement_points,
                  observations: updatedItem.observations,
                  evaluation_date: updatedItem.evaluation_date,
                  evaluator_name: updatedItem.evaluator_name,
                  updated_at: updatedItem.updated_at,
                  updated_by: updatedItem.updated_by,
                })
                .eq('id', evalId)
            )
              .then(({ error }: any) => {
                if (error) console.warn('Supabase evaluation update notice:', error.message);
              })
              .catch((err: any) => console.warn('Supabase evaluation update error:', err));
          }

          return updatedItem;
        }
        return ev;
      })
    );
    showToast('Avaliação atualizada com sucesso.', 'success');
  };

  const inactivateEvaluation = (evalId: string, inactivatedBy?: string) => {
    setEvaluations((prev) =>
      prev.map((ev) => {
        if (ev.id === evalId) {
          const inactivatedItem = {
            ...ev,
            active: false,
            updated_at: new Date().toISOString(),
            updated_by: inactivatedBy || 'Administrador',
          };

          if (isSupabaseConfigured && supabase) {
            Promise.resolve(
              supabase
                .from('evaluations')
                .update({
                  active: false,
                  updated_at: inactivatedItem.updated_at,
                  updated_by: inactivatedItem.updated_by,
                })
                .eq('id', evalId)
            )
              .then(({ error }: any) => {
                if (error) console.warn('Supabase evaluation inactivate notice:', error.message);
              })
              .catch((err: any) => console.warn('Supabase evaluation inactivate error:', err));
          }

          return inactivatedItem;
        }
        return ev;
      })
    );
    showToast('Avaliação inativada com sucesso.', 'info');
  };

  const deleteEvaluation = (evalId: string) => {
    setEvaluations((prev) => prev.filter((ev) => ev.id !== evalId));
    if (isSupabaseConfigured && supabase) {
      Promise.resolve(
        supabase
          .from('evaluations')
          .delete()
          .eq('id', evalId)
      )
        .then(({ error }: any) => {
          if (error) console.warn('Supabase evaluation delete notice:', error.message);
        })
        .catch((err: any) => console.warn('Supabase evaluation delete error:', err));
    }
    showToast('Avaliação técnica excluída com sucesso.', 'info');
  };

  const getAthleteEvaluations = (athleteId: string, includeInactive: boolean = false) => {
    return evaluations
      .filter((ev) => ev.athlete_id === athleteId && (includeInactive || ev.active !== false))
      .sort((a, b) => new Date(b.evaluation_date).getTime() - new Date(a.evaluation_date).getTime());
  };

  // Aggregate Dashboard Metrics
  const dashboardMetrics = useMemo(() => {
    const safeAthletes = athletes || [];
    const safeClasses = classes || [];
    const safeTrainings = trainingSessions || [];
    const safeAttendances = attendances || [];
    const safeMonthlyFees = monthlyFees || [];
    const safeExtraRevenues = extraRevenues || [];
    const safeMatches = matches || [];
    const safeLeads = leads || [];
    const safeTrialClasses = trialClasses || [];
    const safeJustifications = absenceJustifications || [];

    const activeAthletes = safeAthletes.filter((a) => a.status === 'ATIVO');
    const scholarship = activeAthletes.filter((a) => a.financial_condition === 'BOLSA_INTEGRAL');
    const paying = activeAthletes.filter((a) => a.financial_condition !== 'BOLSA_INTEGRAL');

    // Overcapacity Classes (>30 or near >= 28)
    const overcapacity = safeClasses.filter((c) => {
      const count = safeAthletes.filter((a) => a.current_class_id === c.id && a.status === 'ATIVO').length;
      return count >= (c.capacity_recommended || 30);
    });

    // Attendance Calculations (Exclude cancelled trainings)
    const validTrainings = safeTrainings.filter((t) => t.status !== 'CANCELADO');
    const validTrainingIds = new Set(validTrainings.map((t) => t.id));
    const validAttendances = safeAttendances.filter((att) => validTrainingIds.has(att.training_id));

    const totalAttendances = validAttendances.length;
    const presentCount = validAttendances.filter((att) => att.present).length;
    const attendanceRate = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 0;

    // Detect athletes with 2+ absences in the week using ISO week utility
    const weeklyAbsenceAlerts = getAthletesWithWeeklyAbsences(
      safeAthletes,
      safeAttendances,
      safeTrainings,
      safeJustifications
    );

    const weeklyAbsenceList = (weeklyAbsenceAlerts || []).map((alert) => ({
      athlete: alert.athlete,
      absenceCount: alert.absenceCount,
      pendingCount: alert.pendingCount,
      justifiedCount: alert.justifiedCount,
    }));

    // Financial Metrics
    const paidFees = safeMonthlyFees.filter((f) => f.status === 'PAGO');
    const toReceiveFees = safeMonthlyFees.filter((f) => f.status === 'A_RECEBER');
    const overdueFees = safeMonthlyFees.filter((f) => f.status === 'EM_ATRASO');

    const totalReceived = paidFees.reduce((acc, curr) => acc + (curr.final_amount ?? 0), 0);
    const totalToReceive = toReceiveFees.reduce((acc, curr) => acc + (curr.final_amount ?? 0), 0);
    const totalOverdue = overdueFees.reduce((acc, curr) => acc + (curr.final_amount ?? 0), 0);
    const totalExtra = safeExtraRevenues.reduce((acc, curr) => acc + (curr.amount ?? 0), 0);
    const totalExpected = totalReceived + totalToReceive + totalOverdue;

    // Game stats reais (Regra 20: não incluir jogos cancelados nos indicadores esportivos)
    const validMatches = safeMatches.filter((m) => m.status === 'REALIZADO');
    const matchesPlayed = validMatches.length;
    const matchesWon = validMatches.filter(
      (m) =>
        m.score_ps !== null &&
        m.score_ps !== undefined &&
        m.score_opponent !== null &&
        m.score_opponent !== undefined &&
        m.score_ps > m.score_opponent
    ).length;
    const matchesDrawn = validMatches.filter(
      (m) =>
        m.score_ps !== null &&
        m.score_ps !== undefined &&
        m.score_opponent !== null &&
        m.score_opponent !== undefined &&
        m.score_ps === m.score_opponent
    ).length;
    const matchesLost = validMatches.filter(
      (m) =>
        m.score_ps !== null &&
        m.score_ps !== undefined &&
        m.score_opponent !== null &&
        m.score_opponent !== undefined &&
        m.score_ps < m.score_opponent
    ).length;
    const goalsScored = validMatches.reduce((acc, curr) => acc + (curr.score_ps ?? 0), 0);

    // Leads & Trial Classes Funnel metrics (matching unified 4-stage funnel: Novo, Aula Agendada, Matriculado, Arquivado/Não Convertidos)
    const totalLeads = safeLeads.length;
    const newLeadsCount = safeLeads.filter((l) => l.stage === 'NOVO' || l.stage === 'CONTATO_REALIZADO' || l.stage === 'NOVO_INTERESSADO').length;
    const scheduledTrialClassesCount = safeLeads.filter(
      (l) => l.stage === 'AULA_AGENDADA' || l.stage === 'AULA_REALIZADA' || l.stage === 'EM_DECISAO' || l.stage === 'AGUARDANDO_DECISAO'
    ).length;
    const completedTrialClassesCount = safeTrialClasses.filter((tc) => tc.status === 'REALIZADA').length;
    const decisionLeadsCount = safeLeads.filter(
      (l) => l.stage === 'EM_DECISAO' || l.stage === 'AULA_REALIZADA' || l.stage === 'AGUARDANDO_DECISAO'
    ).length;
    const enrolledLeadsCount = safeLeads.filter((l) => l.stage === 'MATRICULADO').length;
    const nonConvertedLeadsCount = safeLeads.filter((l) => l.stage === 'NAO_CONVERTIDO' || l.stage === 'ENCERRADO').length;
    const leadConversionRate = totalLeads > 0 ? Math.round((enrolledLeadsCount / totalLeads) * 100) : 0;

    return {
      totalActiveAthletes: activeAthletes.length,
      newAthletesPeriod: safeAthletes.filter((a) => a.enrollment_date && a.enrollment_date.startsWith(new Date().toISOString().substring(0, 7))).length,
      dischargedAthletes: safeAthletes.filter((a) => a.status === 'DESLIGADO').length,
      scholarshipAthletes: scholarship.length,
      payingAthletes: paying.length,
      totalClasses: safeClasses.length,
      overcapacityClasses: overcapacity,
      overallAttendanceRate: attendanceRate,
      totalAttendances,
      presentAttendances: presentCount,
      athletesWithWeeklyAbsences: weeklyAbsenceList,
      totalReceived,
      totalToReceive,
      totalOverdue,
      totalExtraRevenue: totalExtra,
      totalExpectedRevenue: totalExpected,
      matchesPlayed,
      matchesWon,
      matchesDrawn,
      matchesLost,
      goalsScored,
      totalLeads,
      newLeadsCount,
      scheduledTrialClassesCount,
      completedTrialClassesCount,
      decisionLeadsCount,
      enrolledLeadsCount,
      nonConvertedLeadsCount,
      leadConversionRate,
    };
  }, [athletes, classes, attendances, trainingSessions, absenceJustifications, monthlyFees, extraRevenues, matches, leads, trialClasses]);

  // Importação em Massa de Atletas e Responsáveis
  const importAthletesBulk = async (
    items: Array<{
      athlete: Omit<Athlete, 'id' | 'created_at'>;
      responsible: Omit<Responsible, 'id' | 'created_at'>;
    }>
  ) => {
    let successCount = 0;
    const errors: string[] = [];
    const newAthletes: Athlete[] = [];
    const newResponsibles: Responsible[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.athlete.name || !item.responsible.name) {
          errors.push(`Linha ${i + 1}: Nome do atleta e do responsável são obrigatórios.`);
          continue;
        }

        // Check if responsible already exists by CPF or Phone
        let respId = '';
        const cleanPhone = cleanDigits(item.responsible.phone || '');
        const cleanCpf = cleanDigits(item.responsible.cpf || '');
        const existingResp = [...responsibles, ...newResponsibles].find(
          (r) => (cleanCpf && cleanDigits(r.cpf) === cleanCpf) || (cleanPhone && cleanDigits(r.phone) === cleanPhone)
        );

        if (existingResp) {
          respId = existingResp.id;
        } else {
          respId = `resp-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;
          const createdResp: Responsible = {
            ...item.responsible,
            id: respId,
            created_at: now,
          };
          newResponsibles.push(createdResp);
        }

        const athleteId = `ath-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;
        const createdAthlete: Athlete = {
          ...item.athlete,
          id: athleteId,
          responsible_id: respId,
          created_at: now,
        };
        newAthletes.push(createdAthlete);
        successCount++;
      } catch (err: any) {
        errors.push(`Linha ${i + 1}: ${err.message || 'Erro ao processar'}`);
      }
    }

    if (newResponsibles.length > 0) {
      setResponsibles((prev) => [...prev, ...newResponsibles]);
    }
    if (newAthletes.length > 0) {
      setAthletes((prev) => [...prev, ...newAthletes]);

      // Sync to PostgreSQL backend
      try {
        await fetch('/api/athletes/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ athletes: newAthletes }),
        });
      } catch (err) {
        console.warn('Backend sync warning:', err);
      }
    }

    showToast(`${successCount} atletas importados com sucesso!`, 'success');
    return { count: successCount, errors };
  };

  // Importação em Massa de Interessados
  const importLeadsBulk = async (items: Array<Omit<TrialLead, 'id' | 'created_at'>>) => {
    let successCount = 0;
    const errors: string[] = [];
    const newLeads: TrialLead[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.athlete_name || !item.responsible_name) {
          errors.push(`Linha ${i + 1}: Nome do atleta e do responsável são obrigatórios.`);
          continue;
        }

        const leadId = `l-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`;
        const createdLead: TrialLead = {
          ...item,
          id: leadId,
          created_at: now,
          entry_date: item.entry_date || now.split('T')[0],
          last_activity_date: item.last_activity_date || now.split('T')[0],
          timeline: item.timeline || [
            {
              id: `tl-${Date.now()}-${i}`,
              lead_id: leadId,
              created_at: now,
              action_type: 'CRIACAO',
              title: 'Importado via Planilha',
              description: 'Cadastro realizado por importação em massa.',
            },
          ],
        };
        newLeads.push(createdLead);
        successCount++;
      } catch (err: any) {
        errors.push(`Linha ${i + 1}: ${err.message || 'Erro ao processar'}`);
      }
    }

    if (newLeads.length > 0) {
      setLeads((prev) => [...newLeads, ...prev]);

      try {
        await fetch('/api/leads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: newLeads }),
        });
      } catch (err) {
        console.warn('Backend leads sync warning:', err);
      }
    }

    showToast(`${successCount} interessados importados com sucesso!`, 'success');
    return { count: successCount, errors };
  };

  // Limpeza de Dados de Demonstração para Iniciar Banco Limpo em Produção
  const clearDemoData = async (options?: { keepClasses?: boolean }) => {
    const keepClasses = options?.keepClasses ?? true;

    setAthletes([]);
    setResponsibles([]);
    setMonthlyFees([]);
    setExtraRevenues([]);
    setNegotiations([]);
    setTrainingSessions([]);
    setAttendances([]);
    setAbsenceJustifications([]);
    setLeads([]);
    setTrialClasses([]);
    setEvents([]);
    setMatches([]);
    setMatchParticipants([]);
    setMatchGoals([]);
    setEvaluations([]);
    setHistoryEvents([]);
    setDocuments([]);

    if (!keepClasses) {
      setClasses([]);
      localStorage.setItem('ps_classes', '[]');
    }

    localStorage.setItem('ps_athletes', '[]');
    localStorage.setItem('ps_responsibles', '[]');
    localStorage.setItem('ps_fees', '[]');
    localStorage.setItem('ps_extra_revenues', '[]');
    localStorage.setItem('ps_negotiations', '[]');
    localStorage.setItem('ps_trainings', '[]');
    localStorage.setItem('ps_attendances', '[]');
    localStorage.setItem('ps_justifications', '[]');
    localStorage.setItem('ps_leads', '[]');
    localStorage.setItem('ps_trial_classes', '[]');
    localStorage.setItem('ps_events', '[]');
    localStorage.setItem('ps_matches', '[]');
    localStorage.setItem('ps_match_participants', '[]');
    localStorage.setItem('ps_match_goals', '[]');
    localStorage.setItem('ps_evaluations', '[]');
    localStorage.setItem('ps_history_events', '[]');
    localStorage.setItem('ps_documents', '[]');

    // Notify backend PostgreSQL
    try {
      await fetch('/api/database/clear-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepClasses }),
      });
    } catch (err) {
      console.warn('Backend clear demo notice:', err);
    }

    showToast('Base limpa com sucesso! O sistema está pronto para receber seus dados reais.', 'success');
    return { success: true, message: 'Dados de demonstração removidos com sucesso.' };
  };

  // Restaurar dados de demonstração
  const restoreDemoData = async () => {
    setClasses(initialClasses);
    setResponsibles(initialResponsibles);
    setAthletes(initialAthletes);
    setMonthlyFees(initialMonthlyFees);
    setExtraRevenues(initialExtraRevenues);
    setNegotiations(initialNegotiations);
    setTrainingSessions(initialTrainingSessions);
    setAttendances(initialAttendances);
    setAbsenceJustifications(initialAbsenceJustifications);
    setLeads(initialLeads);
    setTrialClasses(initialTrialClasses);
    setEvents(initialEvents);
    setMatches(initialMatches);
    setMatchParticipants(initialMatchParticipants);
    setMatchGoals(initialMatchGoals);
    setEvaluations(initialEvaluations);
    setHistoryEvents(initialHistoryEvents);
    setDocuments(initialDocuments);

    // Save to server
    try {
      await fetch('/api/leads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: initialLeads }),
      });
      await fetch('/api/athletes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athletes: initialAthletes }),
      });
    } catch {}

    showToast('Dados de demonstração restaurados.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeModule,
        setActiveModule,
        periodFilter,
        setPeriodFilter,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        classes,
        responsibles,
        athletes,
        monthlyFees,
        extraRevenues,
        negotiations,
        trainingSessions,
        attendances,
        absenceJustifications,
        leads,
        trialClasses,
        events,
        matches,
        matchParticipants,
        matchGoals,
        evaluations,
        historyEvents,
        documents,
        addAthlete,
        updateAthlete,
        deleteAthlete,
        changeAthleteClass,
        dischargeAthlete,
        cancelAthleteEnrollment,
        reEnrollAthlete,
        addResponsible,
        updateResponsible,
        addDocument,
        removeDocument,
        addHistoryEvent,
        checkDuplicateAthlete,
        checkDuplicateResponsible,
        isSearchOpen,
        setIsSearchOpen,
        isGlobalSearchOpen: isSearchOpen,
        setIsGlobalSearchOpen: setIsSearchOpen,
        isQuickActionOpen,
        setIsQuickActionOpen,
        selectedAthleteId,
        setSelectedAthleteId,
        selectedLeadId,
        setSelectedLeadId,
        refreshLeads,
        selectedClassId,
        setSelectedClassId,
        selectedTrainingId,
        setSelectedTrainingId,
        checkDuplicateLead,
        addLead,
        updateLead,
        updateLeadStage,
        markLeadNonConverted,
        reactivateLead,
        deleteLead,
        deleteTrialClass,
        addLeadTimelineEvent,
        scheduleTrialClass,
        rescheduleTrialClass,
        updateTrialClassStatus,
        enrollLeadAsAthlete,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        paymentModalPrefill,
        openPaymentModal,
        registerMonthlyFeePayment,
        createMonthlyFee,
        updateMonthlyFee,
        deleteMonthlyFee,
        generateMonthlyFeesForCompetence,
        createExtraRevenue,
        updateExtraRevenue,
        deleteExtraRevenue,
        createNegotiation,
        payNegotiationInstallment,
        updateAthleteFinancialCondition,
        checkAthleteDebts,
        addClass,
        updateClass,
        toggleClassStatus,
        deleteClass,
        addTrainingSession,
        updateTrainingSession,
        cancelTrainingSession,
        saveAttendanceRecords,
        addAbsenceJustification,
        removeAbsenceJustification,
        addEvent,
        updateEvent,
        deleteEvent,
        addMatch,
        updateMatch,
        deleteMatch,
        cancelMatch,
        setMatchScore,
        addMatchParticipant,
        toggleMatchParticipant,
        removeMatchParticipant,
        setMatchGoal,
        removeMatchGoal,
        syncMatchRosterAndGoals,
        getMatchGoalsTotal,
        getAthleteMatchHistory,
        addEvaluation,
        updateEvaluation,
        inactivateEvaluation,
        deleteEvaluation,
        getAthleteEvaluations,
        toastMessage,
        showToast,
        notifications,
        unreadNotificationsCount,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        dashboardMetrics,
        importAthletesBulk,
        importLeadsBulk,
        clearDemoData,
        restoreDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

