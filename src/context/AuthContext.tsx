import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, SystemModule, PermissionAction, AuditLog, AuditActionType } from '../types';
import { hasUserPermission } from '../utils/permissionUtils';
import {
  supabase,
  isSupabaseConfigured,
  fetchProfilesFromSupabase,
  fetchUserProfileWithPermissions,
  upsertProfileToSupabase,
  saveUserPermissionsToSupabase,
  insertAuditLogToSupabase,
} from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  realAuthUser: UserProfile | null;
  authSession: any | null;
  authUser: any | null;
  isLoadingAuth: boolean;
  isSimulatingUser: boolean;
  users: UserProfile[];
  availableUsers: UserProfile[];
  auditLogs: AuditLog[];
  setCurrentUser: (user: UserProfile) => void;
  switchUser: (userId: string) => void;
  revertSimulation: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    role?: UserRole
  ) => Promise<{ success: boolean; message?: string }>;
  resetPasswordForEmail: (
    email: string
  ) => Promise<{ success: boolean; message?: string; rateLimited?: boolean }>;
  setUserPassword: (
    email: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (
    email: string,
    token: string,
    type?: 'signup' | 'recovery' | 'email'
  ) => Promise<{ success: boolean; message?: string }>;
  generateSecurePassword: () => string;
  loginMasterAdminDirectly: (
    email?: string
  ) => Promise<{ success: boolean; message?: string }>;
  hasPermission: (module: SystemModule, action?: PermissionAction) => boolean;
  canView: (module: SystemModule) => boolean;
  canCreate: (module: SystemModule) => boolean;
  canEdit: (module: SystemModule) => boolean;
  canDelete: (module: SystemModule) => boolean;
  canInactivate: (module: SystemModule) => boolean;
  isLastAdmin: (userId: string) => boolean;
  updateUserPermissions: (
    userId: string,
    permissions: Record<string, boolean>
  ) => { success: boolean; message?: string };
  resetUserPermissionsToRole: (userId: string) => { success: boolean; message?: string };
  toggleUserStatus: (userId: string, reason?: string) => { success: boolean; message?: string };
  isSupabaseConnected: boolean;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;
  addUser: (
    user: Omit<UserProfile, 'id' | 'created_at'>
  ) => { success: boolean; message?: string };
  updateUser: (
    id: string,
    updates: Partial<UserProfile>
  ) => { success: boolean; message?: string };
  inactivateUser: (id: string, reason?: string) => { success: boolean; message?: string };
  reactivateUser: (id: string) => { success: boolean; message?: string };
  addAuditLog: (
    actionTypeOrLog:
      | AuditActionType
      | {
          action_type: AuditActionType;
          description: string;
          target_user_id?: string;
          target_user_name?: string;
          details?: Record<string, any>;
        },
    description?: string,
    targetUserId?: string,
    targetUserName?: string,
    details?: Record<string, any>
  ) => void;
}

export const EXCLUDED_EMAILS = new Set([
  'lucianacalbuquerque@hotmail.com',
  'prof.marcelo@centauro.com.br',
  'secretaria@centauro.com.br',
  'prof.marcelo@pssports.com.br',
  'secretaria@pssports.com.br',
]);

// Administrador Master Único do Sistema (Américo Germano)
export const DEFAULT_USERS: UserProfile[] = [
  {
    id: '59528021-0999-4dde-8bfa-938a3ee94651',
    name: 'Américo Germano',
    email: 'jamericogermano@gmail.com',
    role: 'ADMINISTRADOR',
    active: true,
    created_at: new Date().toISOString(),
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado de carregamento da sessão inicial Supabase
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [authSession, setAuthSession] = useState<any | null>(null);
  const [authUser, setAuthUser] = useState<any | null>(null);

  // Usuário autenticado real vs Usuário ativo (suporta simulação por admin)
  const [realAuthUser, setRealAuthUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [isSimulatingUser, setIsSimulatingUser] = useState<boolean>(false);

  // Lista de usuários (Supabase profiles como fonte de verdade + cache local)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem('ps_users');
      const parsed = stored ? JSON.parse(stored) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed
          .filter((u: any) => u.email && !EXCLUDED_EMAILS.has(u.email.toLowerCase()))
          .map((u: any) => ({
            ...u,
            role: (u.email?.toLowerCase() === 'jamericogermano@gmail.com' || u.role === 'ADMINISTRADOR'
              ? 'ADMINISTRADOR'
              : 'USUARIO') as UserRole,
          }));
        if (!cleaned.some((u) => u.email?.toLowerCase() === 'jamericogermano@gmail.com')) {
          cleaned.unshift(DEFAULT_USERS[0]);
        }
        return cleaned;
      }
      return DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('ps_audit_logs');
      const parsed = stored ? JSON.parse(stored) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Salva no localStorage como cache secundário e suporte offline
  useEffect(() => {
    localStorage.setItem('ps_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('ps_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Carrega ou sincroniza perfis diretamente de public.profiles do Supabase
  const reloadProfilesFromSupabase = useCallback(async () => {
    if (!supabase) return;
    try {
      const res = await fetchProfilesFromSupabase();
      if (res.success && Array.isArray(res.profiles) && res.profiles.length > 0) {
        const mapped: UserProfile[] = res.profiles
          .filter((p: any) => p.email && !EXCLUDED_EMAILS.has(p.email.toLowerCase()))
          .map((p: any) => ({
            id: p.id,
            email: p.email,
            name: p.name || p.email.split('@')[0],
            role: (p.email?.toLowerCase() === 'jamericogermano@gmail.com' || p.role === 'ADMINISTRADOR'
              ? 'ADMINISTRADOR'
              : 'USUARIO') as UserRole,
            active: p.active !== false,
            phone: p.phone || undefined,
            notes: p.notes || undefined,
            avatar_url: p.avatar_url || undefined,
            last_access: p.last_access || undefined,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || undefined,
          }));

        setUsers((prev) => {
          // Merge perfis do Supabase com os usuários existentes
          const map = new Map<string, UserProfile>();
          // Coloca default
          DEFAULT_USERS.forEach((du) => map.set(du.email.toLowerCase(), du));
          // Sobrescreve com locais anteriores que não sejam excluídos
          prev.forEach((pu) => {
            if (!EXCLUDED_EMAILS.has(pu.email.toLowerCase())) {
              map.set(pu.email.toLowerCase(), pu);
            }
          });
          // Sobrescreve com oficiais do Supabase
          mapped.forEach((mu) => map.set(mu.email.toLowerCase(), mu));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar perfis do Supabase:', err);
    }
  }, []);

  // Inicialização e escuta da sessão real do Supabase Auth
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      // 1. Limpa usuários excluídos do cache do localStorage
      try {
        const stored = localStorage.getItem('ps_users');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (u: any) => u.email && !EXCLUDED_EMAILS.has(u.email.toLowerCase())
            );
            localStorage.setItem('ps_users', JSON.stringify(cleaned));
          }
        }
      } catch {}

      // 2. Garante registro do Admin Master no Supabase Auth e na tabela profiles
      if (supabase) {
        try {
          // Tenta criar no Supabase Auth (auth.users) para aparecer em Authentication -> Users no Dashboard
          await supabase.auth.signUp({
            email: 'jamericogermano@gmail.com',
            password: 'MasterAdmin2026!',
            options: {
              data: {
                name: 'Américo Germano',
                role: 'ADMINISTRADOR',
              },
            },
          });
        } catch {}

        try {
          // Garante perfil master em public.profiles
          await upsertProfileToSupabase({
            id: '59528021-0999-4dde-8bfa-938a3ee94651',
            email: 'jamericogermano@gmail.com',
            name: 'Américo Germano',
            role: 'ADMINISTRADOR',
            active: true,
            last_access: new Date().toISOString(),
            created_at: '2026-01-01T00:00:00.000Z',
          });
        } catch {}

        // 3. Exclui do banco Supabase profiles os 3 usuários solicitados
        try {
          await supabase
            .from('profiles')
            .delete()
            .in('email', Array.from(EXCLUDED_EMAILS));
        } catch {}
      }

      if (!supabase) {
        setIsLoadingAuth(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && session.user && isMounted) {
          setAuthSession(session);
          setAuthUser(session.user);

          // Carrega perfil oficial do Supabase
          const profileRes = await fetchUserProfileWithPermissions(session.user.id);

          if (profileRes.success && profileRes.profile) {
            const prof = profileRes.profile;
            if (!prof.active) {
              // Conta inativada
              await supabase.auth.signOut();
              setRealAuthUser(null);
              setCurrentUserState(null);
              setIsSimulatingUser(false);
            } else {
              const fullProfile: UserProfile = {
                id: prof.id,
                email: prof.email,
                name: prof.name || session.user.email?.split('@')[0] || 'Usuário',
                role: (prof.email.toLowerCase() === 'jamericogermano@gmail.com' || prof.role === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'USUARIO') as UserRole,
                active: prof.active !== false,
                phone: prof.phone || undefined,
                notes: prof.notes || undefined,
                avatar_url: prof.avatar_url || undefined,
                last_access: new Date().toISOString(),
                created_at: prof.created_at || new Date().toISOString(),
                custom_permissions: profileRes.customPermissions,
              };

              setRealAuthUser(fullProfile);
              setCurrentUserState(fullProfile);
              setIsSimulatingUser(false);
            }
          } else {
            // Perfil ainda não inserido no banco: cria usando metadata do Supabase Auth
            const userEmail = session.user.email || '';
            const isAdmin =
              userEmail.toLowerCase() === 'jamericogermano@gmail.com' ||
              session.user.user_metadata?.role === 'ADMINISTRADOR';

            const newProf: UserProfile = {
              id: session.user.id,
              email: userEmail,
              name:
                session.user.user_metadata?.name ||
                userEmail.split('@')[0] ||
                'Américo Germano',
              role: isAdmin ? 'ADMINISTRADOR' : 'USUARIO',
              active: true,
              created_at: new Date().toISOString(),
              last_access: new Date().toISOString(),
            };

            await upsertProfileToSupabase(newProf);
            setRealAuthUser(newProf);
            setCurrentUserState(newProf);
            setIsSimulatingUser(false);
          }
        } else {
          // Sem sessão ativa no Supabase: checa se há sessão persistida do Master Admin no localStorage
          try {
            const masterSaved = localStorage.getItem('ps_master_admin_session');
            if (masterSaved) {
              const parsed = JSON.parse(masterSaved);
              if (
                parsed &&
                parsed.email?.toLowerCase() === 'jamericogermano@gmail.com' &&
                parsed.profile
              ) {
                setRealAuthUser(parsed.profile);
                setCurrentUserState(parsed.profile);
                setIsSimulatingUser(false);
                return;
              }
            }
          } catch (e) {
            // ignore
          }
          setAuthSession(null);
          setAuthUser(null);
          setRealAuthUser(null);
          setCurrentUserState(null);
          setIsSimulatingUser(false);
        }
      } catch (err) {
        console.warn('Erro ao inicializar sessão Supabase:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
          reloadProfilesFromSupabase();
        }
      }
    }

    initAuth();

    // Inscrição a mudanças de autenticação (onAuthStateChange)
    const { data: authListener } = supabase?.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setAuthSession(session);
          setAuthUser(session?.user || null);

          if (session?.user) {
            const profileRes = await fetchUserProfileWithPermissions(session.user.id);
            if (profileRes.success && profileRes.profile) {
              const prof = profileRes.profile;
              if (!prof.active) {
                await supabase?.auth.signOut();
                setRealAuthUser(null);
                setCurrentUserState(null);
                setIsSimulatingUser(false);
                return;
              }

              const fullProfile: UserProfile = {
                id: prof.id,
                email: prof.email,
                name: prof.name || session.user.email?.split('@')[0] || 'Usuário',
                role: (prof.role === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'USUARIO') as UserRole,
                active: true,
                phone: prof.phone || undefined,
                notes: prof.notes || undefined,
                avatar_url: prof.avatar_url || undefined,
                last_access: new Date().toISOString(),
                created_at: prof.created_at || new Date().toISOString(),
                custom_permissions: profileRes.customPermissions,
              };

              setRealAuthUser(fullProfile);
              setCurrentUserState(fullProfile);
              setIsSimulatingUser(false);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthSession(null);
          setAuthUser(null);
          setRealAuthUser(null);
          setCurrentUserState(null);
          setIsSimulatingUser(false);
        }
      }
    ) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [reloadProfilesFromSupabase]);

  // Auditoria
  const addAuditLog = (
    actionTypeOrLog:
      | AuditActionType
      | {
          action_type: AuditActionType;
          description: string;
          target_user_id?: string;
          target_user_name?: string;
          details?: Record<string, any>;
        },
    description?: string,
    targetUserId?: string,
    targetUserName?: string,
    details?: Record<string, any>
  ) => {
    let logItem: AuditLog;
    if (typeof actionTypeOrLog === 'object' && actionTypeOrLog !== null) {
      logItem = {
        id: `al-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        performer_id: currentUser?.id || 'sys',
        performer_name: currentUser?.name || 'Sistema',
        action_type: actionTypeOrLog.action_type,
        description: actionTypeOrLog.description,
        target_user_id: actionTypeOrLog.target_user_id,
        target_user_name: actionTypeOrLog.target_user_name,
        details: actionTypeOrLog.details,
      };
    } else {
      const actType = actionTypeOrLog as AuditActionType;
      logItem = {
        id: `al-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        performer_id: currentUser?.id || 'sys',
        performer_name: currentUser?.name || 'Sistema',
        action_type: actType,
        description: description || '',
        target_user_id: targetUserId,
        target_user_name: targetUserName,
        details,
      };
    }

    setAuditLogs((prev) => [logItem, ...prev]);
    // Persiste também no Supabase
    insertAuditLogToSupabase(logItem);
  };

  // Login Real via Supabase Auth & Credenciais Validadas
  const signInWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: 'Informe e-mail e senha para acessar.' };
    }

    try {
      let isAuthValid = false;
      let authenticatedUser: any = null;
      let authenticatedSession: any = null;

      // 1. Tenta autenticação real no Supabase Auth
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });

          if (!error && data?.user) {
            isAuthValid = true;
            authenticatedUser = data.user;
            authenticatedSession = data.session;
          } else if (error) {
            // Se o Supabase retornou "Email not confirmed", a credencial estava correta no servidor Supabase
            if (
              error.message?.includes('Email not confirmed') ||
              (error as any).code === 'email_not_confirmed'
            ) {
              isAuthValid = true;
            }
          }
        } catch {
          // segue para validação de credencial cadastrada
        }
      }

      // 2. Verifica se a senha confere com senha redefinida/gerada pelo usuário
      if (!isAuthValid) {
        try {
          const stored = localStorage.getItem('ps_user_passwords');
          const creds = stored ? JSON.parse(stored) : {};
          if (creds[cleanEmail] && creds[cleanEmail] === cleanPassword) {
            isAuthValid = true;
          }
        } catch {
          // ignore
        }
      }

      // 3. Credencial padrão para Administrador Master caso o e-mail ainda não tenha sido confirmado no Supabase
      const isMasterAdmin = cleanEmail === 'jamericogermano@gmail.com';

      if (!isAuthValid && isMasterAdmin) {
        const pLower = cleanPassword.toLowerCase();
        if (
          cleanPassword === 'MasterAdmin2026!' ||
          cleanPassword === 'MasterAdmin2026' ||
          pLower === 'masteradmin2026!' ||
          pLower === 'masteradmin2026' ||
          cleanPassword === 'Centauro2026!' ||
          cleanPassword === 'Centauro2026' ||
          pLower === 'centauro2026!' ||
          pLower === 'centauro2026'
        ) {
          isAuthValid = true;
        }
      }

      if (!isAuthValid) {
        return {
          success: false,
          message: 'E-mail ou senha incorretos.',
        };
      }

      // Localiza o perfil de usuário existente ou default
      const defaultUser = DEFAULT_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
      const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

      let activeProfile: UserProfile;

      if (authenticatedUser) {
        const profileRes = await fetchUserProfileWithPermissions(authenticatedUser.id);
        if (profileRes.success && profileRes.profile) {
          if (!profileRes.profile.active) {
            if (supabase) await supabase.auth.signOut();
            return {
              success: false,
              message: 'Acesso bloqueado: Este usuário foi inativado pela coordenação do Centauro.',
            };
          }

          activeProfile = {
            id: profileRes.profile.id,
            email: profileRes.profile.email,
            name: profileRes.profile.name || cleanEmail.split('@')[0],
            role: (profileRes.profile.role === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'USUARIO') as UserRole,
            active: true,
            phone: profileRes.profile.phone || undefined,
            notes: profileRes.profile.notes || undefined,
            avatar_url: profileRes.profile.avatar_url || undefined,
            last_access: new Date().toISOString(),
            created_at: profileRes.profile.created_at || new Date().toISOString(),
            custom_permissions: profileRes.customPermissions,
          };
        } else {
          activeProfile = {
            id: authenticatedUser.id,
            email: cleanEmail,
            name: authenticatedUser.user_metadata?.name || existingUser?.name || defaultUser?.name || 'Américo Germano',
            role: isMasterAdmin ? 'ADMINISTRADOR' : (existingUser?.role || 'USUARIO'),
            active: true,
            created_at: new Date().toISOString(),
            last_access: new Date().toISOString(),
          };

          upsertProfileToSupabase(activeProfile).catch(() => {});
        }
      } else {
        activeProfile = {
          id: existingUser?.id || defaultUser?.id || (isMasterAdmin ? '59528021-0999-4dde-8bfa-938a3ee94651' : `u-${Date.now()}`),
          name: existingUser?.name || defaultUser?.name || (isMasterAdmin ? 'Américo Germano' : cleanEmail.split('@')[0]),
          email: cleanEmail,
          role: isMasterAdmin ? 'ADMINISTRADOR' : (existingUser?.role || 'USUARIO'),
          active: true,
          created_at: existingUser?.created_at || defaultUser?.created_at || new Date().toISOString(),
          last_access: new Date().toISOString(),
          custom_permissions: existingUser?.custom_permissions,
        };
      }

      if (authenticatedSession) {
        setAuthSession(authenticatedSession);
        setAuthUser(authenticatedUser);
      }

      setRealAuthUser(activeProfile);
      setCurrentUserState(activeProfile);
      setIsSimulatingUser(false);

      addAuditLog(
        'LOGIN',
        `Login realizado com sucesso (${activeProfile.role})`,
        activeProfile.id,
        activeProfile.name,
        { email: cleanEmail }
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro inesperado durante o login.' };
    }
  };

  // Logout Real do Supabase
  const signOut = async (): Promise<void> => {
    if (currentUser) {
      addAuditLog(
        'LOGOUT' as any,
        `Sessão encerrada para o usuário ${currentUser.name}`,
        currentUser.id,
        currentUser.name
      );
    }

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Erro ao encerrar sessão Supabase:', err);
    } finally {
      try {
        localStorage.removeItem('ps_master_admin_session');
      } catch (e) {
        // ignore
      }
      setAuthSession(null);
      setAuthUser(null);
      setRealAuthUser(null);
      setCurrentUserState(null);
      setIsSimulatingUser(false);
    }
  };

  // Cadastro Seguro de Primeiro Acesso (para os usuários oficiais ativarem sua senha)
  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    role?: UserRole
  ): Promise<{ success: boolean; message?: string }> => {
    if (!supabase) {
      return { success: false, message: 'Cliente Supabase não configurado.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Informe um e-mail válido.' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    // Regra de perfil: administradores conhecidos recebem ADMINISTRADOR
    const finalRole: UserRole =
      role ||
      (cleanEmail === 'jamericogermano@gmail.com'
        ? 'ADMINISTRADOR'
        : 'USUARIO');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            role: finalRole,
          },
        },
      });

      if (error) {
        if (error.message?.includes('already registered')) {
          return {
            success: false,
            message:
              'Este e-mail já está registrado no Supabase Auth. Use a opção "Entrar" com sua senha ou "Esqueci minha senha" para redefinir.',
          };
        }
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Garante criação na tabela profiles
        await upsertProfileToSupabase({
          id: data.user.id,
          email: cleanEmail,
          name: name.trim(),
          role: finalRole,
          active: true,
          last_access: new Date().toISOString(),
        });

        reloadProfilesFromSupabase();

        // Se a sessão já foi gerada (sem confirmação de e-mail estrita)
        if (data.session) {
          const profile: UserProfile = {
            id: data.user.id,
            email: cleanEmail,
            name: name.trim(),
            role: finalRole,
            active: true,
            created_at: new Date().toISOString(),
            last_access: new Date().toISOString(),
          };
          setAuthSession(data.session);
          setAuthUser(data.user);
          setRealAuthUser(profile);
          setCurrentUserState(profile);
          setIsSimulatingUser(false);
        }

        return {
          success: true,
          message: 'Conta ativada com sucesso! Você já pode acessar o sistema.',
        };
      }

      return {
        success: true,
        message: 'Conta registrada! Verifique seu e-mail caso haja link de confirmação.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao registrar usuário.' };
    }
  };

  // Recuperação de Senha via Supabase Auth
  const resetPasswordForEmail = async (
    email: string
  ): Promise<{ success: boolean; message?: string; rateLimited?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Informe um e-mail válido para recuperação.' };
    }

    if (!supabase) {
      return {
        success: false,
        message: 'Serviço de e-mail indisponível. Utilize a opção para definir nova senha diretamente.',
      };
    }

    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        const isRateLimit =
          error.message?.includes('rate limit') ||
          error.message?.includes('over_email_send_rate_limit') ||
          (error as any).status === 429;

        if (isRateLimit) {
          return {
            success: false,
            rateLimited: true,
            message:
              'O servidor Supabase atingiu o limite temporário de envio de e-mails. Você pode definir ou gerar sua nova senha agora mesmo abaixo.',
          };
        }

        return {
          success: false,
          message: `Não foi possível enviar o e-mail: ${error.message}. Você pode gerar sua nova senha diretamente.`,
        };
      }

      return {
        success: true,
        message:
          'Se o e-mail estiver cadastrado, enviamos as orientações de redefinição de senha para sua caixa de entrada.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Erro ao solicitar redefinição. Você pode definir a nova senha diretamente.',
      };
    }
  };

  // Gerador de senha forte segura
  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Centauro2026!${rand}`;
  };

  // Define ou redefine a senha do usuário e ativa o acesso
  const setUserPassword = async (
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !newPassword || newPassword.length < 6) {
      return { success: false, message: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    try {
      // 1. Armazena no registro de credenciais persistentes do sistema
      try {
        const stored = localStorage.getItem('ps_user_passwords');
        const creds = stored ? JSON.parse(stored) : {};
        creds[cleanEmail] = newPassword;
        localStorage.setItem('ps_user_passwords', JSON.stringify(creds));
      } catch (e) {
        // ignore
      }

      // 2. Se houver cliente Supabase e usuário logado, tenta atualizar no Supabase Auth
      if (supabase && authSession) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch {
          // segue
        }
      }

      // 3. Localiza ou cria o perfil
      const defaultUser = DEFAULT_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
      const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

      const isMasterAdmin = cleanEmail === 'jamericogermano@gmail.com';

      const finalProfile: UserProfile = {
        id: existingUser?.id || defaultUser?.id || (isMasterAdmin ? '59528021-0999-4dde-8bfa-938a3ee94651' : `u-${Date.now()}`),
        name: existingUser?.name || defaultUser?.name || (isMasterAdmin ? 'Américo Germano' : cleanEmail.split('@')[0]),
        email: cleanEmail,
        role: isMasterAdmin ? 'ADMINISTRADOR' : (existingUser?.role || defaultUser?.role || 'USUARIO'),
        active: true,
        last_access: new Date().toISOString(),
        created_at: existingUser?.created_at || defaultUser?.created_at || new Date().toISOString(),
        custom_permissions: existingUser?.custom_permissions,
      };

      setRealAuthUser(finalProfile);
      setCurrentUserState(finalProfile);
      setIsSimulatingUser(false);

      addAuditLog(
        'UPDATE',
        `Nova senha configurada com sucesso para o usuário ${finalProfile.name} (${finalProfile.role})`,
        finalProfile.id,
        finalProfile.name,
        { email: cleanEmail }
      );

      return {
        success: true,
        message: 'Nova senha definida com sucesso! Acesso liberado.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao definir nova senha.' };
    }
  };

  // Atualização de Senha
  const updatePassword = async (
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!supabase) return { success: false, message: 'Cliente Supabase não configurado.' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Senha atualizada com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao atualizar senha.' };
    }
  };

  // Validação de Código OTP / Token de Confirmação do Supabase
  const verifyOtp = async (
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'email' = 'signup'
  ): Promise<{ success: boolean; message?: string }> => {
    if (!supabase) return { success: false, message: 'Cliente Supabase não configurado.' };
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!cleanEmail || !cleanToken) {
      return { success: false, message: 'Informe o e-mail e o código de validação recebido.' };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type,
      });

      if (error) {
        return { success: false, message: `Código inválido ou expirado: ${error.message}` };
      }

      if (data.session && data.user) {
        setAuthSession(data.session);
        setAuthUser(data.user);

        const profileRes = await fetchUserProfileWithPermissions(data.user.id);
        const isAdmin =
          cleanEmail === 'jamericogermano@gmail.com' ||
          data.user.user_metadata?.role === 'ADMINISTRADOR';

        const prof: UserProfile = {
          id: data.user.id,
          email: cleanEmail,
          name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
          role: isAdmin ? 'ADMINISTRADOR' : (profileRes?.profile?.role || 'USUARIO'),
          active: true,
          created_at: new Date().toISOString(),
          last_access: new Date().toISOString(),
        };

        setRealAuthUser(prof);
        setCurrentUserState(prof);
        setIsSimulatingUser(false);

        addAuditLog(
          'LOGIN',
          `Login autenticado com sucesso via OTP no Supabase (${prof.role})`,
          prof.id,
          prof.name,
          { email: cleanEmail }
        );

        return { success: true, message: 'Código validado com sucesso! Sessão iniciada.' };
      }

      return { success: true, message: 'Código confirmado com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao validar código OTP.' };
    }
  };

  // Acesso Direto de Contingência para o Administrador Master (garante que J. Américo nunca fique bloqueado)
  const loginMasterAdminDirectly = async (
    email: string = 'jamericogermano@gmail.com'
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== 'jamericogermano@gmail.com') {
      return {
        success: false,
        message: 'Acesso restrito ao Administrador Master do sistema (Américo Germano).',
      };
    }

    const defaultAdmin = DEFAULT_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    const masterProfile: UserProfile = {
      id: existing?.id || defaultAdmin?.id || 'u-admin-1',
      name: existing?.name || defaultAdmin?.name || 'Américo Germano',
      email: cleanEmail,
      role: 'ADMINISTRADOR',
      active: true,
      last_access: new Date().toISOString(),
      created_at: existing?.created_at || new Date().toISOString(),
    };

    setRealAuthUser(masterProfile);
    setCurrentUserState(masterProfile);
    setIsSimulatingUser(false);

    try {
      localStorage.setItem(
        'ps_master_admin_session',
        JSON.stringify({
          email: cleanEmail,
          timestamp: Date.now(),
          profile: masterProfile,
        })
      );
    } catch (e) {
      // ignore
    }

    addAuditLog(
      'LOGIN',
      `Acesso direto de Administrador Master efetuado (${masterProfile.name})`,
      masterProfile.id,
      masterProfile.name,
      { email: cleanEmail, mode: 'MASTER_ADMIN_DIRECT' }
    );

    return {
      success: true,
      message: `Bem-vindo, ${masterProfile.name}! Acesso de Administrador Master concedido com sucesso.`,
    };
  };

  // Permissões
  const hasPermission = (module: SystemModule, action: PermissionAction = 'visualizar'): boolean => {
    return hasUserPermission(currentUser, module, action);
  };

  const canView = (module: SystemModule): boolean => hasPermission(module, 'visualizar');
  const canCreate = (module: SystemModule): boolean => hasPermission(module, 'criar');
  const canEdit = (module: SystemModule): boolean => hasPermission(module, 'editar');
  const canDelete = (module: SystemModule): boolean => hasPermission(module, 'inativar');
  const canInactivate = (module: SystemModule): boolean => hasPermission(module, 'inativar');

  const isLastAdmin = (userId: string): boolean => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.role !== 'ADMINISTRADOR' || !target.active) {
      return false;
    }
    const activeAdmins = users.filter((u) => u.active && u.role === 'ADMINISTRADOR');
    return activeAdmins.length <= 1;
  };

  // Simulação / Troca de usuário para auditoria e teste de permissões
  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const now = new Date().toISOString();
    const updated = { ...target, last_access: now };

    setCurrentUserState(updated);
    setIsSimulatingUser(target.id !== realAuthUser?.id);

    addAuditLog(
      'LOGIN',
      `Sessão alternada para visualização do usuário ${target.name} (${target.role})`,
      target.id,
      target.name
    );
  };

  const revertSimulation = () => {
    if (realAuthUser) {
      setCurrentUserState(realAuthUser);
      setIsSimulatingUser(false);
    }
  };

  // Sincronização e teste de conexão Supabase
  const syncWithSupabase = async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase) {
      setIsSupabaseConnected(false);
      return {
        success: false,
        message: 'Supabase não inicializado. Verifique as credenciais no painel.',
      };
    }

    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('schema cache')
        ) {
          setIsSupabaseConnected(true);
          return {
            success: false,
            message:
              'Conectado ao Supabase! Porém a tabela profiles ainda precisa ser criada executando o script SQL no SQL Editor.',
          };
        }
        if (error.code === '42501' || error.message?.includes('permission')) {
          setIsSupabaseConnected(true);
          return {
            success: true,
            message: 'Conexão com o Supabase ativa e protegida por RLS!',
          };
        }
        return {
          success: false,
          message: `Erro do Supabase: ${error.message}`,
        };
      }
      setIsSupabaseConnected(true);
      reloadProfilesFromSupabase();
      return {
        success: true,
        message: 'Conexão com o Supabase ativa e perfis sincronizados!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na sincronização: ${err.message || err}`,
      };
    }
  };

  // Gestão de Usuários
  const addUser = (
    userData: Omit<UserProfile, 'id' | 'created_at'>
  ): { success: boolean; message?: string } => {
    if (!userData.name || !userData.email) {
      return { success: false, message: 'Nome e e-mail são obrigatórios.' };
    }
    const emailLower = userData.email.trim().toLowerCase();
    if (users.some((u) => u.email.trim().toLowerCase() === emailLower)) {
      return { success: false, message: 'Já existe um usuário cadastrado com este e-mail.' };
    }

    const newUser: UserProfile = {
      ...userData,
      id: `u-${Date.now()}`,
      email: emailLower,
      name: userData.name.trim(),
      active: userData.active !== undefined ? userData.active : true,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [newUser, ...prev]);

    // Salva perfil no Supabase
    upsertProfileToSupabase(newUser);

    addAuditLog(
      'CRIACAO_USUARIO',
      `Cadastrou novo usuário: ${newUser.name} com perfil ${newUser.role}`,
      newUser.id,
      newUser.name,
      { email: newUser.email, role: newUser.role }
    );

    return { success: true };
  };

  const updateUser = (
    id: string,
    updates: Partial<UserProfile>
  ): { success: boolean; message?: string } => {
    const existing = users.find((u) => u.id === id);
    if (!existing) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (updates.email) {
      const emailLower = updates.email.trim().toLowerCase();
      const conflict = users.some(
        (u) => u.id !== id && u.email.trim().toLowerCase() === emailLower
      );
      if (conflict) {
        return { success: false, message: 'Este e-mail já está sendo utilizado por outro usuário.' };
      }
    }

    if (
      existing.role === 'ADMINISTRADOR' &&
      existing.active &&
      updates.role &&
      updates.role !== 'ADMINISTRADOR' &&
      isLastAdmin(id)
    ) {
      return {
        success: false,
        message: 'Ação Bloqueada: Não é permitido rebaixar o perfil do único Administrador ativo.',
      };
    }

    if (
      existing.role === 'ADMINISTRADOR' &&
      existing.active &&
      updates.active === false &&
      isLastAdmin(id)
    ) {
      return {
        success: false,
        message: 'Ação Bloqueada: Não é permitido inativar o único Administrador ativo.',
      };
    }

    const updatedRecord: UserProfile = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? updatedRecord : u)));

    if (currentUser?.id === id) {
      setCurrentUserState(updatedRecord);
    }
    if (realAuthUser?.id === id) {
      setRealAuthUser(updatedRecord);
    }

    // Persiste atualização no Supabase
    upsertProfileToSupabase(updatedRecord);

    addAuditLog(
      'EDICAO_USUARIO',
      `Atualizou dados do usuário: ${existing.name}`,
      id,
      existing.name,
      { updates }
    );

    return { success: true };
  };

  const toggleUserStatus = (
    userId: string,
    reason?: string
  ): { success: boolean; message?: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (target.active) {
      if (target.role === 'ADMINISTRADOR' && isLastAdmin(userId)) {
        return {
          success: false,
          message: 'Ação Bloqueada: Não é permitido inativar o único Administrador ativo do sistema.',
        };
      }

      const updated: UserProfile = {
        ...target,
        active: false,
        notes: reason ? `${target.notes || ''} [Inativado: ${reason}]`.trim() : target.notes,
        updated_at: new Date().toISOString(),
      };

      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (currentUser?.id === userId) {
        setCurrentUserState(updated);
      }
      if (realAuthUser?.id === userId) {
        setRealAuthUser(updated);
      }

      upsertProfileToSupabase(updated);

      addAuditLog(
        'INATIVACAO_USUARIO',
        `Inativou o usuário ${target.name}${reason ? ` (Motivo: ${reason})` : ''}`,
        target.id,
        target.name,
        { reason }
      );

      return { success: true };
    } else {
      const updated: UserProfile = {
        ...target,
        active: true,
        updated_at: new Date().toISOString(),
      };

      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (currentUser?.id === userId) {
        setCurrentUserState(updated);
      }
      if (realAuthUser?.id === userId) {
        setRealAuthUser(updated);
      }

      upsertProfileToSupabase(updated);

      addAuditLog(
        'REATIVACAO_USUARIO',
        `Reativou o usuário ${target.name}`,
        target.id,
        target.name
      );

      return { success: true };
    }
  };

  const inactivateUser = (id: string, reason?: string) => toggleUserStatus(id, reason);
  const reactivateUser = (id: string) => toggleUserStatus(id);

  const updateUserPermissions = (
    userId: string,
    newPermissions: Record<string, boolean>
  ): { success: boolean; message?: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    if (isLastAdmin(userId) && newPermissions['administracao:visualizar'] === false) {
      return {
        success: false,
        message: 'Ação Bloqueada: O único Administrador ativo não pode perder acesso ao módulo de administração.',
      };
    }

    const updated: UserProfile = {
      ...target,
      custom_permissions: newPermissions,
      updated_at: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    if (currentUser?.id === userId) {
      setCurrentUserState(updated);
    }
    if (realAuthUser?.id === userId) {
      setRealAuthUser(updated);
    }

    // Salva permissões no Supabase
    saveUserPermissionsToSupabase(userId, newPermissions);

    addAuditLog(
      'ALTERACAO_PERMISSOES',
      `Atualizou matriz de permissões personalizadas para ${target.name}`,
      target.id,
      target.name,
      { permissions: newPermissions }
    );

    return { success: true };
  };

  const resetUserPermissionsToRole = (
    userId: string
  ): { success: boolean; message?: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const updated: UserProfile = {
      ...target,
      custom_permissions: undefined,
      updated_at: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    if (currentUser?.id === userId) {
      setCurrentUserState(updated);
    }
    if (realAuthUser?.id === userId) {
      setRealAuthUser(updated);
    }

    // Limpa exceções no Supabase
    saveUserPermissionsToSupabase(userId, {});

    addAuditLog(
      'RESET_PERMISSOES',
      `Restaurou permissões padrão do perfil ${target.role} para ${target.name}`,
      target.id,
      target.name
    );

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        realAuthUser,
        authSession,
        authUser,
        isLoadingAuth,
        isSimulatingUser,
        users: Array.isArray(users) ? users : DEFAULT_USERS,
        availableUsers: Array.isArray(users) ? users : DEFAULT_USERS,
        auditLogs: Array.isArray(auditLogs) ? auditLogs : [],
        setCurrentUser: setCurrentUserState,
        switchUser,
        revertSimulation,
        signInWithEmail,
        signOut,
        signUpWithEmail,
        resetPasswordForEmail,
        setUserPassword,
        updatePassword,
        verifyOtp,
        generateSecurePassword,
        loginMasterAdminDirectly,
        hasPermission,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canInactivate,
        isLastAdmin,
        updateUserPermissions,
        resetUserPermissionsToRole,
        toggleUserStatus,
        isSupabaseConnected,
        syncWithSupabase,
        addUser,
        updateUser,
        inactivateUser,
        reactivateUser,
        addAuditLog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
