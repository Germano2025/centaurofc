import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Select } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { TrialClass, TrialFeedbackDecision } from '../../types';

interface TrialClassFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialClass: TrialClass | null;
}

export const TrialClassFeedbackModal: React.FC<TrialClassFeedbackModalProps> = ({
  isOpen,
  onClose,
  trialClass,
}) => {
  const { updateTrialClassStatus, showToast } = useApp();
  const [decision, setDecision] = useState<TrialFeedbackDecision>('CONTINUAR');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!trialClass) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      updateTrialClassStatus(trialClass.id, 'REALIZADA', {
        feedbackDecision: decision,
        feedbackNotes: feedbackNotes.trim() || undefined,
      });
      showToast('Feedback da aula experimental salvo com sucesso!', 'success');
      onClose();
    } catch (err) {
      console.error('Error saving trial feedback:', err);
      showToast('Erro ao salvar feedback.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Feedback da Aula Experimental"
      description={`Aluno: ${trialClass.athlete_name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Decisão do Aluno / Responsável *"
          value={decision}
          onChange={(e) => setDecision(e.target.value as TrialFeedbackDecision)}
          options={[
            { value: 'CONTINUAR', label: 'Quer Matricular (Continuar no Centauro)' },
            { value: 'AINDA_NAO_DECIDIU', label: 'Ainda Não Decidiu / Pensando' },
            { value: 'NAO_CONTINUAR', label: 'Desistiu / Não tem interesse no momento' },
          ]}
        />

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Anotações do Treinador / Coordenador
          </label>
          <textarea
            rows={3}
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            placeholder="Ex: Aluno se adaptou muito bem ao grupo, excelente domínio de bola. Responsável pediu dados para pagamento..."
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Salvar Feedback
          </Button>
        </div>
      </form>
    </Modal>
  );
};
