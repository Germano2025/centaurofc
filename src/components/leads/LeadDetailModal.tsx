import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge, BadgeVariant } from '../common/Badge';
import { useApp } from '../../context/AppContext';
import { TrialLead, TrialClass, KanbanStage, LeadHistoryItem } from '../../types';
import { formatCPF, formatPhone, formatDateBR, getLeadSubmissionDate, formatNonConversionReason } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Phone,
  Calendar,
  Clock,
  CalendarClock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  FileEdit,
  UserCheck,
  Archive,
  ArrowRight,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  onEditLead: (lead: TrialLead) => void;
  onScheduleClass: (lead: TrialLead) => void;
  onRescheduleClass: (trialClass: TrialClass) => void;
  onFeedbackClass: (trialClass: TrialClass) => void;
  onEnroll: (lead: TrialLead) => void;
  onMarkNonConverted: (lead: TrialLead) => void;
  onReactivate: (lead: TrialLead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onEditLead,
  onScheduleClass,
  onRescheduleClass,
  onFeedbackClass,
  onEnroll,
  onMarkNonConverted,
  onReactivate,
}) => {
  const { currentUser } = useAuth();
  const { leads, trialClasses, addLeadTimelineEvent, deleteLead, markLeadNonConverted, reactivateLead } = useApp();

  const [activeTab, setActiveTab] = useState<'timeline' | 'classes' | 'info'>('timeline');
  const [quickNote, setQuickNote] = useState('');
  const [quickActionType, setQuickActionType] = useState<LeadHistoryItem['action_type']>('CONTATO');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNonConvertConfirm, setShowNonConvertConfirm] = useState(false);
  const [nonConvertReason, setNonConvertReason] = useState<string>('SEM_INTERESSE');
  const [nonConvertNotes, setNonConvertNotes] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  const lead = leads.find((l) => l.id === leadId);
  const leadClasses = trialClasses.filter((tc) => tc.lead_id === leadId);

  const handleConfirmDelete = async () => {
    if (!lead) return;
    setIsDeleting(true);
    try {
      await deleteLead(lead.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir interessado:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmNonConvert = () => {
    if (!lead) return;
    setIsArchiving(true);
    try {
      markLeadNonConverted(
        lead.id,
        nonConvertReason,
        nonConvertNotes.trim() || undefined,
        currentUser?.name || 'Coordenação'
      );
      setShowNonConvertConfirm(false);
      onClose();
    } catch (err) {
      console.error('Erro ao marcar não convertido:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  if (!lead) return null;

  // Calculate age
  const birth = new Date(lead.athlete_birth_date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  // WhatsApp formatted link
  const cleanPhone = lead.responsible_phone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${waPhone}?text=Ol%C3%A1%2C%20${encodeURIComponent(lead.responsible_name)}!%20Aqui%20%C3%A9%20do%20Centro%20de%20Treinamento%20PS%20Sport's%20sobre%20o%20Gabriel.`;

  // Stage badge mapping
  const stageMap: Record<KanbanStage, { label: string; variant: BadgeVariant }> = {
    NOVO: { label: 'Novo Contato', variant: 'navy' },
    NOVO_INTERESSADO: { label: 'Novo Contato', variant: 'navy' },
    CONTATO_REALIZADO: { label: 'Novo Contato', variant: 'navy' },
    AULA_AGENDADA: { label: 'Aula Agendada', variant: 'warning' },
    AULA_REALIZADA: { label: 'Aula Agendada', variant: 'warning' },
    EM_DECISAO: { label: 'Aula Agendada', variant: 'warning' },
    AGUARDANDO_DECISAO: { label: 'Aula Agendada', variant: 'warning' },
    MATRICULADO: { label: 'Matriculado', variant: 'success' },
    NAO_CONVERTIDO: { label: 'Arquivado / Não Convertido', variant: 'danger' },
    ENCERRADO: { label: 'Arquivado / Não Convertido', variant: 'gray' },
  };

  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    let title = 'Registro de Contato';
    if (quickActionType === 'CONTATO') title = 'Contato com Responsável';
    else if (quickActionType === 'WHATSAPP') title = 'Mensagem WhatsApp Enviada';
    else if (quickActionType === 'LIGACAO') title = 'Ligação Telefônica';
    else if (quickActionType === 'VISITA') title = 'Visita Presencial ao CT';
    else if (quickActionType === 'FEEDBACK') title = 'Anotação de Feedback';

    addLeadTimelineEvent(lead.id, quickActionType, title, quickNote.trim(), 'Recepção / Coordenação');
    setQuickNote('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span>{lead.athlete_name}</span>
          <Badge variant={stageMap[lead.stage]?.variant || 'default'}>
            {stageMap[lead.stage]?.label || lead.stage}
          </Badge>
        </div>
      }
      subtitle={`Inscrito em ${getLeadSubmissionDate(lead)} • Origem: ${lead.source === 'FORMULARIO_EXTERNO' ? 'Formulário Online' : lead.source || 'Manual'}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Action Header Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Responsável: <strong className="text-slate-800">{lead.responsible_name}</strong> ({lead.responsible_relationship || 'Responsável'})
            </p>
            <p className="text-xs text-slate-500">
              Telefone: <strong className="text-slate-800">{formatPhone(lead.responsible_phone)}</strong>
              {lead.athlete_birth_date && (
                <span className="ml-3">
                  Nascimento: <strong className="text-slate-800">{formatDateBR(lead.athlete_birth_date)}</strong> ({age} anos)
                </span>
              )}
            </p>
            {lead.interest_class_name && (
              <p className="text-xs text-blue-700 font-semibold">
                Turma de Interesse: {lead.interest_class_name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>

            <Button size="sm" variant="outline" onClick={() => onEditLead(lead)} leftIcon={<FileEdit size={14} />}>
              Editar
            </Button>

            {lead.stage !== 'MATRICULADO' && lead.stage !== 'NAO_CONVERTIDO' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onScheduleClass(lead)}
                  leftIcon={<Calendar size={14} />}
                >
                  Agendar Aula
                </Button>

                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onEnroll(lead)}
                  leftIcon={<UserCheck size={14} />}
                >
                  Efetivar Matrícula
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 border border-rose-200"
                  onClick={() => setShowNonConvertConfirm(true)}
                  leftIcon={<Archive size={14} />}
                >
                  Arquivar (Não Convertido)
                </Button>
              </>
            )}

            {lead.stage === 'NAO_CONVERTIDO' && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  reactivateLead(lead.id, 'NOVO', 'Reativado pela ficha do interessado');
                }}
                leftIcon={<RefreshCw size={14} />}
              >
                Reativar Interessado
              </Button>
            )}

            {currentUser?.role === 'ADMINISTRADOR' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 border border-rose-200"
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash2 size={14} />}
                title="Apenas Administrador pode excluir interessado"
              >
                Excluir Interessado
              </Button>
            )}
          </div>
        </div>

        {/* Banner if lead is NAO_CONVERTIDO */}
        {lead.stage === 'NAO_CONVERTIDO' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-center gap-2.5">
              <Archive size={18} className="text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Interessado Arquivado (Não Convertido)</span>
                {lead.non_conversion_reason && (
                  <span className="ml-1.5 text-rose-700">
                    • Motivo: {formatNonConversionReason(lead.non_conversion_reason)}
                  </span>
                )}
                {lead.non_conversion_notes && (
                  <p className="text-[11px] text-rose-600 mt-0.5 italic">
                    "{lead.non_conversion_notes}"
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-100 shrink-0"
              onClick={() => {
                reactivateLead(lead.id, 'NOVO', 'Reativado pela ficha do interessado');
              }}
              leftIcon={<RefreshCw size={13} />}
            >
              Reativar no Funil
            </Button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Histórico & Linha do Tempo ({lead.timeline?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'classes'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Aulas Experimentais ({leadClasses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ficha Completa
          </button>
        </div>

        {/* TAB 1: TIMELINE & QUICK LOG */}
        {activeTab === 'timeline' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Quick Contact Logger */}
            <form onSubmit={handleAddQuickNote} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registrar Contato / Nota Rápida
                </span>
                <select
                  value={quickActionType}
                  onChange={(e) => setQuickActionType(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700"
                >
                  <option value="CONTATO">Contato Geral</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="LIGACAO">Ligação Telefônica</option>
                  <option value="VISITA">Visita Presencial</option>
                  <option value="FEEDBACK">Feedback</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Liguei para a mãe, confirmou presença na aula de amanhã..."
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" size="sm" variant="secondary" rightIcon={<Send size={13} />}>
                  Registrar
                </Button>
              </div>
            </form>

            {/* Timeline Stream */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {lead.timeline && lead.timeline.length > 0 ? (
                lead.timeline.map((item) => {
                  let dotColor = 'bg-blue-600';
                  if (item.action_type === 'AULA_REALIZADA' || item.action_type === 'MATRICULA_EFETIVADA') {
                    dotColor = 'bg-emerald-600';
                  } else if (item.action_type === 'AULA_REMARCADA') {
                    dotColor = 'bg-amber-500';
                  } else if (item.action_type === 'NAO_COMPARECEU' || item.action_type === 'NAO_CONVERTIDO') {
                    dotColor = 'bg-rose-500';
                  }

                  return (
                    <div key={item.id} className="relative group">
                      <div
                        className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} ring-4 ring-white`}
                      />
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatDateBR(item.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{item.description}</p>
                        {item.registered_by && (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Por: {item.registered_by}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">Nenhum evento registrado ainda.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AULAS EXPERIMENTAIS */}
        {activeTab === 'classes' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Aulas Agendadas e Histórico
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onScheduleClass(lead)}
                leftIcon={<Plus size={14} />}
              >
                Nova Aula Experimental
              </Button>
            </div>

            {leadClasses.length > 0 ? (
              <div className="space-y-3">
                {leadClasses.map((tc) => {
                  const statusBadgeVariants: Record<string, BadgeVariant> = {
                    AGENDADA: 'warning',
                    REALIZADA: 'success',
                    NAO_COMPARECEU: 'danger',
                    REMARCADA: 'default',
                    CANCELADA: 'danger',
                  };

                  return (
                    <div
                      key={tc.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-blue-600" />
                          <span className="font-bold text-xs text-slate-900">
                            {formatDateBR(tc.class_date)} às {tc.class_time}
                          </span>
                          <span className="text-xs text-slate-500">({tc.class_name})</span>
                        </div>
                        <Badge variant={statusBadgeVariants[tc.status] || 'default'}>
                          {tc.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" />
                          <span>Local: {tc.location || 'Campo Principal'}</span>
                        </div>
                        {tc.feedback_decision && (
                          <div className="flex items-center gap-1.5 font-semibold text-blue-700">
                            <span>Feedback: {tc.feedback_decision}</span>
                          </div>
                        )}
                      </div>

                      {tc.feedback_notes && (
                        <p className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700">
                          <strong>Parecer da aula:</strong> {tc.feedback_notes}
                        </p>
                      )}

                      {tc.notes && (
                        <p className="text-[11px] text-slate-500 italic">
                          Obs: {tc.notes}
                        </p>
                      )}

                      {/* Action buttons for this trial class */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {tc.status === 'AGENDADA' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRescheduleClass(tc)}
                              leftIcon={<RefreshCw size={13} />}
                            >
                              Remarcar
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => onFeedbackClass(tc)}
                              leftIcon={<CheckCircle2 size={13} />}
                            >
                              Registrar Presença / Feedback
                            </Button>
                          </>
                        )}
                        {tc.status === 'REALIZADA' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onFeedbackClass(tc)}
                          >
                            Editar Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Nenhuma aula experimental registrada.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Agende uma aula experimental para que o aluno participe de um treino prático.
                </p>
                <div className="mt-3">
                  <Button size="sm" variant="primary" onClick={() => onScheduleClass(lead)}>
                    Agendar Agora
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FICHA COMPLETA */}
        {activeTab === 'info' && (
          <div className="space-y-4 animate-in fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Aluno</span>
                <span className="font-bold text-slate-900">{lead.athlete_name}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de Nascimento</span>
                <span className="font-semibold text-slate-800">
                  {formatDateBR(lead.athlete_birth_date)} ({age} anos)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">RG ou CPF do Aluno</span>
                <span className="font-semibold text-slate-800">
                  {lead.athlete_document || (lead.athlete_cpf ? formatCPF(lead.athlete_cpf) : lead.athlete_rg) || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Responsável Legal</span>
                <span className="font-bold text-slate-900">{lead.responsible_name}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">CPF do Responsável</span>
                <span className="font-semibold text-slate-800">
                  {formatCPF(lead.responsible_cpf) || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Parentesco</span>
                <span className="text-slate-700">{lead.responsible_relationship || 'Pai/Mãe'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Telefone / WhatsApp</span>
                <span className="font-semibold text-slate-800">{formatPhone(lead.responsible_phone)}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">E-mail</span>
                <span className="text-slate-700">{lead.responsible_email || 'Não informado'}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Origem do Contato</span>
                <span className="font-semibold text-blue-700">
                  {lead.source === 'FORMULARIO_EXTERNO' ? 'Formulário Online' : lead.source}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de Inscrição / Entrada</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <CalendarClock size={13} className="text-blue-600" />
                  <span>{getLeadSubmissionDate(lead)}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Experiência Prévia</span>
                <span className="text-slate-700">{lead.previous_experience ? 'Sim, já jogou' : 'Não'}</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Endereço / Bairro</span>
                <span className="text-slate-700">{lead.address || 'Não informado'}</span>
              </div>

              {lead.notes && (
                <div className="sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Observações</span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                    {lead.notes}
                  </p>
                </div>
              )}

              {lead.non_conversion_reason && (
                <div className="sm:col-span-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-900">
                  <span className="font-bold block text-xs">Motivo da Não Conversão:</span>
                  <span>{lead.non_conversion_reason}</span>
                  {lead.non_conversion_notes && (
                    <p className="text-[11px] mt-1 text-rose-800 italic">{lead.non_conversion_notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Admin Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-5 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Excluir Interessado</h3>
                <p className="text-xs text-rose-600 font-semibold">Ação restrita a Administrador</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4 leading-relaxed">
              Tem certeza que deseja excluir o interessado <strong>{lead.athlete_name}</strong>?
              Esta ação apagará permanentemente o cadastro, agendamentos e histórico, não podendo ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                leftIcon={<Trash2 size={14} />}
              >
                Sim, Excluir Definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Marking Non-Converted */}
      {showNonConvertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-5 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-full">
                <Archive size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Mover para Não Convertidos</h3>
                <p className="text-xs text-slate-500">
                  {lead.athlete_name} sairá do funil principal e irá para Arquivados.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              O interessado sairá das etapas ativas do funil e ficará guardado na coluna de <strong>Arquivados / Não Convertidos</strong>. Todo o histórico de atendimentos e treinos será mantido e você poderá reativá-lo quando quiser.
            </p>

            <div className="space-y-3 my-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo da Não Conversão *
                </label>
                <select
                  value={nonConvertReason}
                  onChange={(e) => setNonConvertReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="SEM_INTERESSE">Sem Interesse / Não respondeu aos contatos</option>
                  <option value="DESISTENCIA">Desistência do Responsável</option>
                  <option value="VALOR">Valor da Mensalidade / Financeiro</option>
                  <option value="HORARIO">Choque de Horários / Turmas incompatíveis</option>
                  <option value="OUTRA_ESCOLINHA">Optou por outra escolinha / Outro clube</option>
                  <option value="OUTRO">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Observações / Justificativa (opcional)
                </label>
                <textarea
                  rows={2}
                  value={nonConvertNotes}
                  onChange={(e) => setNonConvertNotes(e.target.value)}
                  placeholder="Ex: Responsável informou que mudou de cidade..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                <span>
                  O interessado ficará visível na coluna <strong>"Arquivado / Não Convertidos"</strong> do funil principal, onde você poderá acompanhá-lo ou reativá-lo a qualquer momento.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNonConvertConfirm(false)}
                disabled={isArchiving}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleConfirmNonConvert}
                isLoading={isArchiving}
                leftIcon={<Archive size={14} />}
              >
                Confirmar Arquivamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
