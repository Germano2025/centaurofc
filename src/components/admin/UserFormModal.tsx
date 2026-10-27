import React, { useState, useEffect } from 'react';
import { UserPlus, Edit3, X, Shield, Info } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { ROLE_DEFINITIONS } from '../../utils/permissionUtils';

interface UserFormModalProps {
  userToEdit: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  userToEdit,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addUser, updateUser, isLastAdmin, currentUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('USUARIO');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isEditing = Boolean(userToEdit);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setPhone(userToEdit.phone || '');
      setRole(userToEdit.role);
      setActive(userToEdit.active);
      setNotes(userToEdit.notes || '');
      setErrorMessage('');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setRole('USUARIO');
      setActive(true);
      setNotes('');
      setErrorMessage('');
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('O nome completo do usuário é obrigatório.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }

    if (isEditing && userToEdit) {
      // Safeguard: last active admin role modification
      if (
        userToEdit.role === 'ADMINISTRADOR' &&
        role !== 'ADMINISTRADOR' &&
        isLastAdmin(userToEdit.id)
      ) {
        setErrorMessage(
          'Ação Bloqueada: Este usuário é o único Administrador ativo. Não é possível alterar seu perfil.'
        );
        return;
      }

      const res = updateUser(userToEdit.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        active,
        notes: notes.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Erro ao atualizar dados do usuário.');
        return;
      }

      onSuccess(`Dados de ${name} atualizados com sucesso!`);
    } else {
      const res = addUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        active,
        notes: notes.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Erro ao cadastrar usuário.');
        return;
      }

      onSuccess(`Usuário ${name} cadastrado com sucesso no perfil ${role}!`);
    }

    onClose();
  };

  const selectedRoleInfo = ROLE_DEFINITIONS[role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              {isEditing ? <Edit3 size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Editar Cadastro de Usuário' : 'Novo Usuário do Sistema'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Atualize as informações de acesso e perfil do colaborador.'
                  : 'Cadastre um novo membro da equipe do Centauro.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silva"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E-mail de Acesso <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@centauro.com.br"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(81) 98888-7777"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Perfil / Função */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Perfil de Acesso (Função) <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="USUARIO">Usuário</option>
              </select>

              {/* Role Explanatory Card */}
              {selectedRoleInfo && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Shield size={14} className="text-blue-600" />
                    <span>{selectedRoleInfo.name}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      — {selectedRoleInfo.tagline}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {selectedRoleInfo.description}
                  </p>
                </div>
              )}
            </div>

            {/* Status (Ativo / Inativo) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status da Conta
              </label>
              <div className="flex items-center gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="userStatus"
                    checked={active}
                    onChange={() => setActive(true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ativo (Permite Acesso)</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="userStatus"
                    checked={!active}
                    onChange={() => setActive(false)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>Inativo</span>
                </label>
              </div>
            </div>

            {/* Observações Internas */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações / Atribuições
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Treinador responsável pela categoria Sub-11, turno da manhã..."
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Supabase Auth Note */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-start gap-2.5 text-xs text-blue-900">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <p className="font-bold">Segurança e Credenciais de Acesso:</p>
              <p className="text-blue-800">
                Por padrão de conformidade e segurança do Centauro, senhas nunca são salvas em
                texto simples. O usuário recebe o convite seguro via Supabase Auth ou define sua
                senha pessoal no primeiro login.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
