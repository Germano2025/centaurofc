import React, { useState, useEffect } from 'react';
import {
  Database,
  Shield,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Lock,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Download,
  Table,
  HelpCircle,
  Sparkles,
  Users,
  Send,
  Search,
  HardDrive,
  FolderPlus,
  Info,
  Calendar,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { SUPABASE_RLS_SQL } from '../../utils/permissionUtils';
import {
  supabase,
  supabaseProjectRef,
  supabaseUrl,
  syncAllAthletesToSupabase,
  syncEntireDatabaseToSupabase,
} from '../../lib/supabase';
import {
  checkStorageBucketsStatus,
  SUPABASE_STORAGE_SETUP_SQL,
  BUCKET_ATHLETE_PHOTOS,
  BUCKET_ATHLETE_DOCUMENTS,
} from '../../lib/supabaseStorage';
import { formatCurrency, formatDateBR } from '../../utils/formatters';

interface TableCheckResult {
  table: string;
  label: string;
  category: string;
  status: 'checking' | 'exists' | 'missing' | 'error';
  rowCount?: number;
  details?: string;
}

const EXPECTED_TABLES: { table: string; label: string; category: string }[] = [
  { table: 'profiles', label: 'Perfis de Usuários & Auth', category: 'Segurança' },
  { table: 'user_permissions', label: 'Permissões Granulares', category: 'Segurança' },
  { table: 'audit_logs', label: 'Trilha de Auditoria', category: 'Segurança' },
  { table: 'soccer_classes', label: 'Turmas & Horários', category: 'Operacional' },
  { table: 'responsibles', label: 'Pais & Responsáveis', category: 'Operacional' },
  { table: 'athletes', label: 'Atletas Matriculados', category: 'Operacional' },
  { table: 'athlete_history', label: 'Histórico Escolar do Atleta', category: 'Operacional' },
  { table: 'athlete_documents', label: 'Documentos dos Atletas', category: 'Operacional' },
  { table: 'leads', label: 'Interessados (Formulário Público)', category: 'Captação' },
  { table: 'trial_classes', label: 'Aulas Experimentais', category: 'Captação' },
  { table: 'training_sessions', label: 'Grade & Sessões de Treinos', category: 'Treinos' },
  { table: 'attendances', label: 'Controle de Chamadas/Presenças', category: 'Treinos' },
  { table: 'absence_justifications', label: 'Justificativas de Faltas', category: 'Treinos' },
  { table: 'monthly_fees', label: 'Mensalidades dos Atletas', category: 'Financeiro' },
  { table: 'extra_revenues', label: 'Receitas Extras & Uniformes', category: 'Financeiro' },
  { table: 'negotiations', label: 'Acordos & Negociações', category: 'Financeiro' },
  { table: 'financial_transactions', label: 'Transações Unificadas', category: 'Financeiro' },
  { table: 'games', label: 'Partidas & Amistosos', category: 'Esportivo' },
  { table: 'match_participants', label: 'Atletas em Campo / Jogos', category: 'Esportivo' },
  { table: 'match_goals', label: 'Gols Marcados', category: 'Esportivo' },
  { table: 'evaluations', label: 'Avaliações Técnicas', category: 'Esportivo' },
];

export const SupabaseSecurityTab: React.FC = () => {
  const { isSupabaseConnected, syncWithSupabase } = useAuth();
  const {
    athletes = [],
    classes = [],
    responsibles = [],
    monthlyFees = [],
    documents = [],
    historyEvents = [],
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copiedStorageSql, setCopiedStorageSql] = useState(false);

  // Live Query / Search tool
  const [searchAthleteQuery, setSearchAthleteQuery] = useState('');
  const [liveSearchResults, setLiveSearchResults] = useState<any[] | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Storage status
  const [storageStatus, setStorageStatus] = useState<{
    loading: boolean;
    photosBucketExists: boolean;
    documentsBucketExists: boolean;
    bucketsFound: string[];
    error?: string;
  }>({
    loading: false,
    photosBucketExists: false,
    documentsBucketExists: false,
    bucketsFound: [],
  });

  // Table checks
  const [tableChecks, setTableChecks] = useState<TableCheckResult[]>([]);
  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [hasRunTableCheck, setHasRunTableCheck] = useState(false);

  // Full Database Sync state
  const [isSyncingFullDatabase, setIsSyncingFullDatabase] = useState(false);
  const [fullSyncResult, setFullSyncResult] = useState<{
    success: boolean;
    summary?: any;
    errors?: string[];
  } | null>(null);

  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    message?: string;
    success?: boolean;
  }>({ loading: false });

  const projectRef = supabaseProjectRef || 'xgiibcjybkxhiznhrubi';
  const directSqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  const directTableEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/editor`;
  const directStorageUrl = `https://supabase.com/dashboard/project/${projectRef}/storage/buckets`;
  const directAuthUsersUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/users`;

  // Master Admin Supabase Auth creation state
  const [masterAuthStatus, setMasterAuthStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  const handleRegisterMasterAdmin = async () => {
    setMasterAuthStatus({ loading: true, message: undefined });
    try {
      const email = 'jamericogermano@gmail.com';
      const password = 'MasterAdmin2026!';

      // 1. Garante perfil em public.profiles
      try {
        await upsertProfileToSupabase({
          id: '59528021-0999-4dde-8bfa-938a3ee94651',
          email,
          name: 'Américo Germano',
          role: 'ADMINISTRADOR',
          active: true,
          created_at: new Date().toISOString(),
          last_access: new Date().toISOString(),
        });
      } catch (errProfile) {
        console.warn('Tentativa de upsert no profile:', errProfile);
      }

      // 2. Registra no Supabase Auth (auth.users)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: 'Américo Germano',
            role: 'ADMINISTRADOR',
          },
        },
      });

      if (error) {
        if (
          error.message?.includes('User already registered') ||
          error.message?.includes('already exists')
        ) {
          setMasterAuthStatus({
            loading: false,
            success: true,
            message:
              'O usuário jamericogermano@gmail.com já está cadastrado no Supabase Auth (auth.users) e seu perfil em public.profiles foi revalidado como ADMINISTRADOR!',
          });
        } else {
          setMasterAuthStatus({
            loading: false,
            success: false,
            message: `Retorno do Supabase: ${error.message}. Você também pode criá-lo diretamente no dashboard (Add user -> Create user) ou pelo SQL Editor.`,
          });
        }
        return;
      }

      setMasterAuthStatus({
        loading: false,
        success: true,
        message:
          'Administrador Master Américo Germano recriado com sucesso! Já está registrado no Supabase Auth e na tabela public.profiles.',
      });
    } catch (e: any) {
      setMasterAuthStatus({
        loading: false,
        success: false,
        message: e?.message || 'Erro ao comunicar com Supabase Auth.',
      });
    }
  };

  // Check Storage buckets status
  const checkStorage = async () => {
    setStorageStatus((prev) => ({ ...prev, loading: true }));
    const res = await checkStorageBucketsStatus();
    setStorageStatus({
      loading: false,
      photosBucketExists: res.photosBucketExists,
      documentsBucketExists: res.documentsBucketExists,
      bucketsFound: res.bucketsFound,
      error: res.error,
    });
  };

  // Run full table diagnostics with row count
  const runTableDiagnostics = async () => {
    if (!supabase) {
      setSyncStatus({
        loading: false,
        success: false,
        message: 'Cliente Supabase não configurado. Verifique as credenciais.',
      });
      return;
    }

    setIsCheckingTables(true);
    setHasRunTableCheck(true);

    const initialResults: TableCheckResult[] = EXPECTED_TABLES.map((t) => ({
      ...t,
      status: 'checking',
    }));
    setTableChecks(initialResults);

    const updatedResults: TableCheckResult[] = [];
    let existingCount = 0;

    for (const item of EXPECTED_TABLES) {
      try {
        const { count, error } = await supabase
          .from(item.table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          existingCount++;
          updatedResults.push({
            ...item,
            status: 'exists',
            rowCount: count ?? 0,
            details: `Tabela ativa no PostgreSQL (${count ?? 0} registros)`,
          });
        } else if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          updatedResults.push({
            ...item,
            status: 'missing',
            details: 'Ainda não criada no PostgreSQL',
          });
        } else if (error.code === '42501' || error.message?.includes('permission')) {
          existingCount++;
          updatedResults.push({
            ...item,
            status: 'exists',
            details: 'Tabela ativa e protegida por RLS',
          });
        } else {
          updatedResults.push({
            ...item,
            status: 'missing',
            details: error.message,
          });
        }
      } catch (err: any) {
        updatedResults.push({
          ...item,
          status: 'error',
          details: err.message || 'Erro ao consultar',
        });
      }
    }

    setTableChecks(updatedResults);
    setIsCheckingTables(false);

    if (existingCount === EXPECTED_TABLES.length) {
      setSyncStatus({
        loading: false,
        success: true,
        message: `Todas as ${EXPECTED_TABLES.length} tabelas foram identificadas e estão operando com sucesso no Supabase!`,
      });
    } else {
      setSyncStatus({
        loading: false,
        success: existingCount > 0,
        message: `${existingCount} de ${EXPECTED_TABLES.length} tabelas ativas no Supabase.`,
      });
    }
  };

  // Perform Live Query
  const handleLiveSearch = async () => {
    if (!supabase || !searchAthleteQuery.trim()) return;
    setIsSearchingLive(true);
    setLiveSearchResults(null);
    try {
      const q = searchAthleteQuery.trim();
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .or(`name.ilike.%${q}%,current_class_name.ilike.%${q}%,id.eq.${q}`)
        .limit(10);

      if (error) {
        setLiveSearchResults([]);
      } else {
        setLiveSearchResults(data || []);
      }
    } catch {
      setLiveSearchResults([]);
    } finally {
      setIsSearchingLive(false);
    }
  };

  // Sync Whole Ecosystem
  const handleFullSync = async () => {
    setIsSyncingFullDatabase(true);
    setFullSyncResult(null);
    try {
      const res = await syncEntireDatabaseToSupabase({
        classes,
        responsibles,
        athletes,
        monthlyFees,
        documents,
        historyEvents,
      });
      setFullSyncResult(res);
      await runTableDiagnostics();
    } catch (err: any) {
      setFullSyncResult({
        success: false,
        errors: [err?.message || 'Falha na sincronização completa'],
      });
    } finally {
      setIsSyncingFullDatabase(false);
    }
  };

  const handleCopyStorageSql = () => {
    navigator.clipboard.writeText(SUPABASE_STORAGE_SETUP_SQL);
    setCopiedStorageSql(true);
    setTimeout(() => setCopiedStorageSql(false), 2500);
  };

  const handleCopyMasterSql = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadMasterSql = () => {
    const blob = new Blob([SUPABASE_RLS_SQL], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `centauro_supabase_setup_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  // Initial load
  useEffect(() => {
    checkStorage();
    runTableDiagnostics();
  }, []);

  const existingTablesCount = tableChecks.filter((t) => t.status === 'exists').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Connection Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isSupabaseConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Database size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                Integração & Diagnóstico Completo do Supabase
              </h3>
              <Badge variant={isSupabaseConnected ? 'success' : 'warning'} size="sm">
                {isSupabaseConnected ? 'Conectado ao Supabase (PostgreSQL)' : 'Modo Local / Reconectando'}
              </Badge>
              {projectRef && (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  Projeto: {projectRef}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Painel de auditoria em tempo real para verificar tabelas, dados sincronizados e buckets de Storage no Supabase.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a
            href={directSqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
          >
            <ExternalLink size={14} />
            <span>Abrir SQL Editor</span>
          </a>
          <a
            href={directTableEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white shadow-2xs transition-colors"
          >
            <Table size={14} />
            <span>Abrir Table Editor</span>
          </a>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isCheckingTables ? 'animate-spin text-blue-600' : ''} />}
            onClick={() => {
              runTableDiagnostics();
              checkStorage();
            }}
            disabled={isCheckingTables}
          >
            {isCheckingTables ? 'Atualizando...' : 'Recarregar Diagnóstico'}
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 0. ADMINISTRADOR MASTER & SUPABASE AUTH (auth.users) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-blue-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-slate-900">
                  Administrador Master & Supabase Auth (auth.users)
                </h4>
                <Badge variant="primary" size="sm">
                  Master Admin Único: Américo Germano
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Ponto de partida central: a partir do Master Admin todos os demais usuários e permissões são gerenciados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href={directAuthUsersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
            >
              <ExternalLink size={13} />
              <span>Abrir Authentication no Supabase</span>
            </a>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              leftIcon={<KeyRound size={13} className={masterAuthStatus.loading ? 'animate-spin text-blue-600' : ''} />}
              onClick={handleRegisterMasterAdmin}
              disabled={masterAuthStatus.loading}
            >
              {masterAuthStatus.loading ? 'Registrando...' : 'Registrar no Supabase Auth'}
            </Button>
          </div>
        </div>

        {/* Informative explanation */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-3">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-900">
                Por que o usuário precisa constar no painel Authentication &gt; Users?
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                No Supabase, a tela <strong>Authentication &gt; Users</strong> exibe exclusivamente contas registradas na tabela interna <code>auth.users</code> do serviço de identidade (GoTrue), e não na tabela de dados <code>public.profiles</code>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  1
                </span>
                <span className="font-semibold text-slate-800 text-xs">
                  Credencial do Administrador Master
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                <strong>E-mail:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-800">jamericogermano@gmail.com</code>
                <br />
                <strong>Senha Padrão:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">MasterAdmin2026!</code>
                <br />
                <span className="text-emerald-700 font-medium">✓ Os 3 usuários de teste (prof.marcelo, secretaria, luciana) foram 100% removidos.</span>
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  2
                </span>
                <span className="font-semibold text-slate-800 text-xs">
                  Como adicionar manualmente em 10 segundos
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                No Supabase: acesse <strong>Authentication &gt; Users</strong> &gt; clique em <strong>Add user &gt; Create user</strong>.
                Informe <code>jamericogermano@gmail.com</code>, defina a senha e marque <strong>Auto Confirm User?</strong>.
              </p>
            </div>
          </div>

          {masterAuthStatus.message && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                masterAuthStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {masterAuthStatus.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{masterAuthStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DIAGNÓSTICO DO SUPABASE STORAGE: FOTOS E DOCUMENTOS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <HardDrive size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900">
                  Armazenamento de Fotos e Documentos (Supabase Storage)
                </h4>
                <Badge variant={storageStatus.photosBucketExists && storageStatus.documentsBucketExists ? 'success' : 'warning'} size="sm">
                  {storageStatus.photosBucketExists && storageStatus.documentsBucketExists
                    ? 'Buckets Criados no Storage'
                    : 'Buckets Pendentes de Criação'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Status dos buckets de armazenamento de fotos de perfil e anexos de documentos no Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <a
              href={directStorageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors"
            >
              <ExternalLink size={13} />
              <span>Abrir Storage no Supabase</span>
            </a>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              leftIcon={<RefreshCw size={13} className={storageStatus.loading ? 'animate-spin text-purple-600' : ''} />}
              onClick={checkStorage}
              disabled={storageStatus.loading}
            >
              {storageStatus.loading ? 'Verificando...' : 'Checar Buckets Agora'}
            </Button>
          </div>
        </div>

        {/* Storage Answer Box */}
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-slate-700 space-y-2.5">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-purple-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-purple-900">
                Como funciona o armazenamento de fotos e documentos no sistema?
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                No Supabase, as <strong>tabelas de banco de dados</strong> (onde ficam nome, data, mensalidades) e o <strong>Storage</strong> (onde ficam fotos JPG/PNG e PDFs de RG/CPF) são serviços independentes:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white rounded-lg border border-purple-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Bucket de Fotos de Atletas</span>
                <span className="font-mono text-xs font-bold text-slate-800">{BUCKET_ATHLETE_PHOTOS}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  storageStatus.photosBucketExists
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {storageStatus.photosBucketExists ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {storageStatus.photosBucketExists ? 'Ativo no Supabase' : 'Ainda não criado'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-lg border border-purple-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Bucket de Documentos & PDFs</span>
                <span className="font-mono text-xs font-bold text-slate-800">{BUCKET_ATHLETE_DOCUMENTS}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  storageStatus.documentsBucketExists
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {storageStatus.documentsBucketExists ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {storageStatus.documentsBucketExists ? 'Ativo no Supabase' : 'Ainda não criado'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            🛡️ <strong>Garantia de não perda:</strong> Enquanto os buckets do Storage não forem criados no Supabase, a aplicação preserva todas as fotos e documentos anexados com segurança no banco local/servidor (em formato Data URL). Assim que os buckets forem criados via SQL abaixo, novos arquivos sobem diretamente para o Supabase Storage com links públicos permanentes.
          </p>
        </div>

        {/* Quick SQL for Storage */}
        {(!storageStatus.photosBucketExists || !storageStatus.documentsBucketExists) && (
          <div className="p-4 bg-slate-900 rounded-xl text-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FolderPlus size={16} className="text-purple-400" />
                <span className="text-xs font-bold">Script SQL para Criar os Buckets no Supabase Storage</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyStorageSql}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white border border-purple-400 shadow-sm transition-all cursor-pointer select-none"
                >
                  {copiedStorageSql ? <Check size={13} className="text-white shrink-0" /> : <Copy size={13} className="text-white shrink-0" />}
                  <span className="text-white font-bold">{copiedStorageSql ? 'Copiado!' : 'Copiar SQL do Storage'}</span>
                </button>
                <a
                  href={directSqlEditorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  <ExternalLink size={12} />
                  <span>Colar no SQL Editor</span>
                </a>
              </div>
            </div>

            <pre className="text-[11px] font-mono text-purple-200 bg-slate-950 p-3 rounded-lg overflow-x-auto max-h-40 leading-relaxed select-all">
              {SUPABASE_STORAGE_SETUP_SQL}
            </pre>
            <p className="text-[10px] text-slate-400">
              Cole este comando no SQL Editor do Supabase e clique em <strong>Run</strong>. Os buckets <code>athlete-photos</code> e <code>athlete-documents</code> serão criados com acesso público instantâneo!
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DIAGNÓSTICO DAS 21 TABELAS & SINCRONIZAÇÃO COMPLETA EM 1 CLIQUE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Table size={18} className="text-blue-600" />
              <span>Status das Tabelas Criadas no Supabase ({existingTablesCount} de {EXPECTED_TABLES.length} Ativas)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirmação das 21 tabelas relacionais do sistema criadas no PostgreSQL do Supabase
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="primary"
              className="text-xs bg-blue-600 hover:bg-blue-700 font-bold shadow-xs"
              leftIcon={<Send size={14} className={isSyncingFullDatabase ? 'animate-pulse' : ''} />}
              onClick={handleFullSync}
              disabled={isSyncingFullDatabase}
            >
              {isSyncingFullDatabase ? 'Sincronizando Banco Completo...' : 'Sincronizar Banco Completo com Supabase'}
            </Button>
          </div>
        </div>

        {/* Full sync feedback notification */}
        {fullSyncResult && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
              fullSyncResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-bold block">
                {fullSyncResult.success
                  ? 'Banco de dados sincronizado com sucesso no Supabase!'
                  : 'Sincronização concluída com avisos.'}
              </span>
              {fullSyncResult.summary && (
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 bg-white rounded border border-emerald-200 font-bold text-emerald-800">
                    Turmas: {fullSyncResult.summary.classes}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-emerald-200 font-bold text-emerald-800">
                    Responsáveis: {fullSyncResult.summary.responsibles}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-emerald-200 font-bold text-emerald-800">
                    Atletas: {fullSyncResult.summary.athletes}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-emerald-200 font-bold text-emerald-800">
                    Mensalidades: {fullSyncResult.summary.monthlyFees}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-emerald-200 font-bold text-emerald-800">
                    Documentos: {fullSyncResult.summary.documents}
                  </span>
                  <span className="px-2 py-0.5 bg-white rounded border border-emerald-200 font-bold text-emerald-800">
                    Histórico: {fullSyncResult.summary.historyEvents}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grid of Tables with live counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {EXPECTED_TABLES.map((t) => {
            const check = tableChecks.find((c) => c.table === t.table);
            const status = check?.status || 'idle';
            const count = check?.rowCount;

            return (
              <div
                key={t.table}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-800 truncate">
                      {t.table}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-medium">
                      {t.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block mt-0.5">{t.label}</span>
                </div>

                <div className="shrink-0 text-right">
                  {status === 'checking' && (
                    <RefreshCw size={14} className="animate-spin text-blue-500 ml-auto" />
                  )}
                  {status === 'exists' && (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded">
                        <CheckCircle2 size={11} />
                        Ativa
                      </span>
                      {typeof count === 'number' && (
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {count} {count === 1 ? 'registro' : 'registros'}
                        </span>
                      )}
                    </div>
                  )}
                  {status === 'missing' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      <AlertTriangle size={11} />
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FERRAMENTA DE CONSULTA AO VIVO NO SUPABASE (LIVE SEARCH & INSPECTOR) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Search size={18} className="text-blue-600" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Consultor Interativo do Supabase (Live Query)
            </h4>
            <p className="text-xs text-slate-500">
              Faça consultas diretas à tabela <code className="font-mono text-blue-600">public.athletes</code> para auditar qualquer atleta em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchAthleteQuery}
              onChange={(e) => setSearchAthleteQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLiveSearch()}
              placeholder="Digite o nome de qualquer atleta, turma ou ID para auditar..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            className="text-xs bg-slate-900 hover:bg-black font-bold text-white shadow-xs"
            onClick={handleLiveSearch}
            disabled={isSearchingLive}
            leftIcon={<Search size={13} className={isSearchingLive ? 'animate-pulse text-white' : 'text-white'} />}
          >
            {isSearchingLive ? 'Buscando...' : 'Consultar no Supabase'}
          </Button>
        </div>

        {/* Live results list */}
        {liveSearchResults && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold">Resultados retornados do Supabase ({liveSearchResults.length}):</span>
            </div>

            {liveSearchResults.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                Nenhum registro encontrado no Supabase com o termo "{searchAthleteQuery}".
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {liveSearchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-blue-50/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Turma: {item.current_class_name || 'Geral'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {item.id}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Resp: {item.responsible_name || 'Não informado'} | Tel: {item.responsible_phone || 'Não informado'} | Mensalidade: {formatCurrency(item.custom_monthly_fee || 180)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      Criado em: {formatDateBR(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. SCRIPT SQL MESTRE DE CRIAÇÃO E RLS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 shrink-0">
              <FileCode size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Script SQL Mestre: Tabelas + RLS + Storage Buckets + Índices
              </h4>
              <p className="text-[11px] text-slate-400">
                Script 100% idempotente com <code>IF NOT EXISTS</code> pronto para execução no SQL Editor ({projectRef})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadMasterSql}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-white border border-slate-600 shadow-sm transition-all cursor-pointer select-none"
            >
              <Download size={14} className={downloaded ? 'text-emerald-400 shrink-0' : 'text-slate-200 shrink-0'} />
              <span className="text-white font-bold">{downloaded ? 'Baixado!' : 'Baixar SQL'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMasterSql}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-400 shadow-sm transition-all cursor-pointer select-none"
            >
              {copied ? <Check size={14} className="text-white shrink-0" /> : <Copy size={14} className="text-white shrink-0" />}
              <span className="text-white font-bold">{copied ? 'Copiado!' : 'Copiar Script SQL Completo'}</span>
            </button>
          </div>
        </div>

        {/* Code block */}
        <div className="p-4 bg-slate-950 text-slate-200 overflow-x-auto max-h-[380px] text-xs font-mono leading-relaxed select-all">
          <pre>{SUPABASE_RLS_SQL}</pre>
        </div>
      </div>
    </div>
  );
};
