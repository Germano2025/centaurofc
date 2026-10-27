import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';

interface InactivateUserModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const InactivateUserModal: React.FC<InactivateUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toggleUserStatus, isLastAdmin, currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const isCurrentActive = user.active;
  const isTargetLastAdmin = isCurrentActive && user.role === 'ADMINISTRADOR' && isLastAdmin(user.id);
  const isSelfAction = user.id === currentUser.id;

  const handleConfirm = () => {
    if (isCurrentActive && !reason.trim()) {
      setErrorMsg('Por favor, informe uma breve justificativa para a inativação.');
      return;
    }

    const result = toggleUserStatus(user.id, reason);
    if (!result.success) {
      setErrorMsg(result.message || 'Erro ao alterar status do usuário.');
      return;
    }

    onSuccess(
      isCurrentActive
        ? `Usuário ${user.name} foi inativado com sucesso. Registros históricos preservados.`
        : `Usuário ${user.name} foi reativado com sucesso.`
    );
    setReason('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            isCurrentActive ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isCurrentActive ? (
              <AlertTriangle className="text-amber-600" size={22} />
            ) : (
              <CheckCircle2 className="text-emerald-600" size={22} />
            )}
            <h3
              className={`text-base font-bold ${
                isCurrentActive ? 'text-amber-950' : 'text-emerald-950'
              }`}
            >
              {isCurrentActive ? 'Inativar Usuário' : 'Reativar Usuário'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target user recap */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <p className="text-[11px] font-semibold text-blue-700 mt-0.5">Perfil: {user.role}</p>
            </div>
          </div>

          {/* Last Admin Protection Alert */}
          {isTargetLastAdmin ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Ação Bloqueada por Segurança</h4>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  Este usuário é o <strong>único Administrador ativo</strong> no sistema. O sistema
                  do Centauro exige ao menos um administrador ativo para evitar bloqueio total do
                  acesso gerencial. Promova outro usuário a Administrador antes de prosseguir.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Historical preservation guarantee */}
              {isCurrentActive ? (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>🛡️ Preservação Histórica Garantida</span>
                  </p>
                  <p className="leading-relaxed text-blue-800">
                    A inativação <strong>NÃO apaga</strong> nenhum registro vinculado a este usuário.
                    Todas as avaliações técnicas, chamadas de presença, jogos, receitas, atletas e
                    históricos continuarão intactos com a autoria registrada.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ao reativar este usuário, ele recuperará o acesso ao sistema do Centauro com as
                  permissões do seu perfil <strong>{user.role}</strong>.
                </p>
              )}

              {/* Self action warning */}
              {isSelfAction && isCurrentActive && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <p className="font-bold">Aviso de Auto-Inativação:</p>
                  <p className="mt-0.5">
                    Você está inativando a sua própria conta conectada. Sua sessão atual será
                    encerrada.
                  </p>
                </div>
              )}

              {/* Reason input (for inactivation) */}
              {isCurrentActive && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo da Inativação <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Ex: Desligamento de colaborador, término de contrato, mudança de função..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Este motivo será registrado permanentemente na trilha de auditoria do sistema.
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {errorMsg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          {!isTargetLastAdmin && (
            <Button
              variant={isCurrentActive ? 'danger' : 'primary'}
              size="sm"
              onClick={handleConfirm}
            >
              {isCurrentActive ? 'Confirmar Inativação' : 'Confirmar Reativação'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
