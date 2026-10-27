// Centauro Management System Types

export type UserRole = 'ADMINISTRADOR' | 'USUARIO';

export type SystemModule =
  | 'dashboard'
  | 'atletas'
  | 'turmas'
  | 'interessados'
  | 'presencas'
  | 'financeiro'
  | 'jogos'
  | 'avaliacoes'
  | 'relatorios'
  | 'administracao';

export type PermissionAction =
  | 'visualizar'
  | 'criar'
  | 'editar'
  | 'inativar'
  | 'exportar';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  avatar_url?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  last_access?: string;
  // Key format: `${module}:${action}` (e.g. "financeiro:visualizar": true)
  custom_permissions?: Record<string, boolean>;
}

export type AuditActionType =
  | 'CRIACAO_USUARIO'
  | 'EDICAO_USUARIO'
  | 'INATIVACAO_USUARIO'
  | 'REATIVACAO_USUARIO'
  | 'ALTERACAO_PERFIL'
  | 'ALTERACAO_PERMISSOES'
  | 'RESET_PERMISSOES'
  | 'LOGIN'
  | (string & {});

export interface AuditLog {
  id: string;
  timestamp: string;
  performer_id: string;
  performer_name: string;
  target_user_id?: string;
  target_user_name?: string;
  action_type: AuditActionType;
  description: string;
  details?: Record<string, any>;
}

export type AthleteStatus = 'ATIVO' | 'INATIVO' | 'DESLIGADO';
export type FinancialCondition = 'BOLSA_INTEGRAL' | 'PAGANTE_COM_DESCONTO' | 'PAGANTE_SEM_DESCONTO';
export type DiscountType = 'FIXO' | 'PERCENTUAL' | 'PONTUALIDADE' | null;

export interface Responsible {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  address?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  relationship?: string;
  created_at: string;
}

export interface SoccerClass {
  id: string;
  name: string;
  category: string;
  age_group: string;
  schedule_days: string[];
  schedule_time: string;
  capacity_recommended: number; // default 30
  active: boolean;
  coach_name?: string;
  location?: string;
  notes?: string;
  is_additional_activity?: boolean; // e.g. Treinamento específico de Goleiros
  created_at: string;
}

export interface Athlete {
  id: string;
  name: string;
  birth_date: string;
  cpf: string;
  rg?: string;
  photo_url?: string;
  address?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  phone?: string;
  responsible_id: string;
  responsible?: Responsible;
  responsible_name?: string;
  responsible_phone?: string;
  current_class_id: string;
  current_class?: SoccerClass;
  class_id?: string;
  class_name?: string;
  category?: string;
  status: AthleteStatus;
  enrollment_date: string;
  financial_condition: FinancialCondition;
  custom_monthly_fee?: number; // Custom base fee if different from standard R$ 180 / R$ 200
  monthly_fee?: number; // Base monthly fee for the athlete
  discount_type: DiscountType;
  discount_value?: number;
  payment_due_day: number; // e.g. 5, 10, 15, 20
  punctuality_discount_enabled?: boolean;
  punctuality_discount_value?: number; // Discount if paid on or before limit day
  punctuality_limit_day?: number; // e.g. Day 10
  uniform_delivered: boolean;
  notes?: string;
  created_at: string;
}

export type HistoryEventType = 
  | 'MATRICULA'
  | 'TROCA_TURMA'
  | 'DESLIGAMENTO'
  | 'REMATRICULA'
  | 'ALTERACAO_DADOS'
  | 'DOCUMENTO_ANEXADO'
  | 'AVALIACAO_REALIZADA'
  | 'PAGAMENTO_REGISTRADO'
  | 'COBRANCA_CRIADA'
  | 'ALTERACAO_CONDICAO_FINANCEIRA'
  | 'NEGOCIACAO_CRIADA';

export interface AthleteHistoryEvent {
  id: string;
  athlete_id: string;
  event_type: HistoryEventType;
  description: string;
  old_value?: string;
  new_value?: string;
  event_date: string;
  registered_by?: string;
  created_at: string;
}

export interface AthleteDocument {
  id: string;
  athlete_id: string;
  file_name: string;
  file_type: 'RG_CPF' | 'ATESTADO_MEDICO' | 'COMPROVANTE_RESIDENCIA' | 'TERMO_MATRICULA' | 'AUTORIZACAO_IMAGEM' | 'OUTRO';
  file_size?: string;
  file_url: string;
  notes?: string;
  uploaded_at: string;
}

export type FinancialStatus = 'PAGO' | 'A_RECEBER' | 'EM_ATRASO' | 'NEGOCIADO';
export type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO';

export interface MonthlyFee {
  id: string;
  athlete_id: string;
  athlete?: Athlete;
  reference_month: string; // YYYY-MM
  original_amount: number;
  discount_amount: number;
  card_fee_amount: number;
  final_amount: number;
  due_date: string;
  payment_date?: string;
  payment_method?: PaymentMethod;
  status: FinancialStatus;
  negotiation_id?: string;
  notes?: string;
  created_at: string;
}

export type ExtraRevenueCategory =
  | 'UNIFORME'
  | 'UNIFORME_COMPLETO'
  | 'CAMISA'
  | 'CAMISA_AVULSA'
  | 'CALCAO'
  | 'MEIAO'
  | 'BOLSA'
  | 'BOLSA_MOCHILA'
  | 'COPO'
  | 'COPO_SQUEEZE'
  | 'TAXA_ARBITRAGEM'
  | 'INSCRICAO_CAMPEONATO'
  | 'AVULSO'
  | 'OUTRO';

export interface ExtraRevenue {
  id: string;
  description: string;
  category: ExtraRevenueCategory;
  amount: number;
  sale_date: string;
  due_date?: string;
  payment_date?: string;
  payment_method?: PaymentMethod;
  card_fee_amount?: number;
  athlete_id?: string;
  status?: FinancialStatus;
  notes?: string;
  created_at: string;
}

export interface NegotiationInstallment {
  id: string;
  negotiation_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  card_fee_amount?: number;
  due_date: string;
  payment_date?: string;
  payment_method?: PaymentMethod;
  status: 'A_RECEBER' | 'PAGO' | 'EM_ATRASO';
  notes?: string;
}

export interface Negotiation {
  id: string;
  athlete_id: string;
  monthly_fee_ids: string[]; // ids of the grouped monthly fees
  original_amount: number;
  discount_amount: number;
  negotiated_amount: number;
  total_amount: number;
  installments_count: number;
  installments: NegotiationInstallment[];
  status: 'EM_ANDAMENTO' | 'QUITADO' | 'QUITADA' | 'CANCELADA' | 'CANCELADO';
  negotiation_date: string;
  notes?: string;
  registered_by?: string;
  created_at: string;
}

export type TrainingType = 'REGULAR' | 'EXTRA' | 'GOLEIRO' | 'OUTRO';
export type TrainingStatus = 'REALIZADO' | 'CANCELADO' | 'REMARCADO' | 'AGENDADO';
export type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'NAO_REGISTRADO';

export interface TrainingSession {
  id: string;
  class_id: string;
  class_name?: string;
  training_date: string;
  training_time?: string;
  location?: string;
  training_type: TrainingType;
  status: TrainingStatus;
  cancellation_reason?: string;
  coach_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  training_id: string;
  athlete_id: string;
  training_class_id: string;
  athlete_main_class_id?: string;
  status: AttendanceStatus;
  present: boolean;
  is_guest?: boolean;
  notes?: string;
  justification_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface AbsenceJustification {
  id: string;
  athlete_id: string;
  training_id?: string;
  week_year: string;
  absence_date: string;
  reason: 'MEDICO' | 'ESCOLAR' | 'VIAGEM' | 'FAMILIAR' | 'TRANSPORTE' | 'OUTRO' | string;
  reason_details?: string;
  notes?: string;
  document_url?: string;
  registered_by_id?: string;
  registered_by_name?: string;
  created_at: string;
}

export type KanbanStage =
  | 'NOVO'
  | 'NOVO_INTERESSADO'
  | 'CONTATO_REALIZADO'
  | 'AULA_AGENDADA'
  | 'AULA_REALIZADA'
  | 'EM_DECISAO'
  | 'AGUARDANDO_DECISAO'
  | 'MATRICULADO'
  | 'NAO_CONVERTIDO'
  | 'ENCERRADO';

export type LeadSource =
  | 'FORMULARIO_EXTERNO'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'INDICACAO'
  | 'PRESENCIAL'
  | 'OUTRO';

export type NonConversionReason =
  | 'DESISTENCIA'
  | 'SEM_INTERESSE'
  | 'VALOR'
  | 'HORARIO'
  | 'OUTRA_ESCOLINHA'
  | 'NAO_INFORMADO'
  | 'OUTRO';

export interface LeadHistoryItem {
  id: string;
  lead_id: string;
  action_type: 
    | 'FORMULARIO_RECEBIDO'
    | 'CRIACAO'
    | 'CONTATO_REALIZADO'
    | 'AULA_AGENDADA'
    | 'AULA_REMARCADA'
    | 'AULA_CANCELADA'
    | 'AULA_REALIZADA'
    | 'NAO_COMPARECEU'
    | 'MUDANCA_ETAPA'
    | 'DECISAO_REGISTRADA'
    | 'NAO_CONVERTIDO'
    | 'REATIVADO'
    | 'MATRICULA_EFETIVADA'
    | 'OBSERVACAO';
  title: string;
  description: string;
  previous_stage?: string;
  new_stage?: string;
  registered_by?: string;
  created_at: string;
}

export interface TrialLead {
  id: string;
  athlete_name: string;
  athlete_birth_date: string;
  athlete_document?: string; // RG ou CPF do Aluno
  athlete_cpf?: string;
  athlete_rg?: string;
  responsible_name: string;
  responsible_cpf?: string;
  responsible_phone: string;
  responsible_email?: string;
  responsible_relationship?: string;
  address?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  previous_experience?: boolean;
  interest_class_id?: string;
  interest_class_name?: string;
  source?: LeadSource | string;
  stage: KanbanStage;
  non_conversion_reason?: NonConversionReason | string;
  non_conversion_notes?: string;
  converted_athlete_id?: string;
  conversion_date?: string;
  entry_date: string;
  last_activity_date?: string;
  notes?: string;
  timeline?: LeadHistoryItem[];
  created_at: string;
  updated_at?: string;
}

export type TrialClassStatus =
  | 'AGENDADA'
  | 'REALIZADA'
  | 'CANCELADA'
  | 'REMARCADA'
  | 'NAO_COMPARECEU';

export type TrialFeedbackDecision =
  | 'CONTINUAR'
  | 'NAO_CONTINUAR'
  | 'AINDA_NAO_DECIDIU';

export interface TrialClass {
  id: string;
  lead_id: string;
  lead?: TrialLead;
  athlete_name?: string;
  class_id: string;
  class_name?: string;
  class_date: string; // YYYY-MM-DD
  class_time: string; // HH:MM
  location?: string;
  status: TrialClassStatus;
  attended: boolean;
  cancellation_reason?: string;
  rescheduled_to_id?: string;
  rescheduled_from_id?: string;
  feedback_decision?: TrialFeedbackDecision;
  feedback_notes?: string;
  notes?: string;
  registered_by?: string;
  created_at: string;
  updated_at?: string;
}

export type SportEventType = 'COMPETICAO' | 'TORNEIO' | 'AMISTOSO' | 'OUTRO' | string;
export type MatchStatus = 'AGENDADO' | 'REALIZADO' | 'CANCELADO';
export type MatchResult = 'VITORIA' | 'EMPATE' | 'DERROTA' | 'SEM_RESULTADO';

export interface SportEvent {
  id: string;
  name: string;
  type: SportEventType;
  description?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  location?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface GameMatch {
  id: string;
  event_id?: string | null;
  event?: SportEvent;
  competition_name?: string;
  type?: SportEventType;
  class_id: string;
  class_name?: string;
  category?: string;
  opponent: string;
  match_date: string; // YYYY-MM-DD
  match_time?: string; // HH:MM
  location: string;
  status: MatchStatus;
  score_ps?: number | null;
  score_opponent?: number | null;
  cancellation_reason?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  athlete_id: string;
  athlete_name?: string;
  athlete_main_class_id?: string;
  athlete_main_class_name?: string;
  participated: boolean;
  created_at: string;
}

export interface MatchGoal {
  id: string;
  match_id: string;
  athlete_id: string;
  athlete_name?: string;
  goals_count: number;
  created_at: string;
}

export interface TechnicalEvaluation {
  id: string;
  athlete_id: string;
  athlete_name?: string;
  evaluator_id?: string;
  evaluator_name: string;
  evaluation_date: string; // YYYY-MM-DD
  class_id?: string;
  class_name?: string;
  category?: string;
  general_grade?: number;
  positive_points: string;
  improvement_points: string;
  observations?: string;
  // Aliases for compatibility
  strengths?: string;
  improvements?: string;
  notes?: string;
  active?: boolean;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

export type NavigationModule =
  | 'dashboard'
  | 'atletas'
  | 'turmas'
  | 'interessados'
  | 'presencas'
  | 'financeiro'
  | 'jogos'
  | 'avaliacoes'
  | 'relatorios'
  | 'administracao';

export interface AppNotification {
  id: string;
  type: 'LEAD' | 'PAYMENT' | 'ENROLLMENT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkModule?: SystemModule;
  referenceId?: string;
}

