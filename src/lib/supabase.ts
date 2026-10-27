import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Athlete, SoccerClass, Responsible, MonthlyFee, AthleteDocument, AthleteHistoryEvent } from '../types';

const FALLBACK_PROJECT_REF = 'xgiibcjybkxhiznhrubi';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZHFoendqdmtvdGh5YnNkZXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzk4OTEsImV4cCI6MjEwNTY1NTg5MX0.l-zQlh3xgpdDhEK37auhFmYBQ7ZhLCy6fxb3ufyJ4h0';

const envUrl =
  (typeof import.meta !== 'undefined' && (
    import.meta.env?.VITE_SUPABASE_URL ||
    (import.meta.env as any)?.SUPABASE_URL ||
    (import.meta.env as any)?.NEXT_PUBLIC_SUPABASE_URL
  )) ||
  (typeof process !== 'undefined' && (
    process.env?.VITE_SUPABASE_URL ||
    process.env?.SUPABASE_URL ||
    process.env?.NEXT_PUBLIC_SUPABASE_URL
  ));

const envKey =
  (typeof import.meta !== 'undefined' && (
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    (import.meta.env as any)?.SUPABASE_ANON_KEY ||
    (import.meta.env as any)?.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )) ||
  (typeof process !== 'undefined' && (
    process.env?.VITE_SUPABASE_ANON_KEY ||
    process.env?.SUPABASE_ANON_KEY ||
    process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ));

function resolveCredentials(): { url: string; key: string; projectRef: string } {
  let rawUrl = (envUrl ? String(envUrl).trim() : '') || FALLBACK_PROJECT_REF;
  let rawKey = (envKey ? String(envKey).trim() : '') || FALLBACK_ANON_KEY;

  if (rawUrl.includes('your-project') || !rawUrl) {
    rawUrl = FALLBACK_PROJECT_REF;
  }
  if (rawKey.includes('your-anon-key') || !rawKey) {
    rawKey = FALLBACK_ANON_KEY;
  }

  let finalUrl = rawUrl;
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}.supabase.co`;
  }

  const projectRef = finalUrl.replace(/^https?:\/\//, '').split('.')[0] || FALLBACK_PROJECT_REF;

  return { url: finalUrl, key: rawKey, projectRef };
}

const credentials = resolveCredentials();

export const supabaseProjectRef: string = credentials.projectRef;
export const supabaseUrl: string = credentials.url;

function initSupabase(): SupabaseClient | null {
  try {
    return createClient(credentials.url, credentials.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Error initializing Supabase client:', err);
    return null;
  }
}

export const supabase = initSupabase();
export const isSupabaseConfigured = supabase !== null;

/**
 * Formata os dados de um atleta para o schema da tabela public.athletes do Supabase
 */
export function formatAthleteForSupabase(a: any) {
  return {
    id: a.id,
    name: a.name,
    birth_date: a.birth_date || a.birthDate || null,
    cpf: a.cpf || null,
    rg: a.rg || null,
    photo_url: a.photo_url || a.photoUrl || null,
    address: a.address || null,
    address_street: a.address_street || null,
    address_number: a.address_number || null,
    address_complement: a.address_complement || null,
    address_neighborhood: a.address_neighborhood || null,
    address_city: a.address_city || null,
    address_state: a.address_state || null,
    address_zip: a.address_zip || null,
    phone: a.phone || null,
    responsible_id: a.responsible_id || null,
    responsible_name: a.responsible_name || null,
    responsible_phone: a.responsible_phone || null,
    current_class_id: a.current_class_id || a.class_id || null,
    current_class_name: a.class_name || a.current_class_name || null,
    status: a.status || 'ATIVO',
    enrollment_date: a.enrollment_date || new Date().toISOString().split('T')[0],
    financial_condition: a.financial_condition || 'PAGANTE_SEM_DESCONTO',
    custom_monthly_fee: a.custom_monthly_fee ?? a.monthly_fee ?? 180,
    payment_due_day: a.payment_due_day || 10,
    uniform_delivered: a.uniform_delivered ?? false,
    notes: a.notes || null,
    created_at: a.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Sincroniza um atleta individual diretamente com o Supabase
 */
export async function syncAthleteToSupabase(athlete: Athlete): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não configurado' };

  try {
    const payload = formatAthleteForSupabase(athlete);
    const { error } = await supabase.from('athletes').upsert([payload], { onConflict: 'id' });

    if (error) {
      console.warn('[SUPABASE] Athlete sync error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[SUPABASE] Athlete sync exception:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Sincroniza toda a base de atletas para o Supabase
 */
export async function syncAllAthletesToSupabase(
  athletesList: Athlete[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) return { success: false, count: 0, error: 'Cliente Supabase não configurado' };
  if (!athletesList || athletesList.length === 0) return { success: true, count: 0 };

  try {
    const formatted = athletesList.map((a) => formatAthleteForSupabase(a));
    const { error } = await supabase.from('athletes').upsert(formatted, { onConflict: 'id' });

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: formatted.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Formata turma para schema soccer_classes
 */
export function formatClassForSupabase(c: SoccerClass) {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    age_group: c.age_group || '',
    schedule_days: Array.isArray(c.schedule_days) ? c.schedule_days : [],
    schedule_time: c.schedule_time || '',
    capacity_recommended: c.capacity_recommended || 30,
    active: c.active ?? true,
    coach_name: c.coach_name || null,
    location: c.location || null,
    notes: c.notes || null,
    is_additional_activity: c.is_additional_activity ?? false,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function syncClassToSupabase(cls: SoccerClass): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não configurado' };
  try {
    const payload = formatClassForSupabase(cls);
    const { error } = await supabase.from('soccer_classes').upsert([payload], { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function syncAllClassesToSupabase(
  classesList: SoccerClass[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) return { success: false, count: 0, error: 'Cliente Supabase não configurado' };
  if (!classesList || classesList.length === 0) return { success: true, count: 0 };
  try {
    const formatted = classesList.map((c) => formatClassForSupabase(c));
    const { error } = await supabase.from('soccer_classes').upsert(formatted, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: formatted.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Formata responsável para schema responsibles
 */
export function formatResponsibleForSupabase(r: Responsible) {
  return {
    id: r.id,
    name: r.name,
    cpf: r.cpf || null,
    phone: r.phone || null,
    email: r.email || null,
    relationship: r.relationship || 'RESPONSÁVEL',
    address: r.address || null,
    address_street: r.address_street || null,
    address_number: r.address_number || null,
    address_complement: r.address_complement || null,
    address_neighborhood: r.address_neighborhood || null,
    address_city: r.address_city || null,
    address_state: r.address_state || null,
    address_zip: r.address_zip || null,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function syncResponsibleToSupabase(resp: Responsible): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não configurado' };
  try {
    const payload = formatResponsibleForSupabase(resp);
    const { error } = await supabase.from('responsibles').upsert([payload], { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function syncAllResponsiblesToSupabase(
  responsiblesList: Responsible[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) return { success: false, count: 0, error: 'Cliente Supabase não configurado' };
  if (!responsiblesList || responsiblesList.length === 0) return { success: true, count: 0 };
  try {
    const formatted = responsiblesList.map((r) => formatResponsibleForSupabase(r));
    const { error } = await supabase.from('responsibles').upsert(formatted, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: formatted.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Formata mensalidade para schema monthly_fees
 */
export function formatMonthlyFeeForSupabase(f: MonthlyFee) {
  return {
    id: f.id,
    athlete_id: f.athlete_id,
    reference_month: f.reference_month,
    original_amount: f.original_amount,
    discount_amount: f.discount_amount || 0,
    card_fee_amount: f.card_fee_amount || 0,
    final_amount: f.final_amount,
    due_date: f.due_date,
    payment_date: f.payment_date || null,
    payment_method: f.payment_method || null,
    status: f.status,
    negotiation_id: f.negotiation_id || null,
    notes: f.notes || null,
    created_at: f.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function syncMonthlyFeeToSupabase(fee: MonthlyFee): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não configurado' };
  try {
    const payload = formatMonthlyFeeForSupabase(fee);
    const { error } = await supabase.from('monthly_fees').upsert([payload], { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function syncAllMonthlyFeesToSupabase(
  feesList: MonthlyFee[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase) return { success: false, count: 0, error: 'Cliente Supabase não configurado' };
  if (!feesList || feesList.length === 0) return { success: true, count: 0 };
  try {
    const formatted = feesList.map((f) => formatMonthlyFeeForSupabase(f));
    const { error } = await supabase.from('monthly_fees').upsert(formatted, { onConflict: 'id' });
    if (error) return { success: false, count: 0, error: error.message };
    return { success: true, count: formatted.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Formata documento para schema athlete_documents
 */
export function formatDocumentForSupabase(doc: AthleteDocument) {
  return {
    id: doc.id,
    athlete_id: doc.athlete_id,
    file_name: doc.file_name,
    file_type: doc.file_type,
    file_size: doc.file_size || null,
    file_url: doc.file_url,
    notes: doc.notes || null,
    uploaded_at: doc.uploaded_at || new Date().toISOString(),
  };
}

export async function syncDocumentToSupabase(doc: AthleteDocument): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não configurado' };
  try {
    const payload = formatDocumentForSupabase(doc);
    const { error } = await supabase.from('athlete_documents').upsert([payload], { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Formata evento do histórico para schema athlete_history
 */
export function formatHistoryEventForSupabase(event: AthleteHistoryEvent) {
  return {
    id: event.id,
    athlete_id: event.athlete_id,
    event_type: event.event_type,
    description: event.description,
    old_value: event.old_value || null,
    new_value: event.new_value || null,
    event_date: event.event_date || new Date().toISOString().split('T')[0],
    registered_by: event.registered_by || 'Sistema',
    created_at: event.created_at || new Date().toISOString(),
  };
}

export async function syncHistoryEventToSupabase(
  event: AthleteHistoryEvent
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Cliente Supabase não configurado' };
  try {
    const payload = formatHistoryEventForSupabase(event);
    const { error } = await supabase.from('athlete_history').upsert([payload], { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Sincroniza TODO o ecossistema com o Supabase de forma estruturada
 */
export async function syncEntireDatabaseToSupabase(data: {
  classes: SoccerClass[];
  responsibles: Responsible[];
  athletes: Athlete[];
  monthlyFees?: MonthlyFee[];
  documents?: AthleteDocument[];
  historyEvents?: AthleteHistoryEvent[];
}): Promise<{
  success: boolean;
  summary: {
    classes: number;
    responsibles: number;
    athletes: number;
    monthlyFees: number;
    documents: number;
    historyEvents: number;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const summary = {
    classes: 0,
    responsibles: 0,
    athletes: 0,
    monthlyFees: 0,
    documents: 0,
    historyEvents: 0,
  };

  if (!supabase) {
    return { success: false, summary, errors: ['Cliente Supabase não configurado'] };
  }

  // 1. Turmas (classes)
  if (data.classes && data.classes.length > 0) {
    const rClasses = await syncAllClassesToSupabase(data.classes);
    if (rClasses.success) summary.classes = rClasses.count;
    else errors.push(`Turmas: ${rClasses.error}`);
  }

  // 2. Responsáveis
  if (data.responsibles && data.responsibles.length > 0) {
    const rResp = await syncAllResponsiblesToSupabase(data.responsibles);
    if (rResp.success) summary.responsibles = rResp.count;
    else errors.push(`Responsáveis: ${rResp.error}`);
  }

  // 3. Atletas
  if (data.athletes && data.athletes.length > 0) {
    const rAth = await syncAllAthletesToSupabase(data.athletes);
    if (rAth.success) summary.athletes = rAth.count;
    else errors.push(`Atletas: ${rAth.error}`);
  }

  // 4. Mensalidades
  if (data.monthlyFees && data.monthlyFees.length > 0) {
    const rFees = await syncAllMonthlyFeesToSupabase(data.monthlyFees);
    if (rFees.success) summary.monthlyFees = rFees.count;
    else errors.push(`Mensalidades: ${rFees.error}`);
  }

  // 5. Documentos
  if (data.documents && data.documents.length > 0) {
    try {
      const formatted = data.documents.map((d) => formatDocumentForSupabase(d));
      const { error } = await supabase.from('athlete_documents').upsert(formatted, { onConflict: 'id' });
      if (error) errors.push(`Documentos: ${error.message}`);
      else summary.documents = formatted.length;
    } catch (e: any) {
      errors.push(`Documentos: ${e.message}`);
    }
  }

  // 6. Histórico
  if (data.historyEvents && data.historyEvents.length > 0) {
    try {
      const formatted = data.historyEvents.map((h) => formatHistoryEventForSupabase(h));
      const { error } = await supabase.from('athlete_history').upsert(formatted, { onConflict: 'id' });
      if (error) errors.push(`Histórico: ${error.message}`);
      else summary.historyEvents = formatted.length;
    } catch (e: any) {
      errors.push(`Histórico: ${e.message}`);
    }
  }

  return {
    success: errors.length === 0,
    summary,
    errors,
  };
}

/**
 * Busca todos os perfis cadastrados na tabela public.profiles
 */
export async function fetchProfilesFromSupabase(): Promise<{
  success: boolean;
  profiles: any[];
  error?: string;
}> {
  if (!supabase) return { success: false, profiles: [], error: 'Supabase não inicializado' };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { success: false, profiles: [], error: error.message };
    }

    return { success: true, profiles: data || [] };
  } catch (err: any) {
    return { success: false, profiles: [], error: err.message || 'Erro ao buscar perfis' };
  }
}

/**
 * Busca perfil de usuário com suas permissões personalizadas
 */
export async function fetchUserProfileWithPermissions(
  userIdOrEmail: string
): Promise<{
  success: boolean;
  profile?: any;
  customPermissions?: Record<string, boolean>;
  error?: string;
}> {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };

  try {
    const isEmail = userIdOrEmail.includes('@');
    const query = supabase.from('profiles').select('*');

    const { data: profiles, error: profileErr } = isEmail
      ? await query.eq('email', userIdOrEmail.trim().toLowerCase()).limit(1)
      : await query.eq('id', userIdOrEmail).limit(1);

    if (profileErr) {
      return { success: false, error: profileErr.message };
    }

    const profile = profiles && profiles[0];
    if (!profile) {
      return { success: false, error: 'Perfil não encontrado' };
    }

    // Carrega exceções da tabela user_permissions
    const { data: permissionsData, error: permErr } = await supabase
      .from('user_permissions')
      .select('module, action, allowed')
      .eq('user_id', profile.id);

    const customPermissions: Record<string, boolean> = {};
    if (!permErr && Array.isArray(permissionsData)) {
      permissionsData.forEach((row) => {
        customPermissions[`${row.module}:${row.action}`] = Boolean(row.allowed);
      });
    }

    return {
      success: true,
      profile,
      customPermissions: Object.keys(customPermissions).length > 0 ? customPermissions : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao carregar perfil do Supabase' };
  }
}

/**
 * Salva ou atualiza um perfil na tabela public.profiles
 */
export async function upsertProfileToSupabase(profile: {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  phone?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
  last_access?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };

  try {
    const payload: any = {
      id: profile.id,
      email: profile.email.toLowerCase().trim(),
      name: profile.name.trim(),
      role: profile.role,
      active: profile.active,
      phone: profile.phone || null,
      notes: profile.notes || null,
      avatar_url: profile.avatar_url || null,
      updated_at: new Date().toISOString(),
    };

    if (profile.last_access) {
      payload.last_access = profile.last_access;
    }

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao sincronizar perfil' };
  }
}

/**
 * Atualiza permissões granulares na tabela public.user_permissions
 */
export async function saveUserPermissionsToSupabase(
  userId: string,
  permissions: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };

  try {
    // 1. Remove permissões granulares anteriores do usuário
    await supabase.from('user_permissions').delete().eq('user_id', userId);

    // 2. Insere novas regras granulares
    const rows = Object.entries(permissions).map(([key, allowed]) => {
      const [module, action] = key.split(':');
      return {
        user_id: userId,
        module,
        action,
        allowed,
        created_at: new Date().toISOString(),
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from('user_permissions').insert(rows);
      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar permissões' };
  }
}

/**
 * Registra evento de auditoria no Supabase
 */
export async function insertAuditLogToSupabase(log: {
  performer_id: string;
  performer_name: string;
  action_type: string;
  description: string;
  target_user_id?: string;
  target_user_name?: string;
  details?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };

  try {
    const { error } = await supabase.from('audit_logs').insert([
      {
        performer_id: log.performer_id.startsWith('u-') ? null : log.performer_id,
        performer_name: log.performer_name,
        action_type: log.action_type,
        description: log.description,
        target_user_id: log.target_user_id && !log.target_user_id.startsWith('u-') ? log.target_user_id : null,
        target_user_name: log.target_user_name || null,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

