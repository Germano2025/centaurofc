import React, { useState } from 'react';
import {
  Database,
  UploadCloud,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldAlert,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Key,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { ImportModal } from '../common/ImportModal';
import { getAthletesTemplateCSV, getLeadsTemplateCSV, downloadCSV } from '../../utils/csvUtils';

export const DataManagementTab: React.FC = () => {
  const {
    athletes,
    responsibles,
    classes,
    leads,
    importAthletesBulk,
    importLeadsBulk,
    clearDemoData,
    restoreDemoData,
  } = useApp();

  const { addAuditLog } = useAuth();

  // Import modal states
  const [importType, setImportType] = useState<'athletes' | 'leads' | null>(null);

  // Clear demo modal state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [keepClasses, setKeepClasses] = useState(true);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const handleDownloadAthletesTemplate = () => {
    downloadCSV('modelo_importacao_atletas_centauro.csv', getAthletesTemplateCSV());
  };

  const handleDownloadLeadsTemplate = () => {
    downloadCSV('modelo_importacao_interessados_centauro.csv', getLeadsTemplateCSV());
  };

  const handleConfirmClear = async () => {
    if (confirmKeyword.trim().toUpperCase() !== 'LIMPAR') return;
    setIsClearing(true);
    try {
      await clearDemoData({ keepClasses });
      addAuditLog({
        action_type: 'ALTERACAO_PERMISSOES',
        description: `Limpeza de dados de demonstração realizada para início de produção (manter turmas: ${keepClasses ? 'Sim' : 'Não'}).`,
        details: { keepClasses },
      });
      setIsClearModalOpen(false);
      setConfirmKeyword('');
      setSuccessMessage('Base de dados limpa com sucesso! O sistema está pronto para cadastros reais.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Erro ao limpar base: ${err.message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmRestore = async () => {
    setIsRestoreModalOpen(false);
    try {
      await restoreDemoData();
      addAuditLog({
        action_type: 'ALTERACAO_PERMISSOES',
        description: 'Restauração de dados fictícios de demonstração realizada.',
      });
      setSuccessMessage('Dados de demonstração restaurados com sucesso.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Erro ao restaurar dados: ${err.message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // GitHub integration state
  const [githubStatus, setGithubStatus] = useState<{
    connected: boolean;
    repository: string;
    branch: string;
    lastCommit: string;
    hasToken: boolean;
  } | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [customCommitMessage, setCustomCommitMessage] = useState('');

  const loadGithubStatus = async () => {
    try {
      const res = await fetch('/api/github/status');
      if (res.ok) {
        const data = await res.json();
        setGithubStatus(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar status do GitHub:', err);
    }
  };

  React.useEffect(() => {
    loadGithubStatus();
  }, []);

  const handleSaveGithubToken = async () => {
    if (!githubToken.trim()) return;
    setIsSavingToken(true);
    try {
      const res = await fetch('/api/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Token do GitHub salvo com sucesso!');
        setGithubToken('');
        loadGithubStatus();
      } else {
        setErrorMessage(data.error || 'Erro ao salvar token');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setIsSavingToken(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
    }
  };

  const handleSyncGithub = async () => {
    setIsSyncingGithub(true);
    try {
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: customCommitMessage.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Repositório GitHub atualizado com sucesso (commit & push)!');
        setCustomCommitMessage('');
        loadGithubStatus();
      } else {
        setErrorMessage(data.details || data.error || 'Falha ao sincronizar com o GitHub.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de comunicação ao sincronizar.');
    } finally {
      setIsSyncingGithub(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-xl flex items-start gap-2 text-xs font-medium">
          <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <span className="whitespace-pre-line leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Atletas</p>
            <p className="text-xl font-bold text-slate-900">{athletes.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Responsáveis</p>
            <p className="text-xl font-bold text-slate-900">{responsibles.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Turmas</p>
            <p className="text-xl font-bold text-slate-900">{classes.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Interessados</p>
            <p className="text-xl font-bold text-slate-900">{leads.length}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Import Mass Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud size={18} className="text-blue-600" />
              <span>Importação em Massa via Planilha (CSV)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Alimente o sistema com seus atletas, responsáveis e contatos reais de uma única vez.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadAthletesTemplate}
            >
              Modelo Atletas
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadLeadsTemplate}
            >
              Modelo Interessados
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Athletes Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <FileSpreadsheet size={16} className="text-blue-600" />
                <span>Importar Atletas & Responsáveis</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Importe uma lista com nome do atleta, data de nascimento, responsável legal, telefone, turma e
                valor de mensalidade. Os vínculos de parentesco e cobrança são criados automaticamente.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UploadCloud size={14} />}
              onClick={() => setImportType('athletes')}
            >
              Importar Planilha de Atletas
            </Button>
          </div>

          {/* Leads Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                <span>Importar Funil de Interessados</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Carregue seus contatos comerciais e solicitações de aula experimental para iniciar o funil de
                conversão organizado por etapas (Novo Contato, Agendado, Em Decisão).
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<UploadCloud size={14} />}
              onClick={() => setImportType('leads')}
              className="border-slate-300 text-slate-800 hover:bg-slate-100"
            >
              Importar Planilha de Interessados
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Production Readiness / Clear Demo Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trash2 size={18} className="text-rose-600" />
            <span>Iniciar Produção (Limpeza de Dados de Teste)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Zere os dados fictícios de demonstração para que a escola inicie operando exclusivamente com dados
            reais.
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-600" />
              Limpeza Segura de Dados Fictícios
            </p>
            <p className="text-xs text-amber-800 leading-relaxed max-w-xl">
              Remove todos os atletas, responsáveis, registros financeiros e contatos de demonstração. Você pode
              optar por manter a grade de turmas e horários já cadastrada.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setIsClearModalOpen(true)}
            >
              Limpar Dados de Teste
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => setIsRestoreModalOpen(true)}
              className="text-slate-600 hover:text-slate-900"
            >
              Restaurar Demonstração
            </Button>
          </div>
        </div>
      </div>

      {/* Section: GitHub Integration */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch size={18} className="text-slate-800" />
              <span>Integração & Sincronização com o GitHub</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Conectado ao repositório oficial <span className="font-mono text-slate-700 font-semibold">Germano2025/centauro</span> na branch <span className="font-mono text-slate-700 font-semibold">main</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${githubStatus?.hasToken ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${githubStatus?.hasToken ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {githubStatus?.hasToken ? 'Autenticado' : 'Aguardando Token'}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Repositório Remoto</span>
              <a
                href="https://github.com/Germano2025/centauro"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Abrir GitHub <ExternalLink size={12} />
              </a>
            </div>
            <p className="text-xs font-mono font-medium text-slate-800 truncate">
              https://github.com/Germano2025/centauro.git
            </p>
            <p className="text-[11px] text-slate-500">
              Branch ativa: <span className="font-mono font-semibold text-slate-700">{githubStatus?.branch || 'main'}</span>
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Último Commit</span>
            <p className="text-xs font-mono font-medium text-slate-800 truncate">
              {githubStatus?.lastCommit || 'Carregando...'}
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-600" /> Versão base commitada e pronta
            </p>
          </div>
        </div>

        {/* Token Configuration if needed */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Key size={14} className="text-amber-600" />
                Token de Acesso do GitHub (Personal Access Token)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {githubStatus?.hasToken
                  ? 'Token já configurado no sistema! Você pode atualizá-lo caso gere um novo token.'
                  : 'Cole seu Personal Access Token do GitHub (com permissão de escrita/repo) para permitir commits e push automáticos sem senha.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveGithubToken}
              disabled={isSavingToken || !githubToken.trim()}
            >
              {isSavingToken ? 'Salvando...' : 'Salvar Token'}
            </Button>
          </div>
        </div>

        {/* Sync Action Area */}
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <RefreshCw size={14} className={`text-blue-600 ${isSyncingGithub ? 'animate-spin' : ''}`} />
              Sincronização com um Comando
            </p>
            <p className="text-xs text-blue-900 leading-relaxed max-w-xl">
              Gera o commit com todas as modificações atuais do código e envia diretamente para o GitHub.
              <span className="block mt-1 font-semibold text-blue-950">
                💬 Você também pode apenas dizer no chat: "Atualize o GitHub" a qualquer momento!
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<GitCommit size={14} />}
              onClick={handleSyncGithub}
              disabled={isSyncingGithub}
            >
              {isSyncingGithub ? 'Sincronizando...' : 'Atualizar GitHub Agora'}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 3: Storage Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Database size={16} className="text-blue-600" />
          <span>Status do Armazenamento Persistente</span>
        </div>
        <p className="leading-relaxed">
          Os dados importados ou criados através dos módulos são armazenados de forma persistente no servidor e sincronizados localmente no navegador, garantindo agilidade, disponibilidade e integridade das informações operacionais da escola.
        </p>
      </div>

      {/* Import Modal */}
      {importType && (
        <ImportModal
          isOpen={true}
          type={importType}
          onClose={() => setImportType(null)}
          onImportAthletes={importAthletesBulk}
          onImportLeads={importLeadsBulk}
        />
      )}

      {/* Confirmation Modal to Clear Demo Data */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <ShieldAlert size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-slate-900">Confirmação de Limpeza para Produção</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação apagará os registros fictícios (atletas de teste, cobranças geradas de exemplo e
                interessados de demonstração).
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepClasses}
                  onChange={(e) => setKeepClasses(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Preservar turmas e horários (Recomendado)</span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6.5">
                Mantém as categorias e horários de treino já configurados para receber novos atletas.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Para confirmar a exclusão dos dados de teste, digite <span className="font-bold text-rose-600">LIMPAR</span>:
              </label>
              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="Digite LIMPAR"
                className="w-full text-xs font-mono uppercase px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsClearModalOpen(false);
                  setConfirmKeyword('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={confirmKeyword.trim().toUpperCase() !== 'LIMPAR' || isClearing}
                isLoading={isClearing}
                onClick={handleConfirmClear}
                leftIcon={<Trash2 size={14} />}
              >
                Confirmar Limpeza
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Restore Demo Data */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <RotateCcw size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-bold text-slate-900">Restaurar Dados de Demonstração?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta ação carregará o conjunto completo de atletas fictícios, turmas padrão, mensalidades e interessados de exemplo para testes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRestoreModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRestore}
                leftIcon={<RotateCcw size={14} />}
              >
                Confirmar Restauração
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
