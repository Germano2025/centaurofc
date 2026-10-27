import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { TrialLead, NonConversionReason } from '../../types';
import { Archive } from 'lucide-react';

interface NonConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: TrialLead | null;
}

export const NonConversionModal: React.FC<NonConversionModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const { markLeadNonConverted } = useApp();
  const [reason, setReason] = useState<NonConversionReason>('SEM_INTERESSE');
  const [notes, setNotes] = useState('');

  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markLeadNonConverted(lead.id, reason, notes.trim() || undefined, 'Coordenação');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Arquivar Interessado (Não Convertido)"
      subtitle={`Registrar motivo pelo qual ${lead.athlete_name} não prosseguiu com a matrícula.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
          <Archive size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <p>
            Nenhum dado será apagado. O interessado e todo o histórico de aulas e contatos ficarão preservados na coluna <strong>4. Arquivado / Não Convertidos</strong> e poderão ser reativados a qualquer momento.
          </p>
        </div>

        <div>
          <Select
            label="Motivo Principal da Não Conversão *"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value as NonConversionReason)}
            options={[
              { value: 'DESISTENCIA', label: 'Desistência do Responsável / Sem motivo específico' },
              { value: 'SEM_INTERESSE', label: 'Sem Interesse / Parou de responder contatos' },
              { value: 'VALOR', label: 'Valor da Mensalidade / Condição Financeira' },
              { value: 'HORARIO', label: 'Choque de Horários / Falta de turma compatível' },
              { value: 'OUTRA_ESCOLINHA', label: 'Optou por outra escolinha / Outro clube' },
              { value: 'OUTRO', label: 'Outro motivo (especificar abaixo)' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Detalhes / Observações
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Responsável informou mudança de turno escolar..."
            className="block w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" size="sm">
            Confirmar Arquivamento
          </Button>
        </div>
      </form>
    </Modal>
  );
};
