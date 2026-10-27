import { SystemModule, PermissionAction, UserRole, UserProfile } from '../types';

export interface ModuleConfig {
  id: SystemModule;
  label: string;
  description: string;
  category: 'operacional' | 'esportivo' | 'financeiro' | 'sistema';
  actions: PermissionAction[];
}

export const SYSTEM_MODULES: ModuleConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Geral',
    description: 'Painel com métricas consolidadas e alertas operacionais.',
    category: 'sistema',
    actions: ['visualizar'],
  },
  {
    id: 'atletas',
    label: 'Atletas & Responsáveis',
    description: 'Cadastro unificado, ficha técnica, dados cadastrais e histórico.',
    category: 'operacional',
    actions: ['visualizar', 'criar', 'editar', 'inativar', 'exportar'],
  },
  {
    id: 'turmas',
    label: 'Turmas & Horários',
    description: 'Gestão de turmas, horários de treinos, vagas e ocupação.',
    category: 'operacional',
    actions: ['visualizar', 'criar', 'editar', 'inativar'],
  },
  {
    id: 'presencas',
    label: 'Controle de Presença',
    description: 'Chamadas nos treinos, justificativas e acompanhamento de faltas.',
    category: 'esportivo',
    actions: ['visualizar', 'criar', 'editar'],
  },
  {
    id: 'interessados',
    label: 'Interessados (Captação)',
    description: 'Funil Kanban, agendamento de aulas experimentais e matrículas.',
    category: 'operacional',
    actions: ['visualizar', 'criar', 'editar', 'inativar'],
  },
  {
    id: 'jogos',
    label: 'Jogos & Competições',
    description: 'Agendamento de amistosos, torneios, convocação e registro de gols.',
    category: 'esportivo',
    actions: ['visualizar', 'criar', 'editar', 'inativar'],
  },
  {
    id: 'avaliacoes',
    label: 'Avaliações Técnicas',
    description: 'Acompanhamento qualitativo de evolução individual e desenvolvimento técnico.',
    category: 'esportivo',
    actions: ['visualizar', 'criar', 'editar', 'inativar'],
  },
  {
    id: 'financeiro',
    label: 'Controle Financeiro',
    description: 'Mensalidades, bolsas, receitas extras, cobranças e fluxo de caixa.',
    category: 'financeiro',
    actions: ['visualizar', 'criar', 'editar', 'inativar', 'exportar'],
  },
  {
    id: 'relatorios',
    label: 'Relatórios Gerenciais',
    description: 'Visões consolidadas, comparativos analíticos e exportação em CSV.',
    category: 'sistema',
    actions: ['visualizar', 'exportar'],
  },
  {
    id: 'administracao',
    label: 'Administração & Permissões',
    description: 'Gestão de usuários, concessão de acessos, auditoria e políticas de segurança.',
    category: 'sistema',
    actions: ['visualizar', 'criar', 'editar', 'inativar'],
  },
];

export const ACTION_LABELS: Record<PermissionAction, { label: string; description: string }> = {
  visualizar: {
    label: 'Visualizar',
    description: 'Permissão de consulta e leitura de dados no módulo.',
  },
  criar: {
    label: 'Criar / Cadastrar',
    description: 'Permissão para cadastrar novos registros e adicionar itens.',
  },
  editar: {
    label: 'Editar / Atualizar',
    description: 'Permissão para modificar dados e informações existentes.',
  },
  inativar: {
    label: 'Inativar / Excluir',
    description: 'Permissão para inativar, desativar ou cancelar registros.',
  },
  exportar: {
    label: 'Exportar Dados',
    description: 'Permissão para gerar relatórios e exportar arquivos CSV/Impressão.',
  },
};

export interface RoleInfo {
  role: UserRole;
  name: string;
  tagline: string;
  description: string;
  colorBadge: string;
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleInfo> = {
  ADMINISTRADOR: {
    role: 'ADMINISTRADOR',
    name: 'Administrador',
    tagline: 'Acesso total e irrestrito ao sistema',
    description:
      'Acesso completo a todos os módulos, configurações, relatórios, cadastros e gestão de permissões de usuários.',
    colorBadge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  USUARIO: {
    role: 'USUARIO',
    name: 'Usuário',
    tagline: 'Visualização de todos os módulos (exceto Administração)',
    description:
      'Tem acesso a todos os módulos, apenas para visualizar. Não terá acesso ao módulo de Administração & Supabase na matriz padrão, com opção de personalização granular.',
    colorBadge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function getDefaultPermissionsForRole(role: UserRole): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};

  SYSTEM_MODULES.forEach((mod) => {
    mod.actions.forEach((act) => {
      permissions[`${mod.id}:${act}`] = false;
    });
  });

  if (role === 'ADMINISTRADOR') {
    SYSTEM_MODULES.forEach((mod) => {
      mod.actions.forEach((act) => {
        permissions[`${mod.id}:${act}`] = true;
      });
    });
    return permissions;
  }

  if (role === 'USUARIO') {
    SYSTEM_MODULES.forEach((mod) => {
      // Tem acesso a todos os módulos, apenas para visualizar, exceto administracao
      if (mod.id !== 'administracao') {
        permissions[`${mod.id}:visualizar`] = true;
      }
    });
    return permissions;
  }

  return permissions;
}

export function hasUserPermission(
  user: UserProfile | null | undefined,
  module: SystemModule,
  action: PermissionAction = 'visualizar'
): boolean {
  if (!user || !user.active) return false;
  const permKey = `${module}:${action}`;

  if (user.custom_permissions && permKey in user.custom_permissions) {
    return Boolean(user.custom_permissions[permKey]);
  }

  if (user.role === 'ADMINISTRADOR') {
    return true;
  }

  const defaultPerms = getDefaultPermissionsForRole(user.role);
  return Boolean(defaultPerms[permKey]);
}

export function countCustomOverrides(user: UserProfile): number {
  if (!user.custom_permissions) return 0;
  const defaults = getDefaultPermissionsForRole(user.role);
  let count = 0;
  for (const [key, value] of Object.entries(user.custom_permissions)) {
    if (value !== Boolean(defaults[key])) {
      count++;
    }
  }
  return count;
}

export function isLastActiveAdmin(users: UserProfile[], targetUserId: string): boolean {
  const activeAdmins = users.filter(
    (u) => u.active && u.role === 'ADMINISTRADOR'
  );
  return activeAdmins.length === 1 && activeAdmins[0].id === targetUserId;
}

export const SUPABASE_RLS_SQL = `-- ==============================================================================
-- CENTAURO - SISTEMA DE GESTÃO DO CENTRO DE FORMAÇÃO
-- SCRIPT COMPLETO DE CRIAÇÃO DE TABELAS E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- Execute este script no SQL Editor do Supabase (supabase.com/dashboard)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELAS DE AUTENTICAÇÃO, CONTROLE DE ACESSO & AUDITORIA
-- ==============================================================================

-- 2.1 TABELA: PROFILES (Perfis de Usuários sincronizados com Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMINISTRADOR', 'USUARIO')) DEFAULT 'USUARIO',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  phone TEXT,
  notes TEXT,
  last_access TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 TABELA: USER_PERMISSIONS (Exceções granulares de acesso por usuário)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_module_action UNIQUE (user_id, module, action)
);

-- 2.3 TABELA: AUDIT_LOGS (Trilha de auditoria imutável de ações administrativas)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performer_name TEXT NOT NULL,
  target_user_id UUID,
  target_user_name TEXT,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELAS OPERACIONAIS & CADASTRAIS (TURMAS, RESPONSÁVEIS, ATLETAS)
-- ==============================================================================

-- 3.1 TABELA: SOCCER_CLASSES (Turmas, Horários e Categorias do Centauro)
CREATE TABLE IF NOT EXISTS public.soccer_classes (
  id TEXT PRIMARY KEY DEFAULT ('c-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  age_group TEXT,
  schedule_days TEXT[],
  schedule_time TEXT,
  capacity_recommended INT DEFAULT 30,
  active BOOLEAN DEFAULT TRUE,
  coach_name TEXT,
  location TEXT,
  notes TEXT,
  is_additional_activity BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 TABELA: RESPONSIBLES (Pais e Responsáveis Legais dos Atletas)
CREATE TABLE IF NOT EXISTS public.responsibles (
  id TEXT PRIMARY KEY DEFAULT ('r-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT DEFAULT 'Pai/Mãe',
  address TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 TABELA: ATHLETES (Atletas Matriculados no Centauro)
CREATE TABLE IF NOT EXISTS public.athletes (
  id TEXT PRIMARY KEY DEFAULT ('a-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  name TEXT NOT NULL,
  birth_date DATE,
  cpf TEXT,
  rg TEXT,
  photo_url TEXT,
  address TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  phone TEXT,
  responsible_id TEXT REFERENCES public.responsibles(id) ON DELETE SET NULL,
  responsible_name TEXT,
  responsible_phone TEXT,
  current_class_id TEXT REFERENCES public.soccer_classes(id) ON DELETE SET NULL,
  current_class_name TEXT,
  status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'DESLIGADO')),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  financial_condition TEXT DEFAULT 'PAGANTE_SEM_DESCONTO' CHECK (financial_condition IN ('BOLSA_INTEGRAL', 'PAGANTE_COM_DESCONTO', 'PAGANTE_SEM_DESCONTO')),
  custom_monthly_fee NUMERIC(10,2) DEFAULT 180.00,
  discount_type TEXT CHECK (discount_type IN ('FIXO', 'PERCENTUAL', 'PONTUALIDADE', NULL)),
  discount_value NUMERIC(10,2) DEFAULT 0.00,
  payment_due_day INT DEFAULT 10,
  punctuality_discount_enabled BOOLEAN DEFAULT FALSE,
  punctuality_discount_value NUMERIC(10,2) DEFAULT 0.00,
  punctuality_limit_day INT DEFAULT 10,
  uniform_delivered BOOLEAN DEFAULT FALSE,
  notes TEXT,
  discharge_date DATE,
  discharge_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 TABELA: ATHLETE_HISTORY (Histórico de Eventos e Vida Escolar do Atleta)
CREATE TABLE IF NOT EXISTS public.athlete_history (
  id TEXT PRIMARY KEY DEFAULT ('ah-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  registered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 TABELA: ATHLETE_DOCUMENTS (Documentos Anexados do Atleta)
CREATE TABLE IF NOT EXISTS public.athlete_documents (
  id TEXT PRIMARY KEY DEFAULT ('doc-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT,
  file_url TEXT NOT NULL,
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. CAPTAÇÃO DE INTERESSADOS & FORMULÁRIO PÚBLICO EXTERNO
-- ==============================================================================

-- 4.1 TABELA: LEADS (Interessados, Captação & Formulário Online Público)
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY DEFAULT ('l-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_name TEXT NOT NULL,
  athlete_birth_date DATE,
  athlete_cpf TEXT,
  athlete_rg TEXT,
  athlete_document TEXT,
  responsible_name TEXT NOT NULL,
  responsible_cpf TEXT,
  responsible_phone TEXT NOT NULL,
  responsible_email TEXT,
  responsible_relationship TEXT,
  address TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  interest_class_id TEXT,
  interest_class_name TEXT,
  previous_experience BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'FORMULARIO_EXTERNO',
  stage TEXT DEFAULT 'NOVO' CHECK (stage IN ('NOVO', 'NOVO_INTERESSADO', 'CONTATO_REALIZADO', 'AULA_AGENDADA', 'AULA_REALIZADA', 'EM_DECISAO', 'AGUARDANDO_DECISAO', 'MATRICULADO', 'NAO_CONVERTIDO', 'ENCERRADO')),
  non_conversion_reason TEXT,
  non_conversion_notes TEXT,
  converted_athlete_id TEXT REFERENCES public.athletes(id) ON DELETE SET NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  timeline JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 TABELA: TRIAL_CLASSES (Aulas Experimentais Agendadas)
CREATE TABLE IF NOT EXISTS public.trial_classes (
  id TEXT PRIMARY KEY DEFAULT ('tc-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  lead_id TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  class_id TEXT REFERENCES public.soccer_classes(id) ON DELETE SET NULL,
  class_name TEXT,
  class_date DATE NOT NULL,
  class_time TEXT,
  location TEXT,
  status TEXT DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'REALIZADA', 'REMARCADA', 'CANCELADA', 'NAO_COMPARECEU')),
  feedback_decision TEXT,
  feedback_notes TEXT,
  cancellation_reason TEXT,
  notes TEXT,
  registered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. TREINOS, CHAMADAS & CONTROLE DE PRESENÇAS
-- ==============================================================================

-- 5.1 TABELA: TRAINING_SESSIONS (Grade e Sessões de Treinos)
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id TEXT PRIMARY KEY DEFAULT ('tr-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  class_id TEXT NOT NULL REFERENCES public.soccer_classes(id) ON DELETE CASCADE,
  class_name TEXT,
  training_date DATE NOT NULL,
  training_time TEXT,
  location TEXT,
  training_type TEXT DEFAULT 'REGULAR' CHECK (training_type IN ('REGULAR', 'EXTRA', 'GOLEIRO', 'OUTRO')),
  status TEXT DEFAULT 'REALIZADO' CHECK (status IN ('REALIZADO', 'CANCELADO', 'REMARCADO', 'AGENDADO')),
  cancellation_reason TEXT,
  coach_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.2 TABELA: ATTENDANCES (Registros de Presenças e Chamadas Individuais)
CREATE TABLE IF NOT EXISTS public.attendances (
  id TEXT PRIMARY KEY DEFAULT ('att-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  training_id TEXT REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  training_class_id TEXT NOT NULL REFERENCES public.soccer_classes(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_main_class_id TEXT,
  status TEXT NOT NULL DEFAULT 'PRESENTE' CHECK (status IN ('PRESENTE', 'AUSENTE', 'NAO_REGISTRADO')),
  present BOOLEAN NOT NULL DEFAULT TRUE,
  is_guest BOOLEAN DEFAULT FALSE,
  notes TEXT,
  justification_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.3 TABELA: ABSENCE_JUSTIFICATIONS (Justificativas de Faltas e Atestados Médicos)
CREATE TABLE IF NOT EXISTS public.absence_justifications (
  id TEXT PRIMARY KEY DEFAULT ('aj-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  training_id TEXT REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  week_year TEXT NOT NULL,
  absence_date DATE NOT NULL,
  reason TEXT NOT NULL,
  reason_details TEXT,
  notes TEXT,
  document_url TEXT,
  registered_by_id TEXT,
  registered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. MÓDULO FINANCEIRO (MENSALIDADES, RECEITAS EXTRAS & NEGOCIAÇÕES)
-- ==============================================================================

-- 6.1 TABELA: MONTHLY_FEES (Mensalidades dos Atletas)
CREATE TABLE IF NOT EXISTS public.monthly_fees (
  id TEXT PRIMARY KEY DEFAULT ('mf-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  original_amount NUMERIC(10,2) NOT NULL DEFAULT 180.00,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  card_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('PIX', 'DINHEIRO', 'CARTAO_CREDITO', NULL)),
  status TEXT NOT NULL DEFAULT 'A_RECEBER' CHECK (status IN ('PAGO', 'A_RECEBER', 'EM_ATRASO', 'NEGOCIADO')),
  negotiation_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.2 TABELA: EXTRA_REVENUES (Receitas Extras, Uniformes, Acessórios e Taxas)
CREATE TABLE IF NOT EXISTS public.extra_revenues (
  id TEXT PRIMARY KEY DEFAULT ('ex-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_date DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'DINHEIRO', 'CARTAO_CREDITO')),
  card_fee_amount NUMERIC(10,2) DEFAULT 0.00,
  athlete_id TEXT REFERENCES public.athletes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.3 TABELA: NEGOTIATIONS (Acordos Financeiros e Parcelamento de Débitos)
CREATE TABLE IF NOT EXISTS public.negotiations (
  id TEXT PRIMARY KEY DEFAULT ('neg-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  monthly_fee_ids TEXT[] NOT NULL DEFAULT '{}',
  original_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  negotiated_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  installments_count INT NOT NULL DEFAULT 1,
  installments JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO', 'QUITADO', 'QUITADA', 'CANCELADO', 'CANCELADA')),
  negotiation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  registered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6.4 TABELA: FINANCIAL_TRANSACTIONS (Visão Unificada / Fluxo de Caixa Geral)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id TEXT PRIMARY KEY DEFAULT ('fn-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT REFERENCES public.athletes(id) ON DELETE SET NULL,
  athlete_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('MENSALIDADE', 'RECEITA_EXTRA', 'MATRICULA', 'UNIFORME', 'OUTRO')),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PAGO', 'PENDENTE', 'ATRASADO', 'ISENTO', 'CANCELADO')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. JOGOS, COMPETIÇÕES & AVALIAÇÕES TÉCNICAS
-- ==============================================================================

-- 7.1 TABELA: GAMES (Partidas, Amistosos e Torneios)
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY DEFAULT ('gm-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  category TEXT NOT NULL,
  opponent TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  type TEXT DEFAULT 'AMISTOSO' CHECK (type IN ('AMISTOSO', 'CAMPEONATO', 'TORNEIO_INTERNO')),
  status TEXT DEFAULT 'AGENDADO' CHECK (status IN ('AGENDADO', 'FINALIZADO', 'CANCELADO')),
  score_ps INT DEFAULT 0,
  score_opponent INT DEFAULT 0,
  roster JSONB DEFAULT '[]'::JSONB,
  goals JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.2 TABELA: MATCH_PARTICIPANTS (Convocação e Atletas em Campo)
CREATE TABLE IF NOT EXISTS public.match_participants (
  id TEXT PRIMARY KEY DEFAULT ('mp-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  match_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  category TEXT,
  is_starter BOOLEAN DEFAULT FALSE,
  played BOOLEAN DEFAULT TRUE,
  minutes_played INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.3 TABELA: MATCH_GOALS (Gols Marcados na Partida)
CREATE TABLE IF NOT EXISTS public.match_goals (
  id TEXT PRIMARY KEY DEFAULT ('mg-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  match_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  athlete_id TEXT REFERENCES public.athletes(id) ON DELETE SET NULL,
  athlete_name TEXT NOT NULL,
  minute INT,
  is_penalty BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.4 TABELA: EVALUATIONS (Avaliações Técnicas, Táticas e Físicas)
CREATE TABLE IF NOT EXISTS public.evaluations (
  id TEXT PRIMARY KEY DEFAULT ('ev-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INT),
  athlete_id TEXT NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  athlete_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluator_name TEXT NOT NULL,
  category TEXT,
  technical_scores JSONB NOT NULL DEFAULT '{}'::JSONB,
  tactical_scores JSONB DEFAULT '{}'::JSONB,
  physical_scores JSONB DEFAULT '{}'::JSONB,
  psychological_scores JSONB DEFAULT '{}'::JSONB,
  general_grade NUMERIC(3,1),
  positive_points TEXT,
  points_to_improve TEXT,
  strengths TEXT,
  improvements TEXT,
  coach_comments TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- ==============================================================================
-- 8. FUNÇÕES AUXILIARES DE SEGURANÇA E TRIGGERS
-- ==============================================================================

-- Função: Verifica se o usuário autenticado atual é Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $BODY$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'ADMINISTRADOR'
      AND active = TRUE
  );
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Verifica se o usuário tem permissão específica para um módulo e ação
CREATE OR REPLACE FUNCTION public.has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $BODY$
DECLARE
  v_role TEXT;
  v_active BOOLEAN;
  v_custom BOOLEAN;
BEGIN
  SELECT role, active INTO v_role, v_active
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_active IS NOT TRUE THEN
    RETURN FALSE;
  END IF;

  -- Administrador possui acesso irrestrito a todos os módulos e ações
  IF v_role = 'ADMINISTRADOR' THEN
    RETURN TRUE;
  END IF;

  -- Checar se há override individual explícito na tabela user_permissions
  SELECT allowed INTO v_custom
  FROM public.user_permissions
  WHERE user_id = auth.uid()
    AND module = p_module
    AND action = p_action;

  IF v_custom IS NOT NULL THEN
    RETURN v_custom;
  END IF;

  -- Regras por perfil padrão
  IF v_role = 'USUARIO' THEN
    IF p_action = 'visualizar' THEN
      IF p_module = 'administracao' THEN
        RETURN FALSE;
      ELSE
        RETURN TRUE;
      END IF;
    ELSE
      RETURN FALSE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Automático: Sincroniza novos usuários do Supabase Auth para a tabela public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $BODY$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN LOWER(NEW.email) = 'jamericogermano@gmail.com' THEN 'Américo Germano'
      ELSE COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    END,
    CASE
      WHEN LOWER(NEW.email) = 'jamericogermano@gmail.com' THEN 'ADMINISTRADOR'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'USUARIO')
    END,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = CASE WHEN LOWER(EXCLUDED.email) = 'jamericogermano@gmail.com' THEN 'Américo Germano' ELSE public.profiles.name END,
      role = CASE WHEN LOWER(EXCLUDED.email) = 'jamericogermano@gmail.com' THEN 'ADMINISTRADOR' ELSE public.profiles.role END,
      active = TRUE,
      updated_at = NOW();
  RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger Automático: Atualiza o campo updated_at em tabelas modificadas
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $BODY$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_soccer_classes_updated_at ON public.soccer_classes;
CREATE TRIGGER tr_soccer_classes_updated_at BEFORE UPDATE ON public.soccer_classes FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_responsibles_updated_at ON public.responsibles;
CREATE TRIGGER tr_responsibles_updated_at BEFORE UPDATE ON public.responsibles FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_athletes_updated_at ON public.athletes;
CREATE TRIGGER tr_athletes_updated_at BEFORE UPDATE ON public.athletes FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_leads_updated_at ON public.leads;
CREATE TRIGGER tr_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_trial_classes_updated_at ON public.trial_classes;
CREATE TRIGGER tr_trial_classes_updated_at BEFORE UPDATE ON public.trial_classes FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_training_sessions_updated_at ON public.training_sessions;
CREATE TRIGGER tr_training_sessions_updated_at BEFORE UPDATE ON public.training_sessions FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_attendances_updated_at ON public.attendances;
CREATE TRIGGER tr_attendances_updated_at BEFORE UPDATE ON public.attendances FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_monthly_fees_updated_at ON public.monthly_fees;
CREATE TRIGGER tr_monthly_fees_updated_at BEFORE UPDATE ON public.monthly_fees FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_games_updated_at ON public.games;
CREATE TRIGGER tr_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS tr_evaluations_updated_at ON public.evaluations;
CREATE TRIGGER tr_evaluations_updated_at BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 9. HABILITAÇÃO DO ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soccer_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 10. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- 10.1 PROFILES
DROP POLICY IF EXISTS "profiles_select_active" ON public.profiles;
CREATE POLICY "profiles_select_active" ON public.profiles FOR SELECT TO authenticated USING (active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin() OR id = auth.uid()) WITH CHECK (public.is_admin() OR id = auth.uid());

-- 10.2 USER_PERMISSIONS
DROP POLICY IF EXISTS "permissions_select" ON public.user_permissions;
CREATE POLICY "permissions_select" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "permissions_admin_all" ON public.user_permissions;
CREATE POLICY "permissions_admin_all" ON public.user_permissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10.3 AUDIT_LOGS
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_auth" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_auth" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

-- 10.4 TURMAS (SOCCER_CLASSES)
DROP POLICY IF EXISTS "soccer_classes_select" ON public.soccer_classes;
CREATE POLICY "soccer_classes_select" ON public.soccer_classes FOR SELECT TO authenticated USING (public.has_permission('turmas', 'visualizar'));

DROP POLICY IF EXISTS "soccer_classes_public_read" ON public.soccer_classes;
CREATE POLICY "soccer_classes_public_read" ON public.soccer_classes FOR SELECT TO anon USING (active = TRUE);

DROP POLICY IF EXISTS "soccer_classes_insert" ON public.soccer_classes;
CREATE POLICY "soccer_classes_insert" ON public.soccer_classes FOR INSERT TO authenticated WITH CHECK (public.has_permission('turmas', 'criar'));

DROP POLICY IF EXISTS "soccer_classes_update" ON public.soccer_classes;
CREATE POLICY "soccer_classes_update" ON public.soccer_classes FOR UPDATE TO authenticated USING (public.has_permission('turmas', 'editar')) WITH CHECK (public.has_permission('turmas', 'editar'));

DROP POLICY IF EXISTS "soccer_classes_delete" ON public.soccer_classes;
CREATE POLICY "soccer_classes_delete" ON public.soccer_classes FOR DELETE TO authenticated USING (public.has_permission('turmas', 'inativar') OR public.is_admin());

-- 10.5 ATLETAS & RESPONSÁVEIS
DROP POLICY IF EXISTS "athletes_select" ON public.athletes;
CREATE POLICY "athletes_select" ON public.athletes FOR SELECT TO authenticated USING (public.has_permission('atletas', 'visualizar'));

DROP POLICY IF EXISTS "athletes_insert" ON public.athletes;
CREATE POLICY "athletes_insert" ON public.athletes FOR INSERT TO authenticated WITH CHECK (public.has_permission('atletas', 'criar'));

DROP POLICY IF EXISTS "athletes_update" ON public.athletes;
CREATE POLICY "athletes_update" ON public.athletes FOR UPDATE TO authenticated USING (public.has_permission('atletas', 'editar')) WITH CHECK (public.has_permission('atletas', 'editar'));

DROP POLICY IF EXISTS "athletes_delete" ON public.athletes;
CREATE POLICY "athletes_delete" ON public.athletes FOR DELETE TO authenticated USING (public.has_permission('atletas', 'inativar') OR public.is_admin());

DROP POLICY IF EXISTS "responsibles_select" ON public.responsibles;
CREATE POLICY "responsibles_select" ON public.responsibles FOR SELECT TO authenticated USING (public.has_permission('atletas', 'visualizar'));

DROP POLICY IF EXISTS "responsibles_insert" ON public.responsibles;
CREATE POLICY "responsibles_insert" ON public.responsibles FOR INSERT TO authenticated WITH CHECK (public.has_permission('atletas', 'criar'));

DROP POLICY IF EXISTS "responsibles_update" ON public.responsibles;
CREATE POLICY "responsibles_update" ON public.responsibles FOR UPDATE TO authenticated USING (public.has_permission('atletas', 'editar')) WITH CHECK (public.has_permission('atletas', 'editar'));

DROP POLICY IF EXISTS "responsibles_delete" ON public.responsibles;
CREATE POLICY "responsibles_delete" ON public.responsibles FOR DELETE TO authenticated USING (public.has_permission('atletas', 'inativar') OR public.is_admin());

DROP POLICY IF EXISTS "athlete_history_select" ON public.athlete_history;
CREATE POLICY "athlete_history_select" ON public.athlete_history FOR SELECT TO authenticated USING (public.has_permission('atletas', 'visualizar'));

DROP POLICY IF EXISTS "athlete_history_insert" ON public.athlete_history;
CREATE POLICY "athlete_history_insert" ON public.athlete_history FOR INSERT TO authenticated WITH CHECK (public.has_permission('atletas', 'criar') OR public.has_permission('atletas', 'editar'));

DROP POLICY IF EXISTS "athlete_docs_select" ON public.athlete_documents;
CREATE POLICY "athlete_docs_select" ON public.athlete_documents FOR SELECT TO authenticated USING (public.has_permission('atletas', 'visualizar'));

DROP POLICY IF EXISTS "athlete_docs_insert" ON public.athlete_documents;
CREATE POLICY "athlete_docs_insert" ON public.athlete_documents FOR INSERT TO authenticated WITH CHECK (public.has_permission('atletas', 'criar') OR public.has_permission('atletas', 'editar'));

-- 10.6 INTERESSADOS / LEADS (COM SUPORTE TOTAL AO FORMULÁRIO ONLINE PÚBLICO)
-- Permite que pais e responsáveis preencham e enviem inscrições via formulário público sem login!
DROP POLICY IF EXISTS "leads_anon_public_insert" ON public.leads;
CREATE POLICY "leads_anon_public_insert" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

-- Consulta apenas para operadores internos autenticados e autorizados
DROP POLICY IF EXISTS "leads_select_auth" ON public.leads;
CREATE POLICY "leads_select_auth" ON public.leads FOR SELECT TO authenticated USING (public.has_permission('interessados', 'visualizar'));

DROP POLICY IF EXISTS "leads_update_auth" ON public.leads;
CREATE POLICY "leads_update_auth" ON public.leads FOR UPDATE TO authenticated USING (public.has_permission('interessados', 'editar')) WITH CHECK (public.has_permission('interessados', 'editar'));

DROP POLICY IF EXISTS "leads_delete_auth" ON public.leads;
CREATE POLICY "leads_delete_auth" ON public.leads FOR DELETE TO authenticated USING (public.has_permission('interessados', 'inativar') OR public.is_admin());

-- 10.7 AULAS EXPERIMENTAIS (TRIAL_CLASSES)
DROP POLICY IF EXISTS "trial_classes_select" ON public.trial_classes;
CREATE POLICY "trial_classes_select" ON public.trial_classes FOR SELECT TO authenticated USING (public.has_permission('interessados', 'visualizar'));

DROP POLICY IF EXISTS "trial_classes_insert" ON public.trial_classes;
CREATE POLICY "trial_classes_insert" ON public.trial_classes FOR INSERT TO authenticated WITH CHECK (public.has_permission('interessados', 'criar'));

DROP POLICY IF EXISTS "trial_classes_update" ON public.trial_classes;
CREATE POLICY "trial_classes_update" ON public.trial_classes FOR UPDATE TO authenticated USING (public.has_permission('interessados', 'editar')) WITH CHECK (public.has_permission('interessados', 'editar'));

DROP POLICY IF EXISTS "trial_classes_delete" ON public.trial_classes;
CREATE POLICY "trial_classes_delete" ON public.trial_classes FOR DELETE TO authenticated USING (public.has_permission('interessados', 'inativar') OR public.is_admin());

-- 10.8 TREINOS & PRESENÇAS (TRAINING_SESSIONS, ATTENDANCES, ABSENCE_JUSTIFICATIONS)
DROP POLICY IF EXISTS "training_sessions_select" ON public.training_sessions;
CREATE POLICY "training_sessions_select" ON public.training_sessions FOR SELECT TO authenticated USING (public.has_permission('presencas', 'visualizar'));

DROP POLICY IF EXISTS "training_sessions_insert" ON public.training_sessions;
CREATE POLICY "training_sessions_insert" ON public.training_sessions FOR INSERT TO authenticated WITH CHECK (public.has_permission('presencas', 'criar'));

DROP POLICY IF EXISTS "training_sessions_update" ON public.training_sessions;
CREATE POLICY "training_sessions_update" ON public.training_sessions FOR UPDATE TO authenticated USING (public.has_permission('presencas', 'editar')) WITH CHECK (public.has_permission('presencas', 'editar'));

DROP POLICY IF EXISTS "attendances_select" ON public.attendances;
CREATE POLICY "attendances_select" ON public.attendances FOR SELECT TO authenticated USING (public.has_permission('presencas', 'visualizar'));

DROP POLICY IF EXISTS "attendances_insert" ON public.attendances;
CREATE POLICY "attendances_insert" ON public.attendances FOR INSERT TO authenticated WITH CHECK (public.has_permission('presencas', 'criar'));

DROP POLICY IF EXISTS "attendances_update" ON public.attendances;
CREATE POLICY "attendances_update" ON public.attendances FOR UPDATE TO authenticated USING (public.has_permission('presencas', 'editar')) WITH CHECK (public.has_permission('presencas', 'editar'));

DROP POLICY IF EXISTS "justifications_select" ON public.absence_justifications;
CREATE POLICY "justifications_select" ON public.absence_justifications FOR SELECT TO authenticated USING (public.has_permission('presencas', 'visualizar'));

DROP POLICY IF EXISTS "justifications_insert" ON public.absence_justifications;
CREATE POLICY "justifications_insert" ON public.absence_justifications FOR INSERT TO authenticated WITH CHECK (public.has_permission('presencas', 'criar'));

-- 10.9 FINANCEIRO (MONTHLY_FEES, EXTRA_REVENUES, NEGOTIATIONS, FINANCIAL_TRANSACTIONS)
DROP POLICY IF EXISTS "monthly_fees_select" ON public.monthly_fees;
CREATE POLICY "monthly_fees_select" ON public.monthly_fees FOR SELECT TO authenticated USING (public.has_permission('financeiro', 'visualizar'));

DROP POLICY IF EXISTS "monthly_fees_insert" ON public.monthly_fees;
CREATE POLICY "monthly_fees_insert" ON public.monthly_fees FOR INSERT TO authenticated WITH CHECK (public.has_permission('financeiro', 'criar'));

DROP POLICY IF EXISTS "monthly_fees_update" ON public.monthly_fees;
CREATE POLICY "monthly_fees_update" ON public.monthly_fees FOR UPDATE TO authenticated USING (public.has_permission('financeiro', 'editar')) WITH CHECK (public.has_permission('financeiro', 'editar'));

DROP POLICY IF EXISTS "monthly_fees_delete" ON public.monthly_fees;
CREATE POLICY "monthly_fees_delete" ON public.monthly_fees FOR DELETE TO authenticated USING (public.has_permission('financeiro', 'inativar') OR public.is_admin());

DROP POLICY IF EXISTS "extra_revenues_all" ON public.extra_revenues;
CREATE POLICY "extra_revenues_all" ON public.extra_revenues FOR ALL TO authenticated USING (public.has_permission('financeiro', 'visualizar')) WITH CHECK (public.has_permission('financeiro', 'criar') OR public.has_permission('financeiro', 'editar'));

DROP POLICY IF EXISTS "negotiations_all" ON public.negotiations;
CREATE POLICY "negotiations_all" ON public.negotiations FOR ALL TO authenticated USING (public.has_permission('financeiro', 'visualizar')) WITH CHECK (public.has_permission('financeiro', 'criar') OR public.has_permission('financeiro', 'editar'));

DROP POLICY IF EXISTS "financial_trans_all" ON public.financial_transactions;
CREATE POLICY "financial_trans_all" ON public.financial_transactions FOR ALL TO authenticated USING (public.has_permission('financeiro', 'visualizar')) WITH CHECK (public.has_permission('financeiro', 'criar') OR public.has_permission('financeiro', 'editar'));

-- 10.10 JOGOS & COMPETIÇÕES (GAMES, MATCH_PARTICIPANTS, MATCH_GOALS)
DROP POLICY IF EXISTS "games_select" ON public.games;
CREATE POLICY "games_select" ON public.games FOR SELECT TO authenticated USING (public.has_permission('jogos', 'visualizar'));

DROP POLICY IF EXISTS "games_insert" ON public.games;
CREATE POLICY "games_insert" ON public.games FOR INSERT TO authenticated WITH CHECK (public.has_permission('jogos', 'criar'));

DROP POLICY IF EXISTS "games_update" ON public.games;
CREATE POLICY "games_update" ON public.games FOR UPDATE TO authenticated USING (public.has_permission('jogos', 'editar')) WITH CHECK (public.has_permission('jogos', 'editar'));

DROP POLICY IF EXISTS "games_delete" ON public.games;
CREATE POLICY "games_delete" ON public.games FOR DELETE TO authenticated USING (public.has_permission('jogos', 'inativar') OR public.is_admin());

DROP POLICY IF EXISTS "match_participants_all" ON public.match_participants;
CREATE POLICY "match_participants_all" ON public.match_participants FOR ALL TO authenticated USING (public.has_permission('jogos', 'visualizar')) WITH CHECK (public.has_permission('jogos', 'criar') OR public.has_permission('jogos', 'editar'));

DROP POLICY IF EXISTS "match_goals_all" ON public.match_goals;
CREATE POLICY "match_goals_all" ON public.match_goals FOR ALL TO authenticated USING (public.has_permission('jogos', 'visualizar')) WITH CHECK (public.has_permission('jogos', 'criar') OR public.has_permission('jogos', 'editar'));

-- 10.11 AVALIAÇÕES TÉCNICAS (EVALUATIONS)
DROP POLICY IF EXISTS "evaluations_select" ON public.evaluations;
CREATE POLICY "evaluations_select" ON public.evaluations FOR SELECT TO authenticated USING (public.has_permission('avaliacoes', 'visualizar'));

DROP POLICY IF EXISTS "evaluations_insert" ON public.evaluations;
CREATE POLICY "evaluations_insert" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (public.has_permission('avaliacoes', 'criar'));

DROP POLICY IF EXISTS "evaluations_update" ON public.evaluations;
CREATE POLICY "evaluations_update" ON public.evaluations FOR UPDATE TO authenticated USING (public.has_permission('avaliacoes', 'editar')) WITH CHECK (public.has_permission('avaliacoes', 'editar'));

DROP POLICY IF EXISTS "evaluations_delete" ON public.evaluations;
CREATE POLICY "evaluations_delete" ON public.evaluations FOR DELETE TO authenticated USING (public.has_permission('avaliacoes', 'inativar') OR public.is_admin());

-- ==============================================================================
-- 11. PERMISSÕES DE ACESSO AO SCHEMA PUBLIC (GRANTS & POLÍTICAS ANON)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Políticas para acesso e sincronização da aplicação via Anon Key
DROP POLICY IF EXISTS "athletes_anon_sync" ON public.athletes;
CREATE POLICY "athletes_anon_sync" ON public.athletes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "responsibles_anon_sync" ON public.responsibles;
CREATE POLICY "responsibles_anon_sync" ON public.responsibles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "soccer_classes_anon_sync" ON public.soccer_classes;
CREATE POLICY "soccer_classes_anon_sync" ON public.soccer_classes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leads_anon_sync" ON public.leads;
CREATE POLICY "leads_anon_sync" ON public.leads FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trial_classes_anon_sync" ON public.trial_classes;
CREATE POLICY "trial_classes_anon_sync" ON public.trial_classes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "monthly_fees_anon_sync" ON public.monthly_fees;
CREATE POLICY "monthly_fees_anon_sync" ON public.monthly_fees FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "evaluations_anon_sync" ON public.evaluations;
CREATE POLICY "evaluations_anon_sync" ON public.evaluations FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "athlete_history_anon_sync" ON public.athlete_history;
CREATE POLICY "athlete_history_anon_sync" ON public.athlete_history FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "athlete_docs_anon_sync" ON public.athlete_documents;
CREATE POLICY "athlete_docs_anon_sync" ON public.athlete_documents FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. ÍNDICES DE OTIMIZAÇÃO DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_athletes_class ON public.athletes(current_class_id);
CREATE INDEX IF NOT EXISTS idx_athletes_responsible ON public.athletes(responsible_id);
CREATE INDEX IF NOT EXISTS idx_athletes_status ON public.athletes(status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_entry_date ON public.leads(entry_date);
CREATE INDEX IF NOT EXISTS idx_trial_classes_date ON public.trial_classes(class_date);
CREATE INDEX IF NOT EXISTS idx_trial_classes_lead ON public.trial_classes(lead_id);
CREATE INDEX IF NOT EXISTS idx_attendances_training ON public.attendances(training_id);
CREATE INDEX IF NOT EXISTS idx_attendances_athlete ON public.attendances(athlete_id);
CREATE INDEX IF NOT EXISTS idx_monthly_fees_athlete ON public.monthly_fees(athlete_id);
CREATE INDEX IF NOT EXISTS idx_monthly_fees_due ON public.monthly_fees(due_date);
CREATE INDEX IF NOT EXISTS idx_monthly_fees_status ON public.monthly_fees(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_athlete ON public.evaluations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ==============================================================================
-- 13. CONFIGURAÇÃO DO SUPABASE STORAGE (BUCKETS & POLÍTICAS PARA FOTOS E DOCS)
-- ==============================================================================

-- 13.1 Criar os buckets públicos no schema storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('athlete-photos', 'athlete-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('athlete-documents', 'athlete-documents', true, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 13.2 Políticas de RLS para o bucket 'athlete-photos'
DROP POLICY IF EXISTS "Public Select Athlete Photos" ON storage.objects;
CREATE POLICY "Public Select Athlete Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Insert Athlete Photos" ON storage.objects;
CREATE POLICY "Public Insert Athlete Photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Update Athlete Photos" ON storage.objects;
CREATE POLICY "Public Update Athlete Photos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Delete Athlete Photos" ON storage.objects;
CREATE POLICY "Public Delete Athlete Photos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'athlete-photos');

-- 13.3 Políticas de RLS para o bucket 'athlete-documents'
DROP POLICY IF EXISTS "Public Select Athlete Docs" ON storage.objects;
CREATE POLICY "Public Select Athlete Docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Public Insert Athlete Docs" ON storage.objects;
CREATE POLICY "Public Insert Athlete Docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Public Update Athlete Docs" ON storage.objects;
CREATE POLICY "Public Update Athlete Docs"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Public Delete Athlete Docs" ON storage.objects;
CREATE POLICY "Public Delete Athlete Docs"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'athlete-documents');

-- 14. INICIALIZAÇÃO DO ADMINISTRADOR MASTER
-- Garante a criação do perfil inicial de Américo Germano
INSERT INTO public.profiles (id, email, name, role, active, created_at, updated_at)
VALUES (
  '59528021-0999-4dde-8bfa-938a3ee94651',
  'jamericogermano@gmail.com',
  'Américo Germano',
  'ADMINISTRADOR',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = 'Américo Germano',
    email = 'jamericogermano@gmail.com',
    role = 'ADMINISTRADOR',
    active = TRUE,
    updated_at = NOW();

-- ==============================================================================
-- FIM DO SCRIPT DE CRIAÇÃO E SEGURANÇA SUPABASE RLS
-- ==============================================================================
`;
