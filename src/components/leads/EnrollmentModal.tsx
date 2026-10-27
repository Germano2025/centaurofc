import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { TrialLead, FinancialCondition } from '../../types';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: TrialLead | null;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ isOpen, onClose, lead }) => {
  const { classes = [], enrollLeadAsAthlete, showToast } = useApp();
  const [classId, setClassId] = useState(() => lead?.interest_class_id || classes[0]?.id || '');
  const [financialCondition, setFinancialCondition] = useState<FinancialCondition>('PAGANTE_SEM_DESCONTO');
  const [monthlyFee, setMonthlyFee] = useState('150.00');
  const [paymentDueDay, setPaymentDueDay] = useState('10');
  const [enrollmentDate, setEnrollmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClassId = classId || (classes[0]?.id || 'c-1');
    setIsSubmitting(true);
    try {
      enrollLeadAsAthlete({
        leadId: lead.id,
        classId: targetClassId,
        enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0],
        financialCondition,
        customMonthlyFee: parseFloat(monthlyFee) || 150,
        paymentDueDay: parseInt(paymentDueDay, 10) || 10,
      });
      showToast(`Matrícula de ${lead.athlete_name} concluída com sucesso!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Error enrolling lead:', err);
      showToast('Erro ao efetivar matrícula.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Efetivar Matrícula do Aluno"
      description={`Transformar ${lead.athlete_name} em atleta oficial do CT Caxangá`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Turma Oficial de Matrícula *"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={(classes || []).map((c) => ({
            value: c.id,
            label: `${c.name} (${c.category} - ${c.schedule_time})`,
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Condição Financeira *"
            value={financialCondition}
            onChange={(e) => setFinancialCondition(e.target.value as any)}
            options={[
              { value: 'PAGANTE_SEM_DESCONTO', label: 'Pagante Integral' },
              { value: 'PAGANTE_COM_DESCONTO', label: 'Pagante com Desconto / Parcial' },
              { value: 'BOLSA_INTEGRAL', label: 'Bolsista Integral (100%)' },
            ]}
          />

          <Input
            type="number"
            step="0.01"
            label="Valor da Mensalidade (R$) *"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Dia de Vencimento *"
            value={paymentDueDay}
            onChange={(e) => setPaymentDueDay(e.target.value)}
            options={[
              { value: '5', label: 'Dia 05' },
              { value: '10', label: 'Dia 10 (Padrão)' },
              { value: '15', label: 'Dia 15' },
              { value: '20', label: 'Dia 20' },
              { value: '25', label: 'Dia 25' },
            ]}
          />

          <Input
            type="date"
            label="Data de Matrícula *"
            value={enrollmentDate}
            onChange={(e) => setEnrollmentDate(e.target.value)}
          />
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
          Ao confirmar, o interessado será movido para o status <strong>Matriculado</strong>, sua ficha completa de atleta será criada no CT Caxangá e o responsável será vinculado.
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Concluir Matrícula
          </Button>
        </div>
      </form>
    </Modal>
  );
};
