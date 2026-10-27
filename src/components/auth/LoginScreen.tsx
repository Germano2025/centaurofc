import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export type AuthMode = 'login' | 'forgot_password' | 'reset_new_password';

export const LoginScreen: React.FC = () => {
  const {
    signInWithEmail,
    resetPasswordForEmail,
    setUserPassword,
    updatePassword,
    generateSecurePassword,
  } = useAuth();
  const { setActiveModule } = useApp();

  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Detecta se a URL contém token de recuperação do Supabase Auth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        hash.includes('access_token=')
      ) {
        setMode('reset_new_password');
        setSuccessMessage('Link de recuperação identificado! Digite sua nova senha de acesso abaixo.');
      }

      const handlePasswordRecoveryEvent = () => {
        setMode('reset_new_password');
        setSuccessMessage('Sessão de redefinição ativa. Digite sua nova senha.');
      };
      window.addEventListener('ps_password_recovery', handlePasswordRecoveryEvent);
      return () => {
        window.removeEventListener('ps_password_recovery', handlePasswordRecoveryEvent);
      };
    }
  }, []);

  // 1. Submit Tradicional de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu e-mail de acesso.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Informe um formato de e-mail válido.');
      return;
    }

    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signInWithEmail(cleanEmail, cleanPassword);

      if (!res.success) {
        setErrorMessage(
          res.message?.includes('inativado') ? res.message : 'E-mail ou senha incorretos.'
        );
      } else {
        // Redireciona para o Dashboard Geral
        setActiveModule('dashboard');
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          window.history.pushState(null, '', '/');
        }
      }
    } catch {
      setErrorMessage('E-mail ou senha incorretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Gerar senha segura automaticamente
  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setShowConfirmPassword(true);
    setSuccessMessage('Nova senha segura gerada automaticamente! Você já pode salvar abaixo.');
  };

  // 3. Copiar senha para área de transferência
  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // 4. Salvar / Definir Nova Senha diretamente (Esqueci Minha Senha)
  const handleSetNewPasswordDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Informe o e-mail cadastrado da sua conta.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmação não confere com a nova senha digitada.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await setUserPassword(cleanEmail, password);
      if (res.success) {
        setSuccessMessage('Nova senha definida com sucesso! Acessando o sistema...');
        setTimeout(() => {
          setActiveModule('dashboard');
        }, 1000);
      } else {
        setErrorMessage(res.message || 'Não foi possível definir a nova senha.');
      }
    } catch {
      setErrorMessage('Erro inesperado ao definir a nova senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Enviar Link de Recuperação por E-mail (Supabase)
  const handleSendRecoveryEmail = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Informe um e-mail válido para envio do link.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordForEmail(cleanEmail);
      if (res.success) {
        setSuccessMessage(
          res.message || 'Link de recuperação enviado! Verifique sua caixa de entrada.'
        );
      } else {
        setErrorMessage(
          res.message || 'Não foi possível enviar o e-mail de recuperação.'
        );
      }
    } catch {
      setErrorMessage('Erro ao solicitar recuperação por e-mail.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Definir Nova Senha via Token / Link
  const handleResetTokenPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmação não confere com a nova senha digitada.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updatePassword(password);
      if (res.success) {
        setSuccessMessage('Senha atualizada com sucesso no Supabase! Redirecionando...');
        setTimeout(() => {
          setActiveModule('dashboard');
          if (typeof window !== 'undefined' && window.location.hash) {
            window.location.hash = '';
          }
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Erro ao atualizar senha no Supabase.');
      }
    } catch {
      setErrorMessage('Erro inesperado ao definir a nova senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 overflow-hidden z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0A1D37] p-2 border border-amber-500/30 shadow-xl shadow-amber-500/15 mb-3.5 transform transition-transform hover:scale-105">
            <img
              src="/centauro-logo.png"
              alt="Centauro"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-wider">CENTAURO</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-semibold tracking-wide">
            Centro de Formação • Gestão Integrada
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed font-medium">{successMessage}</div>
          </div>
        )}

        {/* 1. MODO: LOGIN TRADICIONAL */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setPassword('');
                    setConfirmPassword('');
                    setMode('forgot_password');
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Lembrar credenciais */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span>Lembrar minhas credenciais</span>
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. MODO: ESQUECI MINHA SENHA (GERAR OU DEFINIR NOVA SENHA) */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleSetNewPasswordDirectly} className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <KeyRound size={20} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Recuperação ou Geração de Senha</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Informe o seu e-mail cadastrado para definir uma nova senha ou gerar uma senha segura de acesso imediato.
              </p>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail cadastrado
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@centauro.com.br"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Bloco de Nova Senha */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Nova Senha (mínimo 6 dígitos)
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles size={13} />
                  <span>Gerar Senha Segura</span>
                </button>
              </div>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite ou clique em 'Gerar Senha'"
                  className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {password && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded"
                      title="Copiar senha gerada"
                    >
                      {copiedPassword ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de Salvar Nova Senha & Entrar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha & Entrar no Sistema</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>

            {/* Alternativa: Enviar link por e-mail */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={handleSendRecoveryEmail}
                disabled={isSubmitting}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-700 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Ou enviar link de recuperação para o e-mail
              </button>
            </div>

            {/* Voltar para login */}
            <div className="text-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                ← Voltar para a tela de login
              </button>
            </div>
          </form>
        )}

        {/* 3. MODO: DEFINIR SENHA APÓS LINK DE RECUPERAÇÃO */}
        {mode === 'reset_new_password' && (
          <form onSubmit={handleResetTokenPasswordSubmit} className="space-y-4">
            <div className="text-center mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <KeyRound size={20} />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Definir Nova Senha de Acesso</h2>
              <p className="text-xs text-slate-500 mt-1">
                Link de recuperação validado. Digite sua nova senha abaixo para salvar no Supabase Auth.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nova Senha (mínimo 6 dígitos)
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <span>Salvar Nova Senha & Acessar</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                ← Voltar para o login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <Shield size={14} className="text-blue-400" />
          <span>Autenticação e RLS gerenciados por Supabase Auth</span>
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Centauro Centro de Formação • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};
